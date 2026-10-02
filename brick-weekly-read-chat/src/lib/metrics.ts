// Pulls the live weekly metrics bundle (same verified recipes as the Monday
// notebook) via the in-session apiProxy, so the chat answers from real numbers.
import { apiProxy } from './api-proxy';
import { toValue } from './ce';

const SPINE = 'e4c01f04-30c7-4fc8-b67e-da2d62f5d989';
const PAID = 'f02b08f0-5724-4623-9e7d-47041a1caf16';
const GA = '6d77388f-1f73-4443-ab5d-69c00c4cbdb3';
const SOCIAL = '66614268-370d-43f5-9354-8b83abc98d4b';
const EMAIL = 'bf812f31-1a1c-4635-96fb-67f34eb6acdc';
const EV = '1a4b498d-53ef-43f4-bd77-60bb209a7fd8';

const DIGITAL = "'Paid Social','Organic Search','Paid Search','Email','Portal Site','Website','Display','Organic Social'";
const NAM = `team IN ('Corporate','Enterprise','Partner') AND ca_channel__c IN (${DIGITAL})`;

type Row = Record<string, unknown>;

async function q(guid: string, sql: string): Promise<Row[]> {
  const raw = await apiProxy<unknown>({
    method: 'POST',
    path: `/api/query/v1/execute/${guid}`,
    body: { sql },
    contentType: 'application/json',
  });
  const v = toValue(raw) as { columns?: string[]; rows?: unknown[][] };
  const cols = v?.columns;
  const rows = v?.rows;
  if (!cols || !rows) return [];
  return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

const num = (x: unknown): number => {
  const n = typeof x === 'number' ? x : parseFloat(typeof x === 'string' ? x : '');
  return Number.isFinite(n) ? n : 0;
};
const str = (x: unknown): string => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : '');
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const money = (n: number): string => `$${Math.round(n).toLocaleString()}`;

// Sunday-start week key for a 'YYYY-MM-DD...' date string.
function weekKey(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z');
  const off = d.getUTCDay(); // Sun=0
  d.setUTCDate(d.getUTCDate() - off);
  return iso(d);
}

export interface WeekWindow {
  wsISO: string; // reported week start (Sun)
  weISO: string; // reported week end (Sat)
  nxISO: string; // start of current (partial) week
  loISO: string; // baseline lookback start
  label: string;
}

export function lastFullWeek(today = new Date()): WeekWindow {
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const thisSun = new Date(t);
  thisSun.setUTCDate(t.getUTCDate() - t.getUTCDay());
  const ws = new Date(thisSun);
  ws.setUTCDate(thisSun.getUTCDate() - 7);
  const we = new Date(ws);
  we.setUTCDate(ws.getUTCDate() + 6);
  const lo = new Date(ws);
  lo.setUTCDate(ws.getUTCDate() - 7 * 8);
  return {
    wsISO: iso(ws),
    weISO: iso(we),
    nxISO: iso(thisSun),
    loISO: iso(lo),
    label: `${iso(ws)} to ${iso(we)}`,
  };
}

function bucketWeekly(rows: Row[], dateField: string, valueField: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const dv = r[dateField];
    if (!dv) continue;
    const k = weekKey(str(dv));
    m.set(k, (m.get(k) ?? 0) + num(r[valueField]));
  }
  return m;
}

function priorAvg(m: Map<string, number>, wsISO: string, n = 6): number {
  const priors = [...m.entries()].filter(([k]) => k < wsISO).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, n);
  return priors.length ? priors.reduce((s, [, v]) => s + v, 0) / priors.length : 0;
}

/** Build the live metrics bundle as a text block for the model. Cached by caller. */
export async function buildMetricsBundle(w: WeekWindow): Promise<string> {
  const { wsISO, weISO, nxISO, loISO } = w;
  const lines: string[] = [`WEEK OF ${wsISO} to ${weISO} (NAM, digital channels only; MQL by created week; SAL = New-Logo).`];
  const push = async (label: string, fn: () => Promise<string>) => {
    try {
      lines.push(await fn());
    } catch (e) {
      lines.push(`${label}: unavailable (${e instanceof Error ? e.message : 'error'})`);
    }
  };

  // MQL by channel + totals + trailing baseline
  await push('MQLs', async () => {
    const rows = await q(
      SPINE,
      `SELECT DATE(\`created date\`) d, ca_channel__c ch, COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`created date\` >= '${loISO}' AND \`created date\` < '${nxISO}' GROUP BY DATE(\`created date\`), ca_channel__c`,
    );
    const total = bucketWeekly(rows, 'd', 'n');
    const byCh = new Map<string, number>();
    for (const r of rows) if (weekKey(str(r.d)) === wsISO) byCh.set(str(r.ch), (byCh.get(str(r.ch)) ?? 0) + num(r.n));
    const wk = total.get(wsISO) ?? 0;
    const prior = total.get([...total.keys()].filter((k) => k < wsISO).sort().pop() ?? '') ?? 0;
    const chTxt = [...byCh.entries()].sort(([, a], [, b]) => b - a).map(([c, v]) => `${c} ${v}`).join(', ');
    return `MQLs this week: ${wk} (prior week ${prior}; trailing-6wk avg ${Math.round(priorAvg(total, wsISO))}). By channel: ${chTxt}.`;
  });

  // SAL by conversion date + by MQL date
  await push('SALs', async () => {
    const conv = await q(
      SPINE,
      `SELECT DATE(opp_stagedate1_prepipeline) d, ca_channel__c ch, COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND opp_stagedate1_prepipeline >= '${wsISO}' AND opp_stagedate1_prepipeline < '${nxISO}' GROUP BY DATE(opp_stagedate1_prepipeline), ca_channel__c`,
    );
    const convWk = conv.filter((r) => weekKey(str(r.d)) === wsISO);
    const salTotal = convWk.reduce((s, r) => s + num(r.n), 0);
    const salCh = convWk.map((r) => `${str(r.ch)} ${num(r.n)}`).join(', ');
    const mqlDate = await q(
      SPINE,
      `SELECT COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND opp_stagedate1_prepipeline IS NOT NULL AND \`created date\` >= '${wsISO}' AND \`created date\` < '${nxISO}'`,
    );
    return `New-Logo SALs this week (by conversion date): ${salTotal} (${salCh}). Of this week's MQLs, ${num(mqlDate[0]?.n)} already reached SAL (fast in-week conversion).`;
  });

  // CTA mix (mql type)
  await push('CTA mix', async () => {
    const rows = await q(
      SPINE,
      `SELECT DATE(\`created date\`) d, \`mql type\` t, COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`created date\` >= '${loISO}' AND \`created date\` < '${nxISO}' GROUP BY DATE(\`created date\`), \`mql type\``,
    );
    const cur = new Map<string, number>();
    const priorByType = new Map<string, number[]>();
    const priorWeeks = new Set<string>();
    for (const r of rows) {
      const wk = weekKey(str(r.d));
      const t = str(r.t ?? 'None');
      if (wk === wsISO) cur.set(t, (cur.get(t) ?? 0) + num(r.n));
      else if (wk < wsISO) {
        priorWeeks.add(wk);
        const arr = priorByType.get(t) ?? [];
        arr.push(num(r.n));
        priorByType.set(t, arr);
      }
    }
    const npw = Math.max(1, [...priorWeeks].sort().slice(-6).length);
    const top = [...cur.entries()].sort(([, a], [, b]) => b - a).slice(0, 6);
    const txt = top.map(([t, v]) => `${t} ${v} (prior avg ${((priorByType.get(t)?.reduce((s, x) => s + x, 0) ?? 0) / npw).toFixed(1)}/wk)`).join('; ');
    return `CTA mix (mql type, this week vs prior-6wk avg): ${txt}. Reference MQL→SAL rates: Talk to Sales ~37%, Sales Demo Request ~15%, Contact Us ~9%, Custom Video Demo Request ~8%, Gated Free Trial ~7%.`;
  });

  // Paid search spend + cost/MQL + campaigns
  await push('Paid Search', async () => {
    const daily = await q(PAID, `SELECT dayid d, SUM(cost) cost, SUM(mqls) mqls FROM table WHERE dayid >= '${loISO}' AND dayid < '${nxISO}' GROUP BY dayid`);
    const cost = bucketWeekly(daily, 'd', 'cost');
    const mql = bucketWeekly(daily, 'd', 'mqls');
    const cWk = cost.get(wsISO) ?? 0;
    const mWk = mql.get(wsISO) ?? 0;
    const camp = await q(PAID, `SELECT campaign_name c, SUM(cost) cost, SUM(mqls) mqls FROM table WHERE dayid >= '${wsISO}' AND dayid < '${nxISO}' GROUP BY campaign_name HAVING SUM(cost) > 100 ORDER BY SUM(cost) DESC LIMIT 5`);
    const campTxt = camp.map((r) => `${str(r.c)} ${money(num(r.cost))}/${num(r.mqls)}MQL`).join(', ');
    return `Paid Search: spend ${money(cWk)} this week (prior-6wk avg ${money(priorAvg(cost, wsISO))}); cost/MQL ${mWk ? money(cWk / mWk) : 'n/a'} (prior ${money(priorAvg(cost, wsISO) / Math.max(1, priorAvg(mql, wsISO)))}). Top campaigns: ${campTxt}.`;
  });

  // Organic sessions + CTA + landing pages
  await push('Organic', async () => {
    const daily = await q(GA, `SELECT \`session date\` d, COUNT(*) sess, SUM(\`watch demo formfill conversion\`) demo FROM table WHERE derived_channel='Organic Search' AND \`session date\` >= '${loISO}' AND \`session date\` < '${nxISO}' GROUP BY \`session date\``);
    const sess = bucketWeekly(daily, 'd', 'sess');
    const demo = bucketWeekly(daily, 'd', 'demo');
    const lp = await q(GA, `SELECT \`landing page path\` p, SUM(\`watch demo formfill conversion\`) demo FROM table WHERE derived_channel='Organic Search' AND \`session date\` >= '${wsISO}' AND \`session date\` < '${nxISO}' GROUP BY \`landing page path\` HAVING SUM(\`watch demo formfill conversion\`) > 0 ORDER BY SUM(\`watch demo formfill conversion\`) DESC LIMIT 6`);
    const lpTxt = lp.map((r) => `${str(r.p)}=${num(r.demo)}`).join(', ');
    return `Organic web (site-wide): sessions ${Math.round(sess.get(wsISO) ?? 0).toLocaleString()} this week (prior avg ${Math.round(priorAvg(sess, wsISO)).toLocaleString()}); watch-demo form-fills ${num(demo.get(wsISO) ?? 0)} (prior avg ${priorAvg(demo, wsISO).toFixed(0)}). Top demo landing pages: ${lpTxt}.`;
  });

  // Paid social spend
  await push('Paid Social', async () => {
    const daily = await q(SOCIAL, `SELECT DATE(dateRange_start) d, SUM(costInUsd) cost, SUM(impressions) impr FROM table WHERE dateRange_start >= '${loISO}' AND dateRange_start < '${nxISO}' GROUP BY DATE(dateRange_start)`);
    const cost = bucketWeekly(daily, 'd', 'cost');
    const impr = bucketWeekly(daily, 'd', 'impr');
    return `Paid Social (LinkedIn): spend ${money(cost.get(wsISO) ?? 0)} this week (prior avg ${money(priorAvg(cost, wsISO))}); impressions ${Math.round(impr.get(wsISO) ?? 0).toLocaleString()}.`;
  });

  // Email
  await push('Email', async () => {
    const daily = await q(EMAIL, `SELECT DATE(senddate) d, COUNT(*) sends, SUM(opened) o FROM table WHERE senddate >= '${loISO}' AND senddate < '${nxISO}' GROUP BY DATE(senddate)`);
    const sends = bucketWeekly(daily, 'd', 'sends');
    const opens = bucketWeekly(daily, 'd', 'o');
    const s = sends.get(wsISO) ?? 0;
    const o = opens.get(wsISO) ?? 0;
    return `Email: sends ${Math.round(s).toLocaleString()} this week (prior avg ${Math.round(priorAvg(sends, wsISO)).toLocaleString()}); open rate ${s ? ((100 * o) / s).toFixed(1) : '0'}%.`;
  });

  // Qualified chatbot
  await push('Qualified chatbot', async () => {
    const daily = await q(GA, `SELECT \`session date\` d, SUM(\`qualified free trial page chats\`) chat, SUM(\`qualified form fills (lead created)\`) lead FROM table WHERE \`session date\` >= '${loISO}' AND \`session date\` < '${nxISO}' GROUP BY \`session date\``);
    const chat = bucketWeekly(daily, 'd', 'chat');
    const lead = bucketWeekly(daily, 'd', 'lead');
    return `Qualified chatbot (site-wide): free-trial-page chats ${num(chat.get(wsISO) ?? 0)} this week (prior avg ${priorAvg(chat, wsISO).toFixed(0)}); leads created ${num(lead.get(wsISO) ?? 0)}.`;
  });

  // EV / acquisition value
  await push('EV model', async () => {
    const rows = await q(EV, `SELECT DATE(\`created date\`) d, COUNT(DISTINCT \`lead id\`) n, AVG(expected_value) av, SUM(expected_value_increment) inc FROM table WHERE ${NAM} AND \`created date\` >= '${wsISO}' AND \`created date\` < '${nxISO}' GROUP BY DATE(\`created date\`) ORDER BY d`);
    let best: Row | undefined;
    let totN = 0;
    let wAvg = 0;
    for (const r of rows) {
      totN += num(r.n);
      wAvg += num(r.av) * num(r.n);
      if (!best || num(r.av) > num(best.av)) best = r;
    }
    if (!best) return 'EV model: no rows this week.';
    return `EV model: avg acquisition value ${money(wAvg / Math.max(1, totN))}/lead this week; best day ${str(best.d).slice(0, 10)} (avg ${money(num(best.av))}, ${num(best.n)} MQLs, +${money(num(best.inc))} value added since creation).`;
  });

  // Funnel health
  await push('Funnel health', async () => {
    const d5 = new Date(Date.now() - 5 * 86400000);
    const d30 = new Date(Date.now() - 30 * 86400000);
    const d60 = new Date(Date.now() - 60 * 86400000);
    const stuck = await q(SPINE, `SELECT ca_channel__c c, COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`lead stage\`='New' AND \`created date\` >= '${iso(d60)}' AND \`created date\` < '${iso(d5)}' GROUP BY ca_channel__c ORDER BY n DESC`);
    const aged = await q(SPINE, `SELECT ca_channel__c c, COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`lead stage\`='Accepted' AND \`created date\` < '${iso(d30)}' AND \`created date\` >= '2026-05-01' GROUP BY ca_channel__c ORDER BY n DESC`);
    const s = stuck.slice(0, 5).map((r) => `${str(r.c)} ${num(r.n)}`).join(', ') || 'none';
    const a = aged.slice(0, 5).map((r) => `${str(r.c)} ${num(r.n)}`).join(', ') || 'none';
    return `Funnel health — stuck in 'New' 5–60d: ${s}; aged in 'Accepted' 30d+: ${a}.`;
  });

  // Pacing
  await push('Pacing', async () => {
    const now = new Date();
    const thisSun = new Date(w.nxISO + 'T00:00:00Z');
    const di = Math.floor((now.getTime() - thisSun.getTime()) / 86400000);
    if (di < 1) return 'Pacing: current week just started.';
    const curEnd = iso(now);
    const awEnd = new Date(w.wsISO + 'T00:00:00Z');
    awEnd.setUTCDate(awEnd.getUTCDate() + di);
    const cw = await q(SPINE, `SELECT COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`created date\` >= '${w.nxISO}' AND \`created date\` < '${curEnd}'`);
    const aw = await q(SPINE, `SELECT COUNT(DISTINCT \`lead id\`) n FROM table WHERE ${NAM} AND \`created date\` >= '${w.wsISO}' AND \`created date\` < '${iso(awEnd)}'`);
    return `Pacing: current week first ${di}d = ${num(cw[0]?.n)} MQLs vs ${num(aw[0]?.n)} in the same first ${di}d of the reported week.`;
  });

  return lines.join('\n');
}
