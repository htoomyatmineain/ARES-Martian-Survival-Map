"""Independent original-GDB point membership and local topology checks.
Does not fit or adjust geology to improve apparent agreement.
"""
import json,math,hashlib
from pathlib import Path
import numpy as np
import pyogrio.raw,pyogrio,shapely
from shapely.geometry import shape,Point
from shapely.ops import unary_union
from pyproj import CRS,Transformer
gdb=Path('scripts/.cache/geology/original/sim3464_JezeroNili_FINAL/Geodatabase/Nili.gdb')
data=json.loads(Path('public/data/geology/jezero-sim3464.json').read_text())
meta,fids,wkbs,fields=pyogrio.raw.read(gdb,layer='GeoUnits_v1',return_fids=True)
source=[shapely.from_wkb(w) for w in wkbs];source_tree=shapely.STRtree(source)
local=[shape(f['geometry']) for f in data['features']];local_tree=shapely.STRtree(local)
crs=CRS.from_wkt(meta['crs']);project=Transformer.from_crs(crs.geodetic_crs,crs,always_xy=True)
units=fields[list(meta['fields']).index('unit')]
count=0;mismatches=[];roundtrip=[]
unproject=Transformer.from_crs(crs,crs.geodetic_crs,always_xy=True)
for x in np.arange(-4875,5000,250):
 for z in np.arange(-4875,5000,250):
  lon=77.42+math.degrees(x/(3396190*math.cos(math.radians(18.46))));lat=18.46-math.degrees(z/3396190)
  east,north=project.transform(lon,lat);p=Point(east,north)
  expected={str(units[i]) for i in source_tree.query(p,predicate='within')}
  actual={data['features'][i]['unitId'] for i in local_tree.query(Point(x,z),predicate='within')}
  if expected!=actual:mismatches.append({'point':[float(x),float(z)],'expected':sorted(expected),'actual':sorted(actual)})
  ll=unproject.transform(east,north);roundtrip.append(math.hypot((ll[0]-lon)*math.pi/180*3396190*math.cos(math.radians(18.46)),(ll[1]-lat)*math.pi/180*3396190));count+=1
invalid=[i for i,g in enumerate(local) if not g.is_valid]
coverage=unary_union(local).area/1e8
result={'sampledPoints':count,'unitMembershipMismatches':mismatches,'invalidGeometry':invalid,'coverageFraction':coverage,'maximumProjectionRoundTripMetres':max(roundtrip),'sourceCrs':crs.to_wkt(),'interpretation':'Source-to-output calculation agreement, not surveyed accuracy or boundary validation.'}
Path('../docs/geology-validation/independent-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='sourceCrs'},indent=2))
assert not mismatches and not invalid and abs(coverage-1)<1e-8
