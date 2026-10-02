import os, json, urllib.request
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]
BASE=f"https://{INST}.domo.com/api"
H={"X-DOMO-Developer-Token":TOK,"Content-Type":"application/json"}
CARDS={"Paid Search":136596033,"Web & Organic Search":865751266,"Content & SEO":1175530834,
       "Social Media":831164168,"Email":11669531,"Extras":1138405567}

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def md_to_html(doc):
    # Clean textHtml matching the All Channels card: semantic h1/h3, italic div for em, div for p, ul/li.
    p=['<div style="white-space:pre-wrap">']
    for b in doc["nodes"]:
        if b["type"]=="ul":
            p.append("<ul>")
            for li in b["nodes"]:
                lv=li["nodes"][0]["nodes"][0]["leaves"]; txt="".join(x["text"] for x in lv)
                p.append(f"<li>{esc(txt)}</li>")
            p.append("</ul>")
        else:
            lv=b["nodes"][0]["leaves"]; txt="".join(x["text"] for x in lv)
            marks=set(m["type"] for x in lv for m in x["marks"])
            tag="h1" if "h1" in marks else ("h3" if "h3" in marks else "div")
            sty="font-style:italic" if "em" in marks else ""
            p.append(f'<{tag} style="{sty}">{esc(txt)}</{tag}>')
    p.append("</div>"); return "".join(p)

def get(cid):
    r=urllib.request.Request(f"{BASE}/content/v1/cards?urns={cid}&parts=metadata",headers={"X-DOMO-Developer-Token":TOK})
    return json.loads(urllib.request.urlopen(r).read().decode())[0]
def put(cid, body):
    r=urllib.request.Request(f"{BASE}/content/v1/cards/{cid}",data=json.dumps(body).encode(),method="PUT",headers=H)
    with urllib.request.urlopen(r) as resp: return resp.status

for name,cid in CARDS.items():
    c=get(cid); md=c["metadata"]; doc=json.loads(md["markup"])["document"]
    html=md_to_html(doc)
    body={"type":"Text","title":c["title"],"metadata":{
        "markup":md["markup"],"textHtml":html,"kpiType":"Text",
        "dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
    st=put(cid, body)
    print(f"{name}: PUT {st} | textHtml now starts {html[:45]!r}")
