"""Conservative native bilinear-cell gradient envelopes, without DEM resampling.

Every native surface cell overlapping each 10 m local square contributes all four
corner derivatives. One missing corner blocks the square. Gradients are in the
application's local metre frame, not raw equirectangular projected metres.
"""
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window

ROOT=Path('source-data/Western-Jezero-10km-HiRISE')
OUT=Path('public/data/routing'); OUT.mkdir(parents=True,exist_ok=True)
R=3396190.; LAT=18.46; LON=77.42; N=1000; STEP=10.

def cell_gradients(h,dx,dy):
    a,b,c,d=h[:-1,:-1],h[:-1,1:],h[1:,:-1],h[1:,1:]
    valid=np.isfinite(a)&np.isfinite(b)&np.isfinite(c)&np.isfinite(d)
    ex0=(b-a)/dx; ex1=(d-c)/dx
    sz0=(c-a)/dy; sz1=(d-b)/dy
    return np.minimum(ex0,ex1),np.maximum(ex0,ex1),np.minimum(sz0,sz1),np.maximum(sz0,sz1),valid

def build():
    result=np.full((N,N,5),np.nan,dtype='<f4')
    checks=[]
    with rasterio.open(ROOT/'elevation.vrt') as src:
        tr=src.transform
        assert abs(tr.a-1)<1e-9 and abs(tr.e+1)<1e-9
        coslat=np.cos(np.deg2rad(LAT))
        x0=(tr.c+.5-R*np.deg2rad(LON))*coslat
        z0=R*np.deg2rad(LAT)-(tr.f-.5)
        dx=tr.a*coslat; dy=-tr.e
        left=np.floor((-5000+np.arange(N)*STEP-x0)/dx).astype(int)
        right=np.floor((-5000+(np.arange(N)+1)*STEP-x0)/dx).astype(int)
        offsets=np.arange(int((right-left).max())+1)
        ix=left[:,None]+offsets
        include=ix<=right[:,None]
        assert left.min()>=0 and right.max()+1<src.width
        for row in range(N):
            top=int(np.floor((-5000+row*STEP-z0)/dy))
            bottom=int(np.floor((-5000+(row+1)*STEP-z0)/dy))
            lo=max(0,top); hi=min(src.height,bottom+2)
            h=np.full((bottom-top+2,src.width),np.nan)
            h[lo-top:hi-top]=src.read(1,window=Window(0,lo,src.width,hi-lo)).astype('f8')
            h[(h==src.nodata)|~np.isfinite(h)]=np.nan
            fields=cell_gradients(h,dx,dy)
            valid=np.all(fields[4],axis=0)
            safe_ix=np.minimum(ix,len(valid)-1)
            good=np.all(np.where(include,valid[safe_ix],True),axis=1)
            for k in range(4):
                extrema=np.min(fields[k],axis=0) if k%2==0 else np.max(fields[k],axis=0)
                gathered=np.where(include,extrema[safe_ix],np.inf if k%2==0 else -np.inf)
                bound=np.min(gathered,axis=1) if k%2==0 else np.max(gathered,axis=1)
                # Round outward, never inward, when storing Float32 envelopes.
                result[row,:,k]=np.nextafter(bound.astype('f4'),np.float32(-np.inf if k%2==0 else np.inf))
            # Native bilinear height at each output centre, for approximate metrics.
            cx=(-5000+(np.arange(N)+.5)*STEP-x0)/dx
            cy=(-5000+(row+.5)*STEP-z0)/dy-top
            cc=np.floor(cx).astype(int); rr=int(np.floor(cy)); fx=cx-cc; fy=cy-rr
            result[row,:,4]=(h[rr,cc]*(1-fx)+h[rr,cc+1]*fx)*(1-fy)+(h[rr+1,cc]*(1-fx)+h[rr+1,cc+1]*fx)*fy
            result[row,~good,:]=np.nan
            if row%100==0: print(f'Native hazard rows: {row}/{N}',flush=True)
        raw=result.tobytes(); packed=gzip.compress(raw,compresslevel=9,mtime=0)
        (OUT/'native-hazards.bin').write_bytes(packed)
        meta={'version':1,'width':N,'height':N,'spacing':STEP,'size':10000,'center':{'lat':LAT,'lon':LON},'channels':['eastMin','eastMax','southMin','southMax','centreHeight'],
              'bytes':len(raw),'compressedBytes':len(packed),'sha256':hashlib.sha256(raw).hexdigest(),'compressedSha256':hashlib.sha256(packed).hexdigest(),
              'validCells':int(np.isfinite(result[:,:,4]).sum()),'source':'NASA HiRISE native 1 m DEM; no smoothing or gap filling',
              'sourceTransform':list(tr)[:6],'sourceSize':[src.width,src.height],'nativeLocalSpacing':[dx,dy],
              'method':'Outward-rounded gradient envelopes of every overlapping native bilinear surface cell, including cell-boundary touches; any missing corner blocks the output cell.',
              'sourceUrl':json.loads((ROOT/'download-manifest.json').read_text())['products']['elevation']['sourceUrl'],
              'sourceFiles':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(ROOT.glob('elevation-*.tif'))],
              'sourceVrtSha256':hashlib.sha256((ROOT/'elevation.vrt').read_bytes()).hexdigest()}
        Path('src/data/routing-catalog.json').write_text(json.dumps(meta,indent=2)+'\n')
        print(json.dumps(meta,indent=2))

if __name__=='__main__': build()
