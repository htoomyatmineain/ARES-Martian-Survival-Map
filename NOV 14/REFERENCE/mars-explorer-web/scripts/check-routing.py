"""Independent source-cell envelope checks and a distinct local-plane method.

Uses scalar native-cell differences, not the preparation gradient function, for
random regional squares. Least-squares 3x3 planes give an independent smoothed
slope comparison; differences with unsmoothed cell bounds are expected.
"""
import gzip,hashlib,json,math
from pathlib import Path
import importlib.util
import numpy as np
import rasterio
from rasterio.windows import Window

spec=importlib.util.spec_from_file_location('prep',Path('scripts/prepare-routing.py'));prep=importlib.util.module_from_spec(spec);spec.loader.exec_module(prep)
meta=json.loads(Path('src/data/routing-catalog.json').read_text())
packed=Path('public/data/routing/native-hazards.bin').read_bytes();raw=gzip.decompress(packed)
assert hashlib.sha256(raw).hexdigest()==meta['sha256'] and hashlib.sha256(packed).hexdigest()==meta['compressedSha256']
grid=np.frombuffer(raw,dtype='<f4').reshape(1000,1000,5)
display_manifest=json.loads(Path('source-data/Western-Jezero-Web-Lossless/package-manifest.json').read_text())
display=np.fromfile(Path('source-data/Western-Jezero-Web-Lossless')/display_manifest['display']['terrainValues'],dtype='<f4').reshape(1001,1001)
display_valid=np.isfinite(display[:-1,:-1])&np.isfinite(display[:-1,1:])&np.isfinite(display[1:,:-1])&np.isfinite(display[1:,1:])
assert not np.any(np.isfinite(grid[:,:,4])&~display_valid),'Native-valid square has unavailable display triangles'
dx,dy=meta['nativeLocalSpacing'];R=3396190.;coslat=math.cos(math.radians(18.46))
synthetic=[]
for ex,sz in [(0,0),(.1,0),(0,.2),(.1,.2),(1,0)]:
    yy,xx=np.mgrid[:8,:9];h=xx*dx*ex+yy*dy*sz
    fields=prep.cell_gradients(h,dx,dy)
    for k,want in enumerate([ex,ex,sz,sz]):assert np.max(np.abs(fields[k]-want))<1e-12
    synthetic.append({'eastGradient':ex,'southGradient':sz,'slopeDegrees':math.degrees(math.atan(math.hypot(ex,sz)))})
h=np.zeros((5,9));h[:,4]=1;fields=prep.cell_gradients(h,dx,dy)
assert np.max(fields[1])>1 and np.min(fields[0])<-1
h[2,4]=np.nan;assert not prep.cell_gradients(h,dx,dy)[4][1:3,3:5].any()

rng=np.random.default_rng(20261112);positions=[(int(r),int(c)) for r,c in rng.integers(0,1000,(600,2))]
positions += [(r,c) for r,c in np.argwhere(~np.isfinite(grid[:,:,4]))[::50]]
cells=0;native_cells=0;valid=0;missing=0;max_rounding=0.;plane_differences=[]
with rasterio.open(prep.ROOT/'elevation.vrt') as src:
    tr=src.transform;x0=(tr.c+.5-R*math.radians(77.42))*coslat;z0=R*math.radians(18.46)-(tr.f-.5)
    for r,c in positions:
        c0=math.floor((-5000+c*10-x0)/dx);c1=math.floor((-5000+(c+1)*10-x0)/dx)
        r0=math.floor((-5000+r*10-z0)/dy);r1=math.floor((-5000+(r+1)*10-z0)/dy)
        lo=max(0,r0);hi=min(src.height,r1+2)
        h=np.full((r1-r0+2,c1-c0+2),np.nan)
        h[lo-r0:hi-r0]=src.read(1,window=Window(c0,lo,c1-c0+2,hi-lo))
        h[(h==src.nodata)|~np.isfinite(h)]=np.nan
        ex=[];sz=[];bad=False
        for y in range(h.shape[0]-1):
            for x in range(h.shape[1]-1):
                a,b,d,e=map(float,[h[y,x],h[y,x+1],h[y+1,x],h[y+1,x+1]])
                native_cells+=1
                if not all(map(math.isfinite,[a,b,d,e])):bad=True;continue
                ex.extend([(b-a)/dx,(e-d)/dx]);sz.extend([(d-a)/dy,(e-b)/dy])
        cells+=1;actual=grid[r,c]
        if bad:assert np.isnan(actual).all();missing+=1;continue
        valid+=1;expected=[min(ex),max(ex),min(sz),max(sz)]
        assert actual[0]<=expected[0] and actual[1]>=expected[1] and actual[2]<=expected[2] and actual[3]>=expected[3]
        max_rounding=max(max_rounding,max(abs(float(a)-b) for a,b in zip(actual[:4],expected)))
        # A different method: fit a plane to a 3x3 native neighbourhood.
        cy=h.shape[0]//2;cx=h.shape[1]//2;patch=h[cy-1:cy+2,cx-1:cx+2]
        yy,xx=np.mgrid[-1:2,-1:2];design=np.stack([xx.ravel()*dx,yy.ravel()*dy,np.ones(9)],axis=1)
        bx,bz,_=np.linalg.lstsq(design,patch.ravel(),rcond=None)[0]
        bound=math.degrees(math.atan(math.hypot(max(abs(actual[0]),abs(actual[1])),max(abs(actual[2]),abs(actual[3])))))
        fitted=math.degrees(math.atan(math.hypot(bx,bz)))
        assert fitted<=bound+1e-5
        plane_differences.append(bound-fitted)
report={'checkedAt':'2026-11-12','syntheticPlanes':synthetic,'oneMetreRidgeDetected':True,'missingCornersBlocked':True,'independentRegionalCellsChecked':cells,'nativeCellsChecked':native_cells,'validControls':valid,'missingControls':missing,'envelopeOrMaskFailures':0,'maxOutwardRoundingGradient':max_rounding,'planeFitComparison':{'controls':len(plane_differences),'medianConservativeBoundMinusFittedSlopeDegrees':float(np.median(plane_differences)),'p95Degrees':float(np.quantile(plane_differences,.95)),'explanation':'Smoothed local plane versus conservative native envelope: differences are method/footprint effects, not measured DEM error.'},'coverage':{'valid':meta['validCells'],'total':1000000,'blocked':1000000-meta['validCells']},'limits':['Bilinear 1 m DEM cannot reveal subpixel rocks, soil strength, slip or suit limits.','Local-frame horizontal distance uses the zone-centre latitude; longitude distance varies by about 0.05% across the zone.','Conservative 10 m envelopes and 20 m graph can reject narrow passable corridors.','Not astronaut operational safety certification.']}
Path('../docs/routing-validation-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
