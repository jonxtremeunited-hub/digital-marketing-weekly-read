# Digital Marketing "Weekly Read" — Agent Knowledge Pack

*This document is the operating brain of the in-Domo Weekly Read agent. It is fed to Domo AI Services as context on every run so the agent reasons with our full accumulated intelligence, not from scratch. Keep it current: when we learn something new, update this pack.*

## Mission
Every Monday, produce the "Weekly Read" for the **Digital Marketing Central** app (App Studio `1382581853`): what happened in digital marketing the prior full week, **why** (recurse the question as deep as the data supports), and the **implications**. Update the 7 in-app text cards and append the running history. Numbers must reconcile to the app's cards before publishing.

## Scope & definitions (non-negotiable)
- **Region = NAM only:** `team IN ('Corporate','Enterprise','Partner')`. (EMEA=Europe/Middle East/Africa, APAC=Asia Pacific incl. Australia, JP=Japan — all excluded.)
- **Digital channels only**, via `ca_channel__c IN ('Paid Social','Organic Search','Paid Search','Email','Portal Site','Website','Display','Organic Social')`. **Exclude Event, Contact Acquisition Program, Content Syndication, blank.** (Including Event was an early mistake that inflated totals — do not.)
- **Marketing leads:** `lead type = 'Marketing'` (redundant inside the digital-channel set, but correct).
- **MQL** = `COUNT(DISTINCT `lead id`)` bucketed by **created week**.
- **SAL = New-Logo**, defined as a lead with **`opp_stagedate1_prepipeline`** set. NOT the lead-stage 'Accepted' gate (that is an earlier routing step ~90% and is the wrong milestone). Two lenses: (a) **by conversion date** = week of `opp_stagedate1_prepipeline` (the headline SAL); (b) **by MQL date** = created week, filtered to `opp_stagedate1_prepipeline IS NOT NULL` (of that week's MQLs, how many have already SAL'd — a fast-conversion quality signal).
- **Weeks are Sunday–Saturday.** "Last full week" = most recent completed Sun–Sat.

## Datasets & recipes (Product API: `POST /api/query/v1/execute/{fullGUID}`, body `{"sql":"… FROM table …"}`; QUOTE date literals or they are parsed as arithmetic)
- **Lead spine:** `e4c01f04-30c7-4fc8-b67e-da2d62f5d989` (SILVER | Leads Master → Oppty Master [+NAM Forecast]) — one row per `lead id`, fresh daily; carries `team`, `ca_channel__c`, `created date`, `mql type`, `opp_stagedate1_prepipeline`, forecast cols (`fSAL`, `Forecast SALs per MQL`), acquisition-value cols.
- **Paid search:** `f02b08f0-5724-4623-9e7d-47041a1caf16` — `dayid`, `cost`, `campaign_name`, `utm_keyword_name`, `mqls`.
- **Web sessions (GA-BQ):** `6d77388f-1f73-4443-ab5d-69c00c4cbdb3` — `session date`, `derived_channel`, `branded traffic`, `landing page path`, CTA formfills (`watch demo formfill conversion`, `talk to sales formfill conversion`, `all startfree formfill conversions`), Qualified chatbot cols (`qualified free trial page chats`, `qualified conversations started`, `qualified form fills (lead created)`), Intellimize experiment cols. Site-wide (no NAM split — geo caveat).
- **Paid Social (LinkedIn):** `66614268-370d-43f5-9354-8b83abc98d4b` — `costInUsd`, `dateRange_start`, `impressions` (no lead cols; join MQLs from the spine, Channel='Paid Social').
- **Email (send-level):** `bf812f31-1a1c-4635-96fb-67f34eb6acdc` — one row/send; `senddate`, `ca_name` (purpose nomenclature), 1/0 flags `opened`/`clicked`/`unsubscribed`.
- **Lead scoring / EV model:** `1a4b498d-53ef-43f4-bd77-60bb209a7fd8`; acquisition value + `fSAL` on the spine.

## The 7 cards (UPDATE IN PLACE — never delete/recreate; that breaks the layout)
`PUT /api/content/v1/cards/{id}` body `{type:"Text", title, metadata:{markup, textHtml, kpiType:"Text", dataFileIds:"[]", notebookVersion:"v3", dynamicTextItems:"{}"}}`. Markup = Slate JSON; supports p / ul-ol-li + marks strong/em/h1/h2/h3 only — **no tables** (render the by-channel table as a bold-labeled bullet list + Total).

**FORMATTING STANDARD — all 7 cards must look identical.** The App Studio canvas renders **`textHtml`**, not the Slate markup, so you MUST provide a clean `textHtml` in this exact shape (never pass `textHtml:""` — Domo then auto-generates span-based HTML that renders in a different font, which is wrong): wrapper `<div style="white-space:pre-wrap">`; headings as semantic **`<h1 style="">`** and **`<h3 style="">`**; the italic subtitle as `<div style="font-style:italic">`; paragraphs as `<div style="">`; bullet lists as `<ul><li>…</li></ul>`. Build this textHtml from the same blocks as the markup so the two stay in sync. This matches the All Channels card and is the house style for every channel card.
- **Section headers MUST be `<h3>`** (single short bold line per section — What happened / Why / etc.), NOT bold `<div>` — the `<h3>` is what gives the font-size hierarchy. Note Domo may strip an `h3` *leaf mark* from the Slate markup on save, but the `<h3>` in `textHtml` renders and persists — so drive the look from textHtml.
- **Blue background = content-entry `style.sourceId:"no3"`** on each card's LAYOUT entry (a deliberate deviation so the Weekly Read stands out from the data cards). This is a layout property set once per card; weekly CONTENT updates (PUT /cards/{id}) do NOT touch it, so it persists — no need to reset it each week. If a card is ever rebuilt/re-placed, re-apply `no3`.
- **Encoding: always PUT card content as JSON with `ensure_ascii` (json.dumps default) or requests `json=`** so non-ASCII (— · –) is escaped safely. NEVER round-trip card text through a `curl > file; cat file | python` pipe on Windows — the cp1252 stdin decode double-encodes em-dashes into `â€"` mojibake (this happened once and had to be repaired).
- All Channels **713129647** (view 550532229) — overview + by-channel MQL/SAL list + Total + quality + EV model + pacing + #1 follow-up.
- Paid Search **136596033** (755514088) · Web & Organic Search **865751266** (35965716, **fullest writeup**) · Content & SEO **1175530834** (443328634) · Social Media/Paid Social **831164168** (1598324173) · Email **11669531** (783614234) · Extras **1138405567** (280382290).

## Reconcile before publishing
Export the live cards and confirm your totals match: `POST /api/content/v1/cards/{id}/export` form `request={"fileName":"c.csv","type":"file"}&watermark=false` (export is ALL teams/channels — apply the NAM + digital filter yourself). Weekly MQLs card 1249266723; SAL-by-conversion-date 888036608; SAL-by-MQL-date 379470406. Expect ±1 drift from intraday refresh.

## Analytical playbook (how to think, learned with Jonathan)
- **Recurse "why":** channel → (spend? traffic?) → (efficiency/conversion?) → (which CTA/keyword/landing page?) → (what changed?). Stop only when the data runs out; name the open question for the owning team.
- **Efficiency vs volume vs demand:** cost/MQL falling on FLAT spend = a durable efficiency win (not "we bought leads"). Organic leads up on FLAT traffic = a conversion/CTA/landing story (not new demand). Say which it is.
- **Every digital channel gets a mention** (audience = the channel managers), even the small ones (Paid Social, Email, Portal Site) — note who contributed.
- **Quality lens:** MQL→SAL by CTA (mature ≈ current fSAL): **Talk to Sales ~37%, Sales Demo Request ~15%, Contact Us ~9%, Custom Video Demo Request ~8%, Gated Free Trial ~7%.** So a mix shift toward the demo CTA and away from Talk-to-Sales is volume, not quality (blended expected conversion stays ~10%). Also report SAL-by-MQL-date (fast in-week conversion = good).
- **EV / lead scoring:** watch average acquisition value trend (healthy = trending up and holding >$2K); call out the best day and whether high-score days produced high-value/converting leads.
- **Funnel health:** flag leads stuck in 'New' 5+ days (a working gap / system failure) and aged in 'Accepted' 30+ days, by channel — especially the small channels; Events carry a chronic backlog (out of digital scope but a data-hygiene note on Extras).
- **Pacing:** compare the current partial week's first-N-days to the same window of the prior week; note if trending same direction. Watch for lumpy one-offs (e.g., an Event registration batch) inflating a headline.
- **Known relationship:** 'Custom Video Demo Request' = the homepage/watch-demo CTA; a simultaneous jump across organic AND paid points to a site-wide demo-experience change, not a channel-specific move. The Qualified chatbot lives on /free-trial (a different surface from the homepage).

## History archive
Yearly markdown `weekly-digital-marketing-summary_{YYYY}.md` in the **Data Flow Documentation** collection (`528c7aef-24c2-469d-a05a-af56e8486828`), newest week on top, titled "Digital Marketing — Weekly Read: Running History (YYYY)". Append = read current → prepend new All-Channels section after the header → delete old file id → re-upload. New file each January.

## Gotchas
- Quote SQL date literals. Windows python needs `C:/` paths, not `/c/`. curl `-F "file=@"` needs `C:/`.
- Text-card layout writes are fragile (write-lock, nested TABS children, orphan slots) — that's why we UPDATE cards in place and never re-run the layout build.
- Domo AI text generation: `POST /api/ai/v1/text/generation` body `{"input": "<knowledge + data + task>", "system": "<role>"}`; default model `domo.domo_ai.domogpt-medium-v2.2:anthropic` (Anthropic-backed, in-platform). Also proxies `domo.openai.gpt-4o-mini`.
