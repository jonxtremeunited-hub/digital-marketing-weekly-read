#!/usr/bin/env python
# Builds the All Channels "Weekly Read" text card and places it at the top of the page.
import os, json, urllib.request, urllib.error, sys

INST = os.environ["DOMO_INSTANCE"]; TOK = os.environ["DOMO_TOKEN"]
BASE = f"https://{INST}.domo.com/api"
PAGE = "550532229"
H = {"X-DOMO-Developer-Token": TOK, "Content-Type": "application/json"}
STD_H, CMP_H = 34, 52   # card height (grid units) standard / compact

def req(method, path, body=None, headers=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers=headers or H)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

# ---------- Slate markup builder ----------
def leaf(t, marks=None): return {"object":"leaf","text":t,"marks":[{"object":"mark","type":m,"data":{}} for m in (marks or [])]}
def tnode(leaves): return {"object":"text","leaves":leaves}
def blk(typ, nodes, data=None): return {"object":"block","type":typ,"data":data or {},"nodes":nodes}
def para(leaves, align=None): return blk("p",[tnode(leaves)], {"alignment":align} if align else {})
def heading(txt, h): return para([leaf(txt,[h,"strong"])])
def bullets(items):  # items: list of list-of-leaf
    return blk("ul",[blk("li",[para(lv)]) for lv in items])

L = leaf
blocks = [
  heading("Digital Marketing — Weekly Read","h1"),
  para([L("Week of Sep 20, 2026  ·  Sun 9/20–Sat 9/26  ·  NAM  ·  All Channels",["em"])]),
  para([L("74 MQLs",["strong"]), L(" (up from 40 last week) and "), L("10 New-Logo SALs",["strong"]),
        L(" (up from 2) — the strongest week since late July, led by Organic Search (48) and Paid Search (19).")]),
  heading("MQLs / SALs (NL) by channel","h3"),
  bullets([
    [L("Organic Search",["strong"]), L(" — 48 MQLs / 5 SALs")],
    [L("Paid Search",["strong"]),    L(" — 19 MQLs / 5 SALs")],
    [L("Paid Social",["strong"]),    L(" — 4 MQLs / 0 SALs")],
    [L("Email",["strong"]),          L(" — 1 MQL / 0 SALs")],
    [L("Portal Site",["strong"]),    L(" — 1 MQL / 0 SALs")],
    [L("Total",["strong"]),          L(" — "), L("74 MQLs / 10 SALs",["strong"]), L("  (Display, Organic Social, Website: 0 / 0)")],
  ]),
  heading("What happened","h3"),
  para([L("Leads rose across the board and every digital channel contributed. SALs more than doubled, split evenly Organic 5 / Paid 5. Of the week's 74 MQLs, "),
        L("6 already became SALs within their creation week",["strong"]), L(" — a fast-conversion quality signal.")]),
  heading("Why","h3"),
  bullets([
    [L("Organic — conversion, not traffic: ",["strong"]), L("sessions were flat (~17K); the demo-request CTA converted better, concentrated on the homepage (22 of 38 demo fills).")],
    [L("Paid Search — efficiency, not spend: ",["strong"]), L("spend stayed low (~$13K vs July's $40–51K) yet cost/MQL hit a period-best $743, concentrated on Brand + Compete terms.")],
    [L("One offer drove both: ",["strong"]), L("Custom Video Demo Request ~2.5×'d across organic and paid at once, while Gated Free Trial and Talk to Sales slipped.")],
  ]),
  heading("Lead quality (Expected-Value model)","h3"),
  para([L("Average acquisition value trended up and held above $2K — a healthy sign. Best day was "),
        L("9/23",["strong"]), L(" (19 MQLs at the week's peak average and total acquisition value); it has already added $21K of value since creation with 3 of 19 converted to SAL.")]),
  heading("Implications","h3"),
  bullets([
    [L("Paid gains are efficiency-driven (durable) but sit in demand-capped Brand/Compete — scaling volume further needs nonbrand, currently starved.")],
    [L("Volume over quality: the incremental mix skews to the demo CTA (~8% MQL→SAL) over Talk to Sales (~37%), so blended expected conversion sits near the norm (~10%).")],
  ]),
  heading("Pacing & #1 follow-up","h3"),
  para([L("Current week is pacing ahead on organic (9 MQLs in its first two days vs 3 in wk 9/20's). "),
        L("Open question: what changed on the homepage demo experience the week of 9/20?",["strong"])]),
]
markup = json.dumps({"object":"value","document":{"object":"document","data":{},"nodes":blocks}})

# minimal textHtml fallback
def html_esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
html_parts=["<div style=\"white-space:pre-wrap\">"]
for b in blocks:
    if b["type"]=="ul":
        html_parts.append("<ul>")
        for li in b["nodes"]:
            txt="".join(lf["text"] for lf in li["nodes"][0]["nodes"][0]["leaves"])
            html_parts.append(f"<li>{html_esc(txt)}</li>")
        html_parts.append("</ul>")
    else:
        lv=b["nodes"][0]["leaves"]; txt="".join(x["text"] for x in lv)
        marks=set(m["type"] for x in lv for m in x["marks"])
        tag = "h1" if "h1" in marks else ("h3" if "h3" in marks else "div")
        sty = "font-style:italic;" if "em" in marks else ""
        html_parts.append(f"<{tag} style=\"{sty}\">{html_esc(txt)}</{tag}>")
html_parts.append("</div>")
textHtml="".join(html_parts)

# ---------- 0. cleanup prior auto cards (idempotent re-runs) ----------
st, cards = req("GET", f"/content/v1/pages/{PAGE}/cards", headers={"X-DOMO-Developer-Token":TOK})
if isinstance(cards, list):
    for c in cards:
        if c.get("title","").startswith("Weekly Read — All Channels (auto)"):
            d,_=req("DELETE", f"/content/v1/cards/{c['id']}", headers={"X-DOMO-Developer-Token":TOK})
            print("cleanup deleted prior card", c["id"], d)

# ---------- 1. create ----------
body={"type":"Text","title":"Weekly Read — All Channels (auto)",
      "metadata":{"markup":markup,"textHtml":textHtml,"kpiType":"Text",
                  "dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
st, resp = req("POST", f"/content/v1/cards?pageId={PAGE}", body)
print("CREATE:", st)
if st>=300: print(resp); sys.exit(1)
card_id = resp["id"]; print("new cardId:", card_id)

# ---------- 2. get layout ----------
st, lay = req("GET", f"/content/v4/pages/{PAGE}/layouts", headers={"X-DOMO-Developer-Token":TOK})
lid = lay["layoutId"]; print("layoutId:", lid)
# find my card's contentKey
mykey=None
for c in lay["content"]:
    if c.get("cardId")==card_id: mykey=c["contentKey"]
print("my contentKey:", mykey)

# set content-entry render flags
for c in lay["content"]:
    if c["contentKey"]==mykey:
        c["hideTitle"]=True; c["hideWrench"]=True; c["hideDescription"]=True; c["hideFooter"]=True
        c["style"]={"sourceId":"no2","textColor":None}

def reflow(tmpl, w, h):
    # shift existing canvas items down by h; place my card at top
    for t in tmpl:
        if t["contentKey"]==mykey:
            t.update({"x":0,"y":0,"width":w,"height":h,"virtual":False,"virtualAppendix":False})
        elif not t.get("virtual"):
            t["y"]=t.get("y",0)+h
for t in lay["standard"]["template"]:
    pass
# record original canvas for revert
orig=[(t["contentKey"],t.get("y")) for t in lay["standard"]["template"] if not t.get("virtual")]
print("orig standard canvas (key,y):", orig)
reflow(lay["standard"]["template"], 60, STD_H)
reflow(lay["compact"]["template"], 12, CMP_H)

# validate: every content key present in both templates (recurse into TABS children)
def collect(tmpl):
    keys=set()
    def rec(items):
        for t in items:
            keys.add(t["contentKey"])
            if t.get("children"): rec(t["children"])
    rec(tmpl); return keys
ck={c["contentKey"] for c in lay["content"]}
sk=collect(lay["standard"]["template"])
mk=collect(lay["compact"]["template"])
miss_s=ck-sk; miss_c=ck-mk
if miss_s or miss_c:
    print("ABORT: content keys missing from templates. std:",miss_s,"cmp:",miss_c); sys.exit(1)
print("validation ok. content keys:",len(ck))

# ---------- 3. write modified layout to file for curl PUT ----------
outp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_layout.json")
with open(outp,"w",encoding="utf-8") as f: json.dump(lay,f)
print("WROTE_LAYOUT", outp)
print("LID", lid); print("CARD", card_id)
