"""Fetch measured elevation samples for the Jezero sector as byte ranges of the NASA DTM."""
import concurrent.futures as cf
import json
import math
import argparse
import urllib.request
from pathlib import Path
import numpy as np

root=Path(__file__).resolve().parent.parent
data=root/"data"
record=26692
scale=1.0096633268711
sphere=3394839.8133163
url="https://www.uahirise.org/PDS/DTM/ESP/ORB_045900_045999/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.IMG"
center=json.loads((root/"assets"/"terrain.json").read_text())["center"]
lat,lon=center["lat"],center["lon"]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--count",type=int,choices=(101,201,501),default=101)
n=parser.parse_args().count
coords=np.linspace(-250,250,n)
ys=lat-np.rad2deg(coords/3396190)
xs=lon+np.rad2deg(coords/(3396190*math.cos(math.radians(lat))))
rows=np.round(1088495.5-sphere*np.deg2rad(ys)/scale).astype(int)
cols=np.round(3210.5+sphere*math.cos(math.radians(15))*np.deg2rad(xs-77.44)/scale).astype(int)
first,last=int(cols[0]),int(cols[-1])
ranges=data/"hirise-grid-ranges"
ranges.mkdir(exist_ok=True)

def get(row):
    part=ranges/f"{row}-{first}-{last}.bin"
    if part.exists() and part.stat().st_size==4*(last-first+1):
        return part.read_bytes()
    a,b=(row+1)*record+first*4,(row+1)*record+(last+1)*4-1
    for host in ["www.uahirise.org","hirise-pds.lpl.arizona.edu","www.uahirise.org"]:
        try:
            request=urllib.request.Request(url.replace("www.uahirise.org",host),headers={"Range":f"bytes={a}-{b}"})
            with urllib.request.urlopen(request,timeout=18) as res:
                if res.status!=206 or not res.headers.get("Content-Range","").startswith(f"bytes {a}-{b}/"):
                    raise ValueError("server did not honor requested byte range")
                content=res.read()
            if len(content)!=b-a+1: raise ValueError("truncated range")
            part.write_bytes(content)
            return content
        except (OSError,ValueError) as e:
            error=e
    raise RuntimeError(f"Could not fetch row {row}: {error}")

with cf.ThreadPoolExecutor(max_workers=14) as pool:
    futures={pool.submit(get,int(row)):int(row) for row in sorted(set(rows))}
    indices={}
    for i,row in enumerate(rows): indices.setdefault(int(row),[]).append(i)
    grid=np.empty((n,n),dtype="<f4")
    for n,task in enumerate(cf.as_completed(futures),1):
        grid[indices[futures[task]]]=np.frombuffer(task.result(),dtype="<f4")[cols-first]
        if n%10==0 or n==len(futures): print(f"HiRISE rows: {n}/{len(futures)}",flush=True)
if not np.all(np.isfinite(grid)&(np.abs(grid)<100000)):
    raise ValueError(f"DTM footprint misses part of zone ({int(np.sum(np.abs(grid)>100000))} missing samples)")
np.savez_compressed(data/(f"hirise-zone-sampled-{grid.shape[0]}.npz" if grid.shape[0]!=101 else "hirise-zone-sampled.npz"),heights=grid,lat=lat,lon=lon)
print(float(grid.min()),float(grid.max()),flush=True)
