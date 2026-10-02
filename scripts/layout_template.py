import os, json, urllib.request, subprocess, sys
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]; BASE=f"https://{INST}.domo.com/api"
WORK="C:/Users/jonathan.ferrell/work"
pageId=sys.argv[1]
TOP=31; W=30; CH=18  # standard header height; half width; compact card height

def get(path):
    r=urllib.request.Request(BASE+path, headers={"X-DOMO-Developer-Token":TOK})
    return json.loads(urllib.request.urlopen(r).read().decode('utf-8'))
def curl(method,path,file=None,inline=None,charset=False):
    ct="application/json;charset=utf-8" if charset else "application/json"
    cmd=["curl","-s","-w","\n%{http_code}","-X",method,"-H",f"X-DOMO-Developer-Token: {TOK}","-H",f"Content-Type: {ct}"]
    if inline is not None: cmd+=["--data",inline]
    if file is not None: cmd+=["--data","@"+file]
    cmd.append(BASE+path)
    out=subprocess.run(cmd,capture_output=True,text=True).stdout; i=out.rfind("\n")
    return out[i+1:].strip(), out[:i]

cards=get(f"/content/v1/pages/{pageId}/cards")
textId=next((c["id"] for c in cards if c.get("title","").startswith("Weekly Read")), None)
chatId=next((c["id"] for c in cards if c.get("type")=="domoapp" or "Chat" in c.get("title","")), None)
print(f"page {pageId}: textCard={textId} chatCard={chatId}")
if not textId or not chatId:
    print("  MISSING a card — skipping"); sys.exit(0)

lay=get(f"/content/v4/pages/{pageId}/layouts"); lid=lay["layoutId"]
def keyOf(cid):
    return next((c["contentKey"] for c in lay["content"] if c.get("cardId")==cid), None)
tk, ck = keyOf(textId), keyOf(chatId)
# styles + hide chrome (no card title/wrench on either card)
for c in lay["content"]:
    if c["contentKey"]==tk:
        c["style"]=None; c["hideTitle"]=True; c["hideWrench"]=True
    elif c["contentKey"]==ck:
        c["style"]={"sourceId":"ca5","textColor":None}
        c["hideTitle"]=True; c["hideWrench"]=True; c["hideDescription"]=True; c["hideFooter"]=True

def reflow(grid, side, top, cmp):
    tmpl=lay[grid]["template"]
    others=[t for t in tmpl if not t.get("virtual") and t["contentKey"] not in (tk,ck)]
    delta = (top - min((t.get("y",0) for t in others), default=top))
    for t in tmpl:
        if t["contentKey"]==tk:
            t.update({"x":0,"y":0,"width":(12 if cmp else side),"height":(CH if cmp else top),"virtual":False,"virtualAppendix":False})
        elif t["contentKey"]==ck:
            t.update({"x":(0 if cmp else side),"y":(CH if cmp else 0),"width":(12 if cmp else side),"height":(CH if cmp else top),"virtual":False,"virtualAppendix":False})
        elif not t.get("virtual"):
            t["y"]=t.get("y",0)+delta
reflow("standard", W, TOP, False)
reflow("compact", 12, 2*CH, True)

# validate keys ⊆ templates (recurse children)
def collect(tmpl):
    ks=set()
    def rec(items):
        for t in items:
            ks.add(t["contentKey"])
            if t.get("children"): rec(t["children"])
    rec(tmpl); return ks
ck_all={c["contentKey"] for c in lay["content"]}
if (ck_all-collect(lay["standard"]["template"])) or (ck_all-collect(lay["compact"]["template"])):
    print("  ABORT validation"); sys.exit(1)

f=f"{WORK}/_tmpl_{pageId}.json"; json.dump(lay, open(f,"w",encoding="utf-8"))
s1,_=curl("PUT",f"/content/v4/pages/layouts/{lid}/writelock",inline="{}")
s2,b2=curl("PUT",f"/content/v4/pages/layouts/{lid}",file=f,charset=True)
s3,_=curl("DELETE",f"/content/v4/pages/layouts/{lid}/writelock")
print(f"  writelock={s1} PUT={s2} release={s3}")
if s2!="200": print("  ERR:",b2[:200])
