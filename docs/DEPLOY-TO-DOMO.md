# Deploy the Weekly Read agent into Domo (final steps)

Everything is prepared: the workspace exists, the Knowledge Pack is in Domo, the notebook is written and dry-run-verified. These last steps are JupyterLab/Domo **UI actions** (the notebook file and the schedule can't be set via API), so they're yours to click — ~5 minutes.

**Workspace:** "Analytics | Digital Marketing Weekly Read Agent" (id `a3f4efb3-6012-4ba1-820d-0d374ddeb3c7`) — Data → More → Jupyter Workspaces.

### 1. Attach a Domo access-token account
Hover the workspace → wrench (Manage) → **Edit** → **Accounts → Add Account** → pick (or create) a **Domo Access Token** account whose token can query datasets, call AI, update cards, and write filesets (your own token is simplest). **Name it exactly `Weekly Read Domo Token`** (matches `ACCOUNT_ALIAS` in the notebook — or change that variable to your account's name). Save.

### 2. Add the notebook
Start the workspace (Run) → open it → **File → New → Notebook** (Python 3) → paste all of `~/work/weekly_agent_notebook.py` → rename to `weekly_read.ipynb` → **Save**. If `requests` is missing, run `pip install requests` in a terminal cell (usually already present).

### 3. Test it once
**Run → Run All Cells.** It updates the 7 cards in place (idempotent) and appends/refreshes this week's history section (idempotent — safe to re-run). Confirm the cards still read correctly and the history file shows the week once. *(Tip: set a cell `os.environ["DRY_RUN"]="1"` first if you want a no-write preview.)*

### 4. Schedule it
In the notebook toolbar, click **Schedule Notebook** → the **Create DataFlow** modal opens → Name it "Weekly Digital Marketing Read", pick a small Compute Tier → **When should this DataFlow be run? → On a Schedule** → **Specific days of the week → Monday**, time ~7:00 AM → **Save**. This creates a Jupyter DataFlow that runs the notebook weekly in Domo's cloud (no laptop needed). It appears under Data → DataFlows; use **Run** there to trigger manually anytime, and the **History** tab shows each run's output.

### 5. Retire the Windows task
Once the first Domo run succeeds, disable the Windows Task Scheduler entry:
`Disable-ScheduledTask -TaskName "Weekly Digital Marketing Read"` (or ask me to do it).

---
**How it stays smart:** the notebook reads the Knowledge Pack from the "Digital Marketing Weekly Agent" collection each run and feeds it to Domo AI, so all our learnings travel with the agent. To teach it something new, update `weekly-agent-knowledge-pack.md` and re-upload it to that collection — no notebook change needed.
