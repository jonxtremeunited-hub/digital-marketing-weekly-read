import os, json, urllib.request, subprocess
INST=os.environ["DOMO_INSTANCE"]; TOK=os.environ["DOMO_TOKEN"]; BASE=f"https://{INST}.domo.com/api"
WORK=os.path.dirname(os.path.abspath(__file__))
# channel card -> page (All Channels 713129647 already no3)
TARGETS=[(136596033,755514088),(865751266,35965716),(1175530834,443328634),
         (831164168,1598324173),(11669531,783614234),(1138405567,280382290)]
def get(path):
    r=urllib.request.Request(BASE+path,headers={"X-DOMO-Developer-Token":TOK})
    return json.loads(urllib.request.urlopen(r).read().decode('utf-8'))
def curl(method,path,file=None,inline=None,charset=False):
    ct="application/json;charset=utf-8" if charset else "application/json"
    cmd=["curl","-s","-w","\n%{http_code}","-X",method,"-H",f"X-DOMO-Developer-Token: {TOK}","-H",f"Content-Type: {ct}"]
    if inline is not None: cmd+=["--data",inline]
    if file is not None: cmd+=["--data","@"+file]
    cmd.append(BASE+path)
    out=subprocess.run(cmd,capture_output=True,text=True).stdout; i=out.rfind("\n")
    return out[i+1:].strip(), out[:i]
for cid,page in TARGETS:
    lay=get(f"/content/v4/pages/{page}/layouts"); lid=lay["layoutId"]; found=False
    for c in lay["content"]:
        if c.get("cardId")==cid:
            c["style"]={"sourceId":"no3","textColor":None}; found=True
    if not found: print(cid,"NOT FOUND on",page); continue
    f=os.path.join(WORK,f"_stylay_{page}.json"); json.dump(lay,open(f,"w",encoding="utf-8"))
    s1,_=curl("PUT",f"/content/v4/pages/layouts/{lid}/writelock",inline="{}")
    s2,b2=curl("PUT",f"/content/v4/pages/layouts/{lid}",file=f,charset=True)
    s3,_=curl("DELETE",f"/content/v4/pages/layouts/{lid}/writelock")
    print(f"card {cid} page {page}: writelock={s1} PUT={s2} release={s3}")
    if s2!="200": print("  ERR:",b2[:200])
