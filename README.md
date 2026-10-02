# Digital Marketing Weekly Read

An AI layer that adds sharpness to human analysis of **NAM digital marketing** on Domo's
**Digital Marketing Central** app (`dataAppId 1382581853`). The goal: make it fast and easy
to get solid answers to the common weekly questions — *what happened, why, and what it implies* —
and to let anyone interrogate the same data conversationally.

> **Written for:** Domo engineers / FDEs picking this up (and future-me). It assumes familiarity
> with the Domo Product API, App Studio, and AI Services.

---

## The idea: one brain, three jobs

The elegant end-state is a **single analytic brain** that does three things, so the thing
answering your ad-hoc question is the same thing that wrote the weekly summary and accrued the
learnings:

| Job | How it's implemented | Shares |
|---|---|---|
| **1. Write the weekly read** | A Monday batch (`agent/weekly_agent_notebook.py`) pulls verified metrics and updates the per-page "Weekly Read" text cards in place. | the Knowledge Pack |
| **2. Accrue learnings** | `agent/weekly-agent-knowledge-pack.md` — definitions, dataset recipes, CTA→SAL rates, playbook, gotchas. Updating the pack teaches the whole system. | — |
| **3. Answer questions** | The **Domo AI Library agent** ("Digital Marketing Weekly Read Analyst", `b9444bad…`), surfaced as a native **AI Chat** button inside the app. Runs the real agent — full toolkit, SQL tool, Knowledge Pack retrieval. | the Knowledge Pack |

**Scope (consistent everywhere):** NAM = `team IN ('Corporate','Enterprise','Partner')`,
`lead type = 'Marketing'`, **digital channels only** (exclude Event/null). Weeks are **Sun–Sat**.
MQL counted by created week; **SAL = New-Logo** (`opp_stagedate1_prepipeline`). Reconcile to the
app's cards before publishing (the app showed MQL 74 / SAL 10 for the week of 9/20/2026).

---

## Why the native AI Chat (not a custom chat app)

We first built a custom chat **Brick** (`brick-weekly-read-chat/`) because the AI Library agent
**cannot be invoked substantively via API** — `POST /agents/{id}/execute` returns a canned
"can't answer." The agent only runs its tools/reasoning inside Domo's **native AI Chat UI**.

So the architecture pivoted: attach the agent to the app (`agentId` on the dataApp) and open the
**native AI Chat**, which runs the full agent. The in-app entry point is the App Studio
`AI_ASSISTANT` navigation entity (a PRO feature — it must be entitled on the instance, then its
nav item set `visible: true`). The Brick remains as a **fallback** interactive layer (it answers
from live metrics + a condensed Knowledge Pack via `/ai/v1/text/generation`, which *does* work
over the API) but is superseded by the native agent once PRO is on.

`assets/weekly-read-callout.*` is the signpost graphic that points users at the AI Chat icon.

---

## Repo layout

```
agent/
  weekly_agent_notebook.py          # Monday batch: pull metrics → update 7 Weekly Read cards → append yearly history. DRY_RUN=1 to preview.
  weekly-agent-knowledge-pack.md    # The shared brain: definitions, dataset recipes, CTA→SAL rates, playbook, gotchas.

brick-weekly-read-chat/             # The fallback chat Brick (Vite + React + ryuu.js). Forked from the internal starter scaffold.
  src/lib/metrics.ts                #   live metrics bundle (verified SQL recipes via apiProxy)
  src/lib/agent.ts                  #   DomoGPT text-generation grounded in the metrics + reasoning rules
  src/App.tsx                       #   compact chat UI (collapses to one line)
  code-engine/code-engine-functions.js  # apiProxy CE package (forwards method/path/body via codeengine.sendRequest)

scripts/                            # One-off Product-API builders used to create/format the cards + page layouts.
  build_channels.py, build_weekly_card.py, layout_template.py, fix_channel_format.py,
  repair_allchannels.py, regen_channel_headings.py, style_blue.py

docs/
  WEEKLY-DIGITAL-MARKETING-RUNBOOK.md   # how the weekly read is produced + reconciled
  DEPLOY-TO-DOMO.md                     # scheduling the notebook on Domo
  AI-LIBRARY-SETUP.md                   # the toolkit + agent in the AI Library
  weekly-digital-marketing-summary_2026.md  # yearly running history (newest week on top)

assets/
  weekly-read-callout.html / .png     # the "Questions? Ask our Digital Marketing Analyst agent" signpost card
```

---

## Running it

Everything hits the Domo instance with a **developer token** (Product API). Nothing is hardcoded —
scripts read `DOMO_INSTANCE` and `DOMO_TOKEN` from the environment.

```bash
export DOMO_INSTANCE=domo              # the instance subdomain (<instance>.domo.com)
export DOMO_TOKEN=xxxxxxxx             # X-DOMO-Developer-Token

# Preview the weekly read without writing anything:
DRY_RUN=1 python agent/weekly_agent_notebook.py

# Build the fallback Brick:
cd brick-weekly-read-chat && pnpm install && pnpm build   # then `domo publish`
```

The Brick's own secrets live in `brick-weekly-read-chat/.env` (gitignored; see `.env.example`).

---

## Key learnings & gotchas

- **AI Library agents aren't API-executable** — only the native AI Chat UI runs their tools. Build around that, not around `/agents/{id}/execute`.
- **In-app AI Chat is PRO + a hidden nav toggle** — `AI_ASSISTANT` nav visibility won't persist via the full-app `PUT`; use `PUT /dataapps/{id}/navigation/reorder`. The icon still won't render until the PRO entitlement is on.
- **Text cards render `textHtml`, not `markup`** — Domo strips `h3` leaf-marks from `markup`, so section-header sizing must come from `<h3>` in `textHtml`.
- **Layout `PUT` needs `charset=utf-8`**, every content key must appear in both standard + compact templates (recurse into TABS children), and you must hold the write-lock.
- **Quote SQL date literals** in `/query/v1/execute` or they're parsed as arithmetic → 0 rows.
- **Encoding:** always `PUT` card bodies via `json.dumps(..., ensure_ascii=True)`; piping curl→file→python double-encodes (cp1252) and produces mojibake.

See `docs/` for the full runbook and deployment steps.
