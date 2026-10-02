import os, json, urllib.request
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]
BASE=f"https://{INST}.domo.com/api"; H={"X-DOMO-Developer-Token":TOK,"Content-Type":"application/json"}
CID=713129647
# utf-8-read-as-cp1252 mojibake sequences -> correct char (longest/most-specific first)
REPS=[("â€”","—"),("â€“","–"),("â€™","’"),("â€˜","‘"),("â€œ","“"),("â€\x9d","”"),("â€¦","…"),
      ("â†’","→"),("â‰¥","≥"),("â‰¤","≤"),("Ã—","×"),("Â·","·"),("Â "," "),("â€","”")]
def fix(s):
    if not s: return s
    for k,v in REPS: s=s.replace(k,v)
    return s
r=urllib.request.Request(f"{BASE}/content/v1/cards?urns={CID}&parts=metadata",headers={"X-DOMO-Developer-Token":TOK})
c=json.loads(urllib.request.urlopen(r).read().decode('utf-8'))[0]; md=c['metadata']
nm,nh,nt=fix(md.get('markup','')),fix(md.get('textHtml','')),fix(c.get('title',''))
resid=sum((nm+nh+nt).count(x) for x in ['â€','Â·','â†','Ã'])
body={"type":"Text","title":nt,"metadata":{"markup":nm,"textHtml":nh,"kpiType":"Text",
      "dataFileIds":"[]","notebookVersion":"v3","dynamicTextItems":"{}"}}
req=urllib.request.Request(f"{BASE}/content/v1/cards/{CID}",data=json.dumps(body).encode('utf-8'),method="PUT",headers=H)
st=urllib.request.urlopen(req).status
print("PUT",st,"| residual mojibake markers after fix:",resid,"| title:",repr(nt))
