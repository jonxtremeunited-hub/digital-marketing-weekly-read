# %% [markdown]
# # Digital Marketing "Weekly Read" — Domo agent
# Runs weekly in a Domo Jupyter Workspace. Loads the Knowledge Pack from the mounted
# "Digital Marketing Weekly Agent" collection, computes the prior full week's metrics
# (deterministic SQL), asks Domo AI (in-platform, Anthropic-backed) to write each card's
# narrative *using our accumulated context*, updates the 7 cards in place, appends the
# yearly history, and logs the run. Set DRY_RUN=1 to print instead of writing.

# %%
import os, json, io, csv, datetime as dt, requests
from collections import defaultdict

INSTANCE = os.environ.get("DOMO_INSTANCE", "domo")
BASE = f"https://{INSTANCE}.domo.com/api"
DRY_RUN = os.environ.get("DRY_RUN") == "1"

# Auth: in Domo Jupyter, attach a "Domo Access Token" account to this workspace and set its
# alias below; locally we use env. The notebook needs a token that can query datasets, call AI,
# update cards, and write filesets (owned by someone with those rights).
ACCOUNT_ALIAS = "Weekly Read Domo Token"   # attached Abstract Credential Store account
def get_token():
    # Abstract Credential Store exposes a single 'credentials' property to domojupyter;
    # it may hold the raw token or a JSON blob. Locally, fall back to the env var.
    try:
        import domojupyter as domo, json as _json
        raw = domo.get_account_property_value(ACCOUNT_ALIAS, "credentials")
        if raw:
            raw = raw.strip()
            if raw[:1] in "{[":
                try:
                    obj = _json.loads(raw)
                    if isinstance(obj, dict):
                        for k in ("token", "DOMO_TOKEN", "accessToken", "domoAccessToken", "value"):
                            if obj.get(k): return obj[k]
                        strs = [v for v in obj.values() if isinstance(v, str) and v]
                        if strs: return strs[0]
                except Exception:
                    pass
            return raw
    except Exception:
        pass
    return os.environ["DOMO_TOKEN"]
TOKEN = get_token()
H = {"X-DOMO-Developer-Token": TOKEN, "Content-Type": "application/json"}

KP_FILESET = "28742d77-b391-4cb6-b395-7f310866bb52"   # Digital Marketing Weekly Agent
HIST_FILESET = "528c7aef-24c2-469d-a05a-af56e8486828"  # Data Flow Documentation
SPINE = "e4c01f04-30c7-4fc8-b67e-da2d62f5d989"
AI_MODEL = "domo.domo_ai.domogpt-medium-v2.2:anthropic"
DIGITAL = "'Paid Social','Organic Search','Paid Search','Email','Portal Site','Website','Display','Organic Social'"
NAM = f"team IN ('Corporate','Enterprise','Partner') AND ca_channel__c IN ({DIGITAL})"
CARDS = {  # card scope -> (cardId, viewId, title)
 "all":        (713129647,  550532229,  "All Channels"),
 "paidsearch": (136596033,  755514088,  "Paid Search"),
 "organic":    (865751266,  35965716,   "Web & Organic Search"),
 "content":    (1175530834, 443328634,  "Content & SEO"),
 "social":     (831164168,  1598324173, "Social Media"),
 "email":      (11669531,   783614234,  "Email"),
 "extras":     (1138405567, 280382290,  "Extras"),
}

# %%
# ---- Product API helpers ----
def q(guid, sql):
    r = requests.post(f"{BASE}/query/v1/execute/{guid}", headers=H, json={"sql": sql}, timeout=120)
    r.raise_for_status(); d = r.json()
    return [dict(zip(d["columns"], row)) for row in d.get("rows", [])]

def ai(prompt, system):
    r = requests.post(f"{BASE}/ai/v1/text/generation", headers=H,
                      json={"input": prompt, "system": system, "model": AI_MODEL}, timeout=180)
    r.raise_for_status(); return r.json()["output"]

def week_of(d):  # Sunday-start week for an ISO date string
    d = d[:10]; y,m,day = map(int,d.split("-")); date=dt.date(y,m,day)
    return (date - dt.timedelta(days=(date.weekday()+1)%7))

def load_knowledge():
    # Knowledge Pack lives in a Document Collection (FileSet), read via the Product API.
    try:
        lst = requests.post(f"{BASE}/files/v1/filesets/{KP_FILESET}/files/search", headers=H, json={}).json()
        f = next(x for x in lst.get("files", []) if x["name"] == "weekly-agent-knowledge-pack.md")
        return requests.get(f["downloadUrl"], headers={"X-DOMO-Developer-Token": TOKEN}, allow_redirects=True).text
    except Exception:
        return open("weekly-agent-knowledge-pack.md", encoding="utf-8").read()

# %%
# ---- 1. determine the prior full week (Sun-Sat) ----
today = dt.date.today()
this_sun = today - dt.timedelta(days=(today.weekday()+1)%7)
wk_start = this_sun - dt.timedelta(days=7)          # last full week start (Sun)
wk_end   = wk_start + dt.timedelta(days=6)          # Sat
nxt      = wk_start + dt.timedelta(days=7)
base_lo  = wk_start - dt.timedelta(days=7*8)        # 8-wk lookback for baselines
ws, we, nx = wk_start.isoformat(), wk_end.isoformat(), nxt.isoformat()
print("Week:", ws, "->", we)

# %%
# ---- 2. metrics (deterministic) ----
# MQL by channel x created-week (baseline window)
mql_rows = q(SPINE, f"SELECT DATE(`created date`) d, ca_channel__c ch, COUNT(DISTINCT `lead id`) n "
    f"FROM table WHERE {NAM} AND `created date` >= '{base_lo.isoformat()}' AND `created date` < '{nx}' "
    f"GROUP BY DATE(`created date`), ca_channel__c")
# SAL (NL) by conversion-date week
sal_rows = q(SPINE, f"SELECT DATE(opp_stagedate1_prepipeline) d, ca_channel__c ch, COUNT(DISTINCT `lead id`) n "
    f"FROM table WHERE {NAM} AND opp_stagedate1_prepipeline >= '{base_lo.isoformat()}' AND opp_stagedate1_prepipeline < '{nx}' "
    f"GROUP BY DATE(opp_stagedate1_prepipeline), ca_channel__c")
# SAL by MQL-date (fast conversion) for the week
salmql = q(SPINE, f"SELECT ca_channel__c ch, COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} "
    f"AND opp_stagedate1_prepipeline IS NOT NULL AND `created date` >= '{ws}' AND `created date` < '{nx}' GROUP BY ca_channel__c")

def weekly(rows):
    w = defaultdict(lambda: defaultdict(float))
    for r in rows: w[week_of(r["d"]).isoformat()][r["ch"] or "?"] += float(r["n"] or 0)
    return w
mql_w, sal_w = weekly(mql_rows), weekly(sal_rows)
mql_by_ch = mql_w.get(ws, {}); sal_by_ch = sal_w.get(ws, {})
mql_total = sum(mql_by_ch.values()); sal_total = sum(sal_by_ch.values())
# trailing baseline (prior 6 full weeks before wk_start)
prior_weeks = sorted(k for k in mql_w if k < ws)[-6:]
mql_prior = [sum(mql_w[k].values()) for k in prior_weeks]
mql_avg = round(sum(mql_prior)/len(mql_prior)) if mql_prior else 0
salmql_total = sum(float(r["n"] or 0) for r in salmql)
metrics = {"week": f"{ws} to {we}", "mql_total": int(mql_total), "sal_total": int(sal_total),
           "mql_by_channel": {k:int(v) for k,v in sorted(mql_by_ch.items(), key=lambda x:-x[1])},
           "sal_by_channel": {k:int(v) for k,v in sorted(sal_by_ch.items(), key=lambda x:-x[1])},
           "mql_trailing_avg": mql_avg, "prior_week_mql": int(mql_prior[-1]) if mql_prior else 0,
           "sal_by_mql_date": int(salmql_total)}
print(json.dumps(metrics, indent=1))
# %%
# ---- 2b. supporting metrics so the AI can ANSWER 'why' (one SUPPORT blob fed to every card) ----
GA="6d77388f-1f73-4443-ab5d-69c00c4cbdb3"; PAID="f02b08f0-5724-4623-9e7d-47041a1caf16"
SOCIAL="66614268-370d-43f5-9354-8b83abc98d4b"; EMAIL="bf812f31-1a1c-4635-96fb-67f34eb6acdc"; EVDS="1a4b498d-53ef-43f4-bd77-60bb209a7fd8"
BL=base_lo.isoformat()
def _bucket(rows,keys):
    w=defaultdict(lambda:{k:0.0 for k in keys})
    for r in rows:
        wk=week_of(r["d"]).isoformat()
        for k in keys: w[wk][k]+=float(r.get(k) or 0)
    return w
def _wa(wb,k):
    tw=wb.get(ws,{}).get(k,0.0); pr=[wb[x][k] for x in sorted(wb) if x<ws][-6:]
    return tw,(sum(pr)/len(pr) if pr else 0.0)
SUP=[]
def _try(fn):
    try: fn()
    except Exception as e: SUP.append(f"({fn.__name__} unavailable: {e})")

def _cta():
    w=defaultdict(lambda:defaultdict(float))
    for r in q(SPINE, f"SELECT DATE(`created date`) d,`mql type` t,COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} AND `created date`>='{BL}' AND `created date`<'{nx}' GROUP BY DATE(`created date`),`mql type`"):
        w[week_of(r['d']).isoformat()][r['t'] or 'None']+=float(r['n'] or 0)
    cur=sorted(w.get(ws,{}).items(),key=lambda x:-x[1])[:6]; pw=[x for x in sorted(w) if x<ws][-6:]
    def pa(t): return sum(w[x].get(t,0) for x in pw)/max(1,len(pw))
    SUP.append("CTA mix (mql type — this wk vs prior-6wk avg/wk): "+"; ".join(f"{t} {int(v)} vs {pa(t):.1f}" for t,v in cur))
def _paid():
    ps=_bucket(q(PAID, f"SELECT dayid d,SUM(cost) cost,SUM(mqls) mqls FROM table WHERE dayid>='{BL}' AND dayid<'{nx}' GROUP BY dayid"),["cost","mqls"])
    c_tw,c_pr=_wa(ps,"cost"); m_tw,m_pr=_wa(ps,"mqls")
    camp=q(PAID, f"SELECT campaign_name c,SUM(cost) cost,SUM(mqls) mqls FROM table WHERE dayid>='{ws}' AND dayid<'{nx}' GROUP BY campaign_name HAVING SUM(cost)>100 ORDER BY SUM(cost) DESC LIMIT 5")
    SUP.append(f"Paid Search: spend ${c_tw:,.0f} this wk (prior-6wk avg ${c_pr:,.0f}); cost/MQL ${(c_tw/m_tw if m_tw else 0):,.0f} (prior ${(c_pr/m_pr if m_pr else 0):,.0f}); top campaigns "+", ".join(f"{c['c']} ${float(c['cost']):,.0f}/{int(float(c['mqls'] or 0))}MQL" for c in camp))
def _org():
    og=_bucket(q(GA, f"SELECT `session date` d,COUNT(*) sess,SUM(`watch demo formfill conversion`) demo,SUM(`all startfree formfill conversions`) sf FROM table WHERE derived_channel='Organic Search' AND `session date`>='{BL}' AND `session date`<'{nx}' GROUP BY `session date`"),["sess","demo","sf"])
    s_tw,s_pr=_wa(og,"sess"); d_tw,d_pr=_wa(og,"demo")
    lp=q(GA, f"SELECT `landing page path` p,SUM(`watch demo formfill conversion`) demo FROM table WHERE derived_channel='Organic Search' AND `session date`>='{ws}' AND `session date`<'{nx}' GROUP BY `landing page path` HAVING SUM(`watch demo formfill conversion`)>0 ORDER BY SUM(`watch demo formfill conversion`) DESC LIMIT 6")
    conv=100*(d_tw+og.get(ws,{}).get('sf',0))/s_tw if s_tw else 0
    SUP.append(f"Organic web (site-wide): sessions {int(s_tw):,} this wk (prior avg {int(s_pr):,}); watch-demo formfills {int(d_tw)} (prior avg {d_pr:.0f}); conversion ~{conv:.2f}%; top demo landing pages "+", ".join(f"{c['p']}={int(float(c['demo']))}" for c in lp))
def _social():
    sc=_bucket(q(SOCIAL, f"SELECT DATE(dateRange_start) d,SUM(costInUsd) cost,SUM(impressions) impr FROM table WHERE dateRange_start>='{BL}' AND dateRange_start<'{nx}' GROUP BY DATE(dateRange_start)"),["cost","impr"])
    c_tw,c_pr=_wa(sc,"cost"); i_tw,_=_wa(sc,"impr"); psm=metrics["mql_by_channel"].get("Paid Social",0)
    SUP.append(f"Paid Social (LinkedIn): spend ${c_tw:,.0f} this wk (prior avg ${c_pr:,.0f}); impressions {int(i_tw):,}; cost/MQL ${(c_tw/psm if psm else 0):,.0f} (program-total spend vs NAM MQLs, so overstated)")
def _email():
    em=_bucket(q(EMAIL, f"SELECT DATE(senddate) d,COUNT(*) sends,SUM(opened) o,SUM(clicked) c FROM table WHERE senddate>='{BL}' AND senddate<'{nx}' GROUP BY DATE(senddate)"),["sends","o","c"])
    s_tw,s_pr=_wa(em,"sends"); o_tw,_=_wa(em,"o")
    camp=q(EMAIL, f"SELECT ca_name,COUNT(*) sends,ROUND(100*SUM(opened)/COUNT(*),1) op FROM table WHERE senddate>='{ws}' AND senddate<'{nx}' GROUP BY ca_name ORDER BY COUNT(*) DESC LIMIT 5")
    SUP.append(f"Email: sends {int(s_tw):,} this wk (prior avg {int(s_pr):,}); open {100*o_tw/s_tw if s_tw else 0:.1f}%; top campaigns "+", ".join(f"{c['ca_name']} ({int(c['sends'])} sends/{c['op']}% open)" for c in camp))
def _qual():
    ql=_bucket(q(GA, f"SELECT `session date` d,SUM(`qualified free trial page chats`) chat,SUM(`qualified conversations started`) conv,SUM(`qualified form fills (lead created)`) lead FROM table WHERE `session date`>='{BL}' AND `session date`<'{nx}' GROUP BY `session date`"),["chat","conv","lead"])
    c_tw,c_pr=_wa(ql,"chat")
    SUP.append(f"Qualified chatbot (site-wide): free-trial-page chats {int(c_tw)} this wk (prior avg {c_pr:.0f}); conversations {int(ql.get(ws,{}).get('conv',0))}; leads created {int(ql.get(ws,{}).get('lead',0))}")
def _ev():
    rows=q(EVDS, f"SELECT DATE(`created date`) d,COUNT(DISTINCT `lead id`) n,AVG(expected_value) av,SUM(expected_value_increment) inc FROM table WHERE {NAM} AND `created date`>='{ws}' AND `created date`<'{nx}' GROUP BY DATE(`created date`) ORDER BY d")
    if rows:
        best=max(rows,key=lambda r:float(r['av'] or 0)); tot=max(1,sum(int(r['n']) for r in rows))
        avg=sum(float(r['av'] or 0)*int(r['n']) for r in rows)/tot
        SUP.append(f"EV model: avg acquisition value ${avg:,.0f}/lead this wk; best day {best['d'][:10]} (avg ${float(best['av'] or 0):,.0f}, {int(best['n'])} MQLs, +${float(best['inc'] or 0):,.0f} value added since creation)")
def _funnel():
    c5=(today-dt.timedelta(days=5)).isoformat(); c30=(today-dt.timedelta(days=30)).isoformat(); c60=(today-dt.timedelta(days=60)).isoformat()
    newr=q(SPINE, f"SELECT ca_channel__c c,COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} AND `lead stage`='New' AND `created date`>='{c60}' AND `created date`<'{c5}' GROUP BY ca_channel__c ORDER BY n DESC")
    accr=q(SPINE, f"SELECT ca_channel__c c,COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} AND `lead stage`='Accepted' AND `created date`<'{c30}' AND `created date`>='2026-05-01' GROUP BY ca_channel__c ORDER BY n DESC")
    SUP.append("Funnel health — stuck 'New' 5-60d: "+(", ".join(f"{r['c']} {int(r['n'])}" for r in newr[:5]) or "none")+"; aged 'Accepted' 30d+: "+(", ".join(f"{r['c']} {int(r['n'])}" for r in accr[:5]) or "none"))
def _pace():
    di=(today-this_sun).days
    if di>=1:
        cw=q(SPINE, f"SELECT COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} AND `created date`>='{this_sun.isoformat()}' AND `created date`<'{today.isoformat()}'")[0]['n']
        aw=q(SPINE, f"SELECT COUNT(DISTINCT `lead id`) n FROM table WHERE {NAM} AND `created date`>='{ws}' AND `created date`<'{(wk_start+dt.timedelta(days=di)).isoformat()}'")[0]['n']
        SUP.append(f"Pacing: current week first {di}d = {int(cw)} MQLs vs {int(aw)} in the same first {di}d of the reported week")
for fn in (_cta,_paid,_org,_social,_email,_qual,_ev,_funnel,_pace): _try(fn)
SUPPORT="SUPPORTING METRICS:\n- "+"\n- ".join(SUP)
print(SUPPORT)

# %%
# ---- 3. narrative via Domo AI (with our Knowledge Pack as context) ----
KP = load_knowledge()
SYSTEM = ("You are the Digital Marketing Weekly Read analyst. Use ONLY the provided knowledge pack and "
          "metrics; never invent numbers. Reason the way the knowledge pack prescribes (recurse 'why'; "
          "efficiency vs volume vs demand; quality via CTA->SAL mix). Output ONLY a JSON array of blocks, "
          "each {\"type\":\"h1|em|h3|p|ul\",\"text\":\"...\"} or for ul {\"type\":\"ul\",\"items\":[\"...\"]}. "
          "When you cite a CTA->SAL conversion rate or any benchmark, use the EXACT figure from the "
          "knowledge pack for that specific CTA — never approximate or reassign a rate from one CTA to another "
          "(e.g. Custom Video Demo Request and Sales Demo Request are different rates). "
          "Use **double asterisks** for bold inside text. No prose outside the JSON.")

def narrative_blocks(scope, extra=""):
    prompt = (f"KNOWLEDGE PACK:\n{KP}\n\nWEEK METRICS (JSON):\n{json.dumps(metrics)}\n{extra}\n\n"
              f"Write the '{CARDS[scope][2]}' card for scope='{scope}'. Start with an h1 title "
              f"'{CARDS[scope][2]} — Weekly Read', an em subtitle with the week + NAM, then the sections the "
              f"knowledge pack specifies for this scope. All Channels includes the by-channel MQL/SAL list + Total. "
              f"Keep it tight and specific to the numbers.")
    out = ai(prompt, SYSTEM)
    out = out.strip()
    if out.startswith("```"): out = out.split("```")[1].lstrip("json").strip()
    return json.loads(out)

# %%
# ---- 4. Slate markup builder (blocks -> Domo text-card markup) ----
def leaf(t, marks=None): return {"object":"leaf","text":t,"marks":[{"object":"mark","type":m,"data":{}} for m in (marks or [])]}
def leaves_from(text, base=None):  # parse **bold**
    parts = text.split("**"); out=[]
    for i,p in enumerate(parts):
        if p=="" : continue
        out.append(leaf(p, (base or []) + (["strong"] if i%2==1 else [])))
    return out or [leaf(text, base)]
def para(lv, align=None): return {"object":"block","type":"p","data":({"alignment":align} if align else {}),"nodes":[{"object":"text","leaves":lv}]}
def blocks_to_markup(blocks):
    nodes=[]
    for b in blocks:
        t=b["type"]
        if t=="h1": nodes.append(para([leaf(b["text"].replace("**",""),["h1","strong"])]))
        elif t=="em": nodes.append(para([leaf(b["text"].replace("**",""),["em"])]))
        elif t=="h3": nodes.append(para([leaf(b["text"].replace("**",""),["h3","strong"])]))
        elif t=="p": nodes.append(para(leaves_from(b["text"])))
        elif t=="ul":
            nodes.append({"object":"block","type":"ul","data":{},"nodes":[
                {"object":"block","type":"li","data":{},"nodes":[para(leaves_from(it))]} for it in b["items"]]})
    return json.dumps({"object":"value","document":{"object":"document","data":{},"nodes":nodes}})

def blocks_to_html(blocks):
    # Canvas renders textHtml (NOT markup). House style = clean semantic tags matching All Channels;
    # never leave textHtml empty (Domo then auto-generates a different-looking span HTML).
    def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
    p=['<div style="white-space:pre-wrap">']
    for b in blocks:
        if b["type"]=="ul":
            p.append("<ul>")
            for it in b["items"]: p.append(f"<li>{esc(it.replace('**',''))}</li>")
            p.append("</ul>")
        else:
            txt=esc(b["text"].replace("**",""))
            tag={"h1":"h1","h3":"h3","em":"div","p":"div"}.get(b["type"],"div")
            sty="font-style:italic" if b["type"]=="em" else ""
            p.append(f'<{tag} style="{sty}">{txt}</{tag}>')
    p.append("</div>"); return "".join(p)

def update_card(cid, title, blocks):
    body={"type":"Text","title":title,"metadata":{"markup":blocks_to_markup(blocks),
          "textHtml":blocks_to_html(blocks),
          "kpiType":"Text","dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
    r=requests.put(f"{BASE}/content/v1/cards/{cid}", headers=H, json=body, timeout=60); r.raise_for_status()

# %%
# ---- 5. generate + update all 7 cards ----
results={}
for scope,(cid,view,title) in CARDS.items():
    blocks = narrative_blocks(scope, SUPPORT)
    results[scope]=blocks
    if DRY_RUN:
        print("\n==== ",title," ====")
        for b in blocks: print(f"[{b['type']}]", b.get("text") or b.get("items"))
    else:
        update_card(cid, f"Weekly Read — {title} (auto)", blocks)
        print("updated", title)

# %%
# ---- 6. append history + 7. run-log ----  (skipped in DRY_RUN)
if not DRY_RUN:
    year = wk_start.year; hname=f"weekly-digital-marketing-summary_{year}.md"
    # find + read current file
    lst = requests.post(f"{BASE}/files/v1/filesets/{HIST_FILESET}/files/search", headers=H, json={}).json()
    cur = next((f for f in lst.get("files",[]) if f["name"]==hname), None)
    header=f"# Digital Marketing — Weekly Read: Running History ({year})\n"
    body = requests.get(cur["downloadUrl"], headers=H, allow_redirects=True).text if cur else header+"\n"
    # build this week's All-Channels markdown section from `results['all']`
    md=[f"\n## Week of {wk_start.strftime('%b %-d, %Y')} · {ws} – {we}\n"]
    for b in results["all"]:
        if b["type"] in ("h1","em"): continue
        if b["type"]=="h3": md.append(f"### {b['text'].replace('**','')}")
        elif b["type"]=="p": md.append(b["text"])
        elif b["type"]=="ul": md += [f"- {it}" for it in b["items"]]
    section="\n".join(md)+"\n"
    # idempotent: drop any existing section for THIS week, then prepend newest-on-top after the header
    import re
    label=wk_start.strftime('%b %-d, %Y')
    body=re.sub(r"\n## Week of "+re.escape(label)+r".*?(?=\n## |\Z)", "", body, flags=re.S)
    idx=body.find("\n## ")
    new=(body[:idx] if idx>=0 else body.rstrip())+"\n"+section+("\n"+body[idx:].lstrip() if idx>=0 else "")
    open("/tmp/hist.md","w",encoding="utf-8").write(new)
    if cur: requests.delete(f"{BASE}/files/v1/filesets/{HIST_FILESET}/files/{cur['id']}", headers=H)
    requests.post(f"{BASE}/files/v1/filesets/{HIST_FILESET}/files",
                  headers={"X-DOMO-Developer-Token":TOKEN},
                  files={"file":(hname,open("/tmp/hist.md","rb"),"text/markdown")}, data={"path":hname})
    print("history updated:", hname)
print("DONE", "(dry run)" if DRY_RUN else "")
