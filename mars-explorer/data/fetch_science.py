import concurrent.futures
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urljoin

root=Path(__file__).resolve().parent
archive=root/"science"
archive.mkdir(exist_ok=True)
pds="https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_"
meda="https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/"

def curl(url,path=None):
    cmd=["curl.exe","-fsSL","--max-time","75"]
    if path is not None:
        cmd+=["-o",str(path)]
    return subprocess.check_output(cmd+[url]).decode(errors="replace")

def listing(url):
    return [urljoin(url,x) for x in re.findall(r'href=["\']([^"\']+)',curl(url),re.I)
            if x not in ("../","/","..")]

def save(url,name):
    path=archive/name
    part=path.with_suffix(path.suffix+".part")
    curl(url,part)
    if not part.stat().st_size: raise ValueError("Empty response")
    part.replace(path)
    return {"file":name,"url":url,"bytes":path.stat().st_size}

def spectra(instrument):
    if instrument=="SuperCam":
        folder=pds+"supercam/data_calibrated_spectra/sol_00466/"
        allowed=(".fits",)
    else:
        collection=pds+"pixl/data_processed/"
        dirs=[u for u in listing(collection) if re.search(r'/sol_\d+/$',u)]
        folder=min(dirs,key=lambda u:abs(int(u.rstrip("/").rsplit("_",1)[1])-466))
        allowed=(".csv",".tab")
    links=listing(folder)
    choices=[u for u in links if u.lower().endswith(allowed)]
    if not choices:
        folders=[u for u in links if u.startswith(folder) and u.endswith("/") and u!=folder]
        for sub in folders[:6]:
            choices.extend(u for u in listing(sub) if u.lower().endswith(allowed))
    choices.sort(key=lambda u:(u.lower().endswith("inventory.csv"), len(u),u))
    if not choices: raise ValueError("No data file found")
    url=choices[0]
    return [save(url,instrument.lower()+"-"+url.rsplit("/",1)[1]),
            save(url.rsplit(".",1)[0]+".xml",instrument.lower()+"-"+url.rsplit("/",1)[1].rsplit(".",1)[0]+".xml")]

def weather():
    todo=[meda]
    for depth in range(3):
        next_folders=[]
        for u in todo[:10]:
            links=listing(u)
            candidates=[v for v in links if re.search(r'(?:0466|0465|0467).*\.csv$',v,re.I)]
            if candidates:
                selected=sorted(candidates,key=lambda u:("ats" not in u.lower(),"ps" not in u.lower(),u))[0]
                return [save(selected,"meda-"+selected.rsplit("/",1)[1]),
                        save(selected.rsplit(".",1)[0]+".xml","meda-"+selected.rsplit("/",1)[1].rsplit(".",1)[0]+".xml")]
            next_folders.extend(v for v in links if v.startswith(u) and v.endswith("/") and v!=u and ("04" in v or depth==0))
        todo=next_folders
    raise ValueError("No delta-period MEDA CSV found")

def run(name,task):
    try:
        result=task()
        print(name,len(result),flush=True)
        return (name,result)
    except Exception as e:
        print(name,str(e),flush=True)
        return (name,{"error":str(e)})

if __name__=="__main__":
    with concurrent.futures.ThreadPoolExecutor() as pool:
        jobs=[pool.submit(run,"MEDA",weather),pool.submit(run,"PIXL",lambda:spectra("PIXL")),pool.submit(run,"SuperCam",lambda:spectra("SuperCam"))]
        result=dict(j.result() for j in jobs)
    (archive/"downloads.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
