#!/usr/bin/env python
# Build "Weekly Read" text cards on the 6 channel pages and place each at the top.
import os, json, urllib.request, urllib.error, subprocess, sys
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]
BASE=f"https://{INST}.domo.com/api"
HJSON={"X-DOMO-Developer-Token":TOK,"Content-Type":"application/json"}
WORK=os.path.dirname(os.path.abspath(__file__))

def ureq(method, path, body=None):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(BASE+path, data=data, method=method, headers=HJSON)
    try:
        with urllib.request.urlopen(r) as resp:
            raw=resp.read().decode(); return resp.status,(json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

def curl(method, path, inline=None, file=None, charset=False):
    ct="application/json;charset=utf-8" if charset else "application/json"
    cmd=["curl","-s","-w","\n%{http_code}","-X",method,"-H",f"X-DOMO-Developer-Token: {TOK}","-H",f"Content-Type: {ct}"]
    if inline is not None: cmd+=["--data",inline]
    if file  is not None: cmd+=["--data","@"+file]
    cmd.append(BASE+path)
    out=subprocess.run(cmd,capture_output=True,text=True).stdout
    i=out.rfind("\n"); return out[i+1:].strip(), out[:i]

# ---- Slate builders ----
def leaf(t,m=None): return {"object":"leaf","text":t,"marks":[{"object":"mark","type":x,"data":{}} for x in (m or [])]}
def tnode(lv): return {"object":"text","leaves":lv}
def blk(ty,nd,dt=None): return {"object":"block","type":ty,"data":dt or {},"nodes":nd}
def para(lv,align=None): return blk("p",[tnode(lv)], {"alignment":align} if align else {})
def bullets(items): return blk("ul",[blk("li",[para(lv)]) for lv in items])
def T(t): return (t,[])
def S(t): return (t,["strong"])
def build(spec):
    out=[]
    for it in spec:
        k=it[0]
        if k=="h1": out.append(para([leaf(it[1],["h1","strong"])]))
        elif k=="em": out.append(para([leaf(it[1],["em"])]))
        elif k=="h3": out.append(para([leaf(it[1],["h3","strong"])]))
        elif k=="p":  out.append(para([leaf(t,m) for (t,m) in it[1]]))
        elif k=="ul": out.append(bullets([[leaf(t,m) for (t,m) in item] for item in it[1]]))
    return out

# ---------------- per-page content ----------------
PAGES = {
 "755514088": {"title":"Paid Search","std":26,"cmp":44,"spec":[
   ("h1","Paid Search — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  Google Ads"),
   ("p",[S("19 MQLs"),T(" (up from a 7–16 late-summer trough) and "),S("5 SALs"),T(" — and the cost to acquire them fell by half.")]),
   ("h3","Cost per MQL"),
   ("p",[T("Spend stayed low/flat at "),S("~$13K"),T(" (July ran $40–51K), yet cost/MQL hit "),S("$743 — the best of the period"),T(" (was $1,000–$2,200 in Aug/early-Sept). Efficiency, not a spend increase.")]),
   ("h3","Why"),
   ("ul",[[S("Mix toward high-intent terms: "),T("Category | Brand $9.1K → 11 MQLs; Category | BI | Compete $3.2K → 7 MQLs. Minimal nonbrand prospecting.")],
          [S("Demo requests rebounded to 13, "),T("matching the site-wide demo-CTA surge.")]]),
   ("h3","Quality & funnel"),
   ("p",[T("Incremental leads are demo requests (~8% MQL→SAL) rather than Talk to Sales (~37%). Funnel is clean — only 1 lead stuck in ‘New.’")]),
   ("h3","Implications & watch"),
   ("ul",[[T("The gain is efficiency-driven and durable — it doesn’t unwind when spend normalizes.")],
          [T("Headroom to scale spend back toward July levels, but Brand/Compete are demand-capped. Real volume growth needs a nonbrand test.")]]),
 ]},
 "35965716": {"title":"Web & Organic Search","std":36,"cmp":58,"spec":[
   ("h1","Web & Organic Search — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  organic sessions + leads"),
   ("p",[S("48 MQLs"),T(" (up ~66% vs the ~29/wk trailing average) and "),S("5 SALs"),T(" — the biggest single-channel contributor this week, driven by conversion rather than traffic.")]),
   ("h3","Traffic vs conversion"),
   ("p",[T("Site sessions were flat-to-down ("),S("~17.2K"),T(", no surge). The lift came from conversion: rate rose to "),S("0.31%"),T(" (from ~0.27%), led by a jump in Watch-Demo form-fills to 40 (from ~27).")]),
   ("h3","CTA mix"),
   ("p",[T("One offer drove it — "),S("Custom Video Demo Request jumped to 38"),T(" (from 12–21/wk all summer, ~2.5×). Gated Free Trial (4) and Talk to Sales (1) both slipped. Demand concentrated in the demo CTA.")]),
   ("h3","Landing pages"),
   ("p",[T("Concentrated on the "),S("homepage"),T(" — domo.com/ produced "),S("22 of 38"),T(" organic demo fills this week, vs 23 across the entire prior 4 weeks. The rest came on a long tail of /learn articles and /ai (see Content & SEO).")]),
   ("h3","Quality & funnel"),
   ("p",[T("2 of this week’s organic MQLs already reached SAL within their creation week. Demo requests convert at ~8%, so this lifts volume, not conversion rate. Funnel healthy — 9 leads stuck in ‘New.’")]),
   ("h3","SEO & content"),
   ("p",[T("No single content piece drove the week; content pages were a steady, distributed source. Rankings/engagement detail lives on the Content & SEO page.")]),
   ("h3","Implications & #1 follow-up"),
   ("ul",[[T("The demo-CTA surge appears to be continuing — current week is pacing ahead (9 organic MQLs in its first two days vs 3 in wk 9/20’s).")],
          [S("Open question for web/CRO: "),T("what changed on the homepage demo experience the week of 9/20? It wasn’t traffic or a newly-flipped test.")]]),
 ]},
 "443328634": {"title":"Content & SEO","std":22,"cmp":36,"spec":[
   ("h1","Content & SEO — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  content-driven organic"),
   ("p",[T("Content pages were a "),S("steady contributor"),T(" this week; the organic surge was homepage-driven, not content.")]),
   ("h3","What happened"),
   ("p",[T("Roughly 16 of the 48 organic MQLs came in on content pages (the rest on the homepage), spread one-per-page across the long tail rather than concentrated on any one asset.")]),
   ("h3","Top content entries"),
   ("ul",[[T("/ai")],[T("/learn/article/dashboard-tools")],[T("/learn/article/best-erp-platforms")],[T("/competitors")],[T("/form/demo-library")]]),
   ("h3","Why / watch"),
   ("p",[T("No content piece spiked this week — the driver was the homepage demo CTA. Content remains a stable base. This card gets richer once we wire in GA Page Data (rankings, engaged time, top movers).")]),
 ]},
 "1598324173": {"title":"Social Media","std":24,"cmp":40,"spec":[
   ("h1","Social Media — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  Paid Social (LinkedIn)"),
   ("p",[S("4 MQLs"),T(" (up from 1–2) and 0 SALs — a real gain, but it came from spending more, not from efficiency.")]),
   ("h3","Cost per MQL"),
   ("p",[T("Spend rose to "),S("~$6.7K (~2× the prior ~$3K/wk)"),T(" for 4 MQLs → $1,675/MQL — roughly 2× Paid Search’s cost and well off Paid Social’s own late-August best of $450–850. Impressions flat (~235K).")]),
   ("h3","Funnel health"),
   ("p",[T("Small volumes, generally healthy — 2 leads stuck in ‘New,’ 11 aged in ‘Accepted.’ No SALs yet this week (expected at this volume and lag).")]),
   ("h3","Implications & watch"),
   ("p",[T("Decide whether the step-up in budget is worth $1,675/MQL, or revert to the more efficient late-August level. Caveat: LinkedIn spend is program-total vs NAM leads, so cost/MQL is somewhat overstated.")]),
 ]},
 "783614234": {"title":"Email","std":24,"cmp":40,"spec":[
   ("h1","Email — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  Eloqua"),
   ("p",[S("1 MQL and 0 SALs"),T(" — email is a low-volume MQL channel; the week’s story is activity and engagement.")]),
   ("h3","Activity & engagement"),
   ("p",[T("The program sent more than ever ("),S("138K sends, highest in the period"),T(") but engagement fell — open rate "),S("5.0%"),T(" (from 6.4–10% earlier in the month), click 0.45%.")]),
   ("h3","Why"),
   ("p",[T("Two large low-intent awareness-nurture blasts dragged the blended rate: INQDQC Awareness Nurture (52K) and Customer Awareness Nurture (35K). A wave of Connections city-roadshow invites (Dallas, NYC, Toronto, LA, Atlanta…) engaged much better (7–15% open).")]),
   ("h3","MQLs & watch"),
   ("p",[T("The few MQLs email produced trace to the INQDQC nurture (2 reached SAL over recent weeks). Connections invites are pipeline-warming, not a direct-MQL engine. Watch engagement erosion from large nurture volume to older lists.")]),
 ]},
 "280382290": {"title":"Extras","std":28,"cmp":46,"spec":[
   ("h1","Extras — Weekly Read"),
   ("em","Week of Sep 20, 2026  ·  NAM  ·  Qualified chatbot, Portal Site & funnel health"),
   ("p",[T("The Qualified free-trial-page chatbot "),S("spiked sharply"),T(" this week; Portal Site contributed 1 MQL.")]),
   ("h3","Qualified chatbot"),
   ("p",[T("Free-trial-page chats exploded to "),S("163"),T(" (from 29 the prior week, ~0 all summer) with 46 conversations started — but only "),S("2 leads created"),T(". High engagement, low attach so far, expected for a new mechanism.")]),
   ("h3","Does it explain the demo lift?"),
   ("p",[T("Not directly. The bot lives on the /free-trial page; the demo surge was on the homepage — different surfaces. More likely the bot is intercepting free-trial visitors (consistent with the Gated Free Trial decline) than feeding demo requests.")]),
   ("h3","Portal Site"),
   ("p",[T("1 MQL — a small but real contribution to the week.")]),
   ("h3","Funnel-health flag (Events)"),
   ("p",[T("Events carry a standing backlog worth an intervention: "),S("77 leads stuck in ‘New’ and 891 aged in ‘Accepted.’"),T(" Events sit outside the digital funnel scope but surface here as a data-hygiene note.")]),
   ("h3","Watch"),
   ("p",[T("Track the Qualified bot’s form-fill → lead attach as it matures and rolls to more pages.")]),
 ]},
}

for pid, cfg in PAGES.items():
    print("="*60); print("PAGE", pid, cfg["title"])
    # cleanup prior auto cards on this page
    st, cards = ureq("GET", f"/content/v1/pages/{pid}/cards")
    if isinstance(cards, list):
        for c in cards:
            if c.get("title","").startswith("Weekly Read — "):
                ureq("DELETE", f"/content/v1/cards/{c['id']}"); print("  cleaned", c["id"])
    # create
    blocks=build(cfg["spec"])
    markup=json.dumps({"object":"value","document":{"object":"document","data":{},"nodes":blocks}})
    body={"type":"Text","title":f"Weekly Read — {cfg['title']} (auto)",
          "metadata":{"markup":markup,"textHtml":"","kpiType":"Text","dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
    st, r = ureq("POST", f"/content/v1/cards?pageId={pid}", body)
    if st>=300: print("  CREATE FAIL", st, r); continue
    cid=r["id"]; print("  created card", cid)
    # get layout
    st, lay = ureq("GET", f"/content/v4/pages/{pid}/layouts")
    lid=lay["layoutId"]; mykey=[c["contentKey"] for c in lay["content"] if c.get("cardId")==cid][0]
    for c in lay["content"]:
        if c["contentKey"]==mykey:
            c["hideTitle"]=True; c["hideWrench"]=True; c["hideDescription"]=True; c["hideFooter"]=True
            c["style"]={"sourceId":"no2","textColor":None}
    def reflow(grid,w,h):
        for t in lay[grid]["template"]:
            if t["contentKey"]==mykey: t.update({"x":0,"y":0,"width":w,"height":h,"virtual":False,"virtualAppendix":False})
            elif not t.get("virtual"): t["y"]=t.get("y",0)+h
    reflow("standard",60,cfg["std"]); reflow("compact",12,cfg["cmp"])
    # validate recursively
    def collect(tmpl):
        ks=set()
        def rec(items):
            for t in items:
                ks.add(t["contentKey"])
                if t.get("children"): rec(t["children"])
        rec(tmpl); return ks
    ck={c["contentKey"] for c in lay["content"]}
    if (ck-collect(lay["standard"]["template"])) or (ck-collect(lay["compact"]["template"])):
        print("  ABORT validation"); continue
    f=os.path.join(WORK,f"_lay_{pid}.json"); json.dump(lay, open(f,"w",encoding="utf-8"))
    s1,_=curl("PUT", f"/content/v4/pages/layouts/{lid}/writelock", inline="{}")
    s2,b2=curl("PUT", f"/content/v4/pages/layouts/{lid}", file=f, charset=True)
    s3,_=curl("DELETE", f"/content/v4/pages/layouts/{lid}/writelock")
    print(f"  writelock={s1} PUT={s2} release={s3}")
    if s2!="200": print("  PUT BODY:", b2[:200])
print("ALL DONE")
