# Put the Weekly Read in the Domo AI Library (owned by you)

The Library's create API is 500-gated in Beta, so this is a quick UI task. Creating while logged in as yourself sets you as owner automatically.

## 1. Create the Toolkit
AI Library → **Toolkits** → **Create/Add Toolkit**
- **Name:** `Digital Marketing Weekly Read`
- **Description:** Marketing funnel intelligence for the Digital Marketing Central app: the Weekly Read Knowledge Pack (NAM/digital definitions, verified dataset recipes, CTA→SAL rates, analytical playbook) plus the core datasets and a natural-language SQL tool.
- **Context → add resources:**
  - **Document Collection (FileSet):** *Digital Marketing Weekly Agent* — `28742d77-b391-4cb6-b395-7f310866bb52` (the Knowledge Pack)
  - **Datasets:**
    - Leads Master → Oppty Master [+NAM Forecast] — `e4c01f04-30c7-4fc8-b67e-da2d62f5d989` (MQL/SAL spine)
    - NAM Paid Media by Keyword — `f02b08f0-5724-4623-9e7d-47041a1caf16`
    - GA-BQ Session Data — `6d77388f-1f73-4443-ab5d-69c00c4cbdb3`
    - Paid Social LinkedIn Daily Metrics — `66614268-370d-43f5-9354-8b83abc98d4b`
    - Email send-level (Eloqua) — `bf812f31-1a1c-4635-96fb-67f34eb6acdc`
    - Lead Scoring / Expected Value — `1a4b498d-53ef-43f4-bd77-60bb209a7fd8`
- **Tools → add:** `SQL Query` (the built-in DomoSqlQueryTool). Description: "Query the NAM digital-marketing datasets using natural language."
- Save. It should show **you** as owner.

## 2. Create the Agent
AI Library → **Agents** → **Create**
- **Name:** `Digital Marketing Weekly Read Analyst`
- **Toolkit:** attach *Digital Marketing Weekly Read* (above)
- **Instructions (paste):**

> You are the Digital Marketing Weekly Read analyst for Domo, covering **NAM digital marketing**. Use the attached **Knowledge Pack** (in the toolkit context) for definitions, verified dataset recipes, the CTA→SAL conversion rates, and the analytical playbook; use the **SQL Query** tool to pull numbers from the attached datasets.
>
> Scope and definitions are non-negotiable: **NAM** = `team IN ('Corporate','Enterprise','Partner')`; **digital channels only** via `ca_channel__c` (exclude Event/Contact Acquisition Program/Content Syndication/blank); **MQL** = distinct marketing lead by created week; **SAL = New-Logo** (lead with `opp_stagedate1_prepipeline` set); weeks are Sunday–Saturday.
>
> When answering what/why/implications questions: recurse the "why" (channel → spend/traffic → CTA/keyword/landing → what changed); distinguish **efficiency vs volume vs demand** (cost/MQL down on flat spend = durable efficiency; leads up on flat traffic = conversion/CTA story); judge quality via the **CTA→SAL mix** (use the pack's exact rates — Talk to Sales ~37%, Sales Demo Request ~15%, Custom Video Demo Request ~8%, Gated Free Trial ~7%) and the EV/acquisition-value trend. Reconcile to the app cards before asserting. Cite exact figures; never invent numbers; when the data can't answer the "why", name the open question and the team that owns it.

## Notes
- **Owner:** created in-UI-as-you → `createdBy` = you.
- **Interactive vs scheduled:** this Agent is the *conversational* side (ask it questions). The weekly *card-updater* stays the Jupyter batch job (see DEPLOY-TO-DOMO.md) — different tool, same Knowledge Pack.
- **Keeps learning:** both this Agent and the batch notebook read the same Knowledge Pack fileset, so updating `weekly-agent-knowledge-pack.md` (and re-uploading to the collection) upgrades both at once.
