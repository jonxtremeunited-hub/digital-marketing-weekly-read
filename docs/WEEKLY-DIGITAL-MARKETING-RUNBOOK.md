# Weekly Digital Marketing "Weekly Read" — Agent Runbook

**Runs:** Monday morning, for the prior full week (Sunday–Saturday).
**Output:** updates the 7 "Weekly Read" text cards in the Digital Marketing Central app (App Studio `1382581853`) **in place**, and prepends the week to the yearly history markdown in the Data Flow Documentation collection.
**Scope:** NAM (`team ∈ Corporate, Enterprise, Partner`), digital channels only, `lead type = Marketing`.

Creds: `set -a; source ~/work/.env; set +a` (DOMO_INSTANCE, DOMO_TOKEN). Query API: `POST /api/query/v1/execute/{fullGUID}` body `{"sql":"… FROM table …"}` (quote date literals!).

## Datasets & recipe (must reconcile to the app cards)
- Lead-level spine: `e4c01f04-30c7-4fc8-b67e-da2d62f5d989`.
- Digital channels = `ca_channel__c IN ('Paid Social','Organic Search','Paid Search','Email','Portal Site','Website','Display','Organic Social')` — exclude Event/Contact Acquisition Program/Content Syndication/blank.
- **MQL** = `COUNT(DISTINCT \`lead id\`)` by created week. **SAL (NL)** = lead with `opp_stagedate1_prepipeline` set: by conversion date (that col's week) and by MQL date (created week, filter `opp_stagedate1_prepipeline IS NOT NULL`). Weeks are Sun–Sat; bucket in python.
- Supporting: Paid Search `f02b08f0-…` (cost/keyword/campaign); GA sessions `6d77388f-…` (organic sessions, CTA formfills, landing pages, Qualified chatbot cols); Paid Social `66614268-…` (LinkedIn costInUsd); Email `bf812f31-1a1c-4635-96fb-67f34eb6acdc` (sends/opens/clicks by ca_name); EV model / acquisition value in `e4c01f04` + lead-scoring `1a4b498d-…`.

## Steps
1. **Determine the week:** last full Sun–Sat before today.
2. **Pull the numbers** (recipe above): MQL & SAL by channel, trailing baselines, cost/MQL (paid search + paid social), organic sessions/conversion/CTA/landing pages, email sends/engagement, Qualified chatbot, EV/acquisition-value + best day, funnel health (stuck 'New' 5+d, aged 'Accepted' 30+d), current-week pacing.
3. **Reconcile before publishing:** export the live cards and confirm your totals match — `POST /api/content/v1/cards/{id}/export` form `request={"fileName":"c.csv","type":"file"}&watermark=false` (export is all-teams/all-channels; apply NAM + digital filter yourself). Weekly MQLs card 1249266723, SAL-conv 888036608, SAL-by-MQL-date 379470406.
4. **Write the analysis** — What happened / Why (recurse) / Implications, plus the by-channel MQL/SAL list + total, quality (SAL-by-MQL-date + CTA→SAL mix + EV model), funnel health, pacing, #1 follow-up. All Channels = overview + table; each channel page = its slice (Web & Organic = fullest).
5. **Update the 7 cards IN PLACE** (never delete+recreate): `PUT /api/content/v1/cards/{id}` with `{type:"Text", title, metadata:{markup, textHtml:"", kpiType:"Text", dataFileIds:"[]", notebookVersion:"v3", dynamicTextItems:"{}"}}`. Card IDs — All Channels 713129647, Paid Search 136596033, Web & Organic 865751266, Content & SEO 1175530834, Social Media 831164168, Email 11669531, Extras 1138405567. (Reuse the Slate markup builder in `~/work/build_channels.py`.)
6. **Append history:** yearly file `weekly-digital-marketing-summary_{YYYY}.md` in fileset `528c7aef-24c2-469d-a05a-af56e8486828`. Read current (MCP `domo_document_collection_read_file` or downloadUrl) → prepend the new All-Channels section after the header → `DELETE /api/files/v1/filesets/{FS}/files/{oldFileId}` → re-upload `POST /api/files/v1/filesets/{FS}/files` multipart `-F "file=@C:/…;type=text/markdown" -F "path=<name>"`. Start a new file each January.
7. **Verify:** re-read one card + the history file; report what changed.

Full context & gotchas: memory `project_weekly_digital_marketing_summary`, `reference_domo_query_api_and_marketing_full_guids`, `reference_domo_appstudio_layout_gotchas`.
