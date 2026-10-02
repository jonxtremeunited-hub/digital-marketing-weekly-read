import os, json, urllib.request
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]
BASE=f"https://{INST}.domo.com/api"; H={"X-DOMO-Developer-Token":TOK,"Content-Type":"application/json"}
CARDS={"Paid Search":136596033,"Web & Organic Search":865751266,"Content & SEO":1175530834,
       "Social Media":831164168,"Email":11669531,"Extras":1138405567}
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def leaves_of(b): return b["nodes"][0]["leaves"]
def text_of(lv): return "".join(x.get("text","") for x in lv)
def marks_of(lv): return set(m["type"] for x in lv for m in x.get("marks",[]))
def to_html(doc):
    p=['<div style="white-space:pre-wrap">']
    for b in doc["nodes"]:
        if b["type"]=="ul":
            p.append("<ul>")
            for li in b["nodes"]:
                p.append(f"<li>{esc(text_of(li['nodes'][0]['nodes'][0]['leaves']))}</li>")
            p.append("</ul>"); continue
        lv=leaves_of(b); txt=text_of(lv); mk=marks_of(lv)
        if "h1" in mk: tag,sty="h1",""
        elif "em" in mk: tag,sty="div","font-style:italic"
        elif len(lv)==1 and "strong" in (lv[0].get("marks") and [m["type"] for m in lv[0]["marks"]] or []) and len(txt)<=45:
            tag,sty="h3",""          # single fully-bold short line = section header
        else: tag,sty="div",""
        p.append(f'<{tag} style="{sty}">{esc(txt)}</{tag}>')
    p.append("</div>"); return "".join(p)
def get(cid):
    r=urllib.request.Request(f"{BASE}/content/v1/cards?urns={cid}&parts=metadata",headers={"X-DOMO-Developer-Token":TOK})
    return json.loads(urllib.request.urlopen(r).read().decode('utf-8'))[0]
def put(cid,body):
    r=urllib.request.Request(f"{BASE}/content/v1/cards/{cid}",data=json.dumps(body).encode('utf-8'),method="PUT",headers=H)
    return urllib.request.urlopen(r).status
for name,cid in CARDS.items():
    c=get(cid); md=c["metadata"]; doc=json.loads(md["markup"])["document"]
    html=to_html(doc)
    body={"type":"Text","title":c["title"],"metadata":{"markup":md["markup"],"textHtml":html,
          "kpiType":"Text","dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
    st=put(cid,body)
    print(f"{name}: PUT {st} | <h3>={html.count('<h3')} <h1>={html.count('<h1')}")
