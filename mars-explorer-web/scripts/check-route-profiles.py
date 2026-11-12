"""Cross-check browser tile/profile equations with original TIFFs and NumPy."""
import json,math
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window

controls=json.loads(Path('scripts/.cache/routing/route-controls.json').read_text())
reports=[];R=3396190.;dx=math.cos(math.radians(18.46))
with rasterio.open('source-data/Western-Jezero-10km-HiRISE/elevation.vrt') as src:
    tr=src.transform
    for control in controls:
        p=np.asarray([[q['x'],q['z']] for q in control['path']]);actual=np.asarray(control['heights'])
        # Direct local metre to source projected metre equations; no JS geo conversion.
        col=(R*math.radians(77.42)+p[:,0]/dx-tr.c)/tr.a-.5
        row=(R*math.radians(18.46)-p[:,1]-tr.f)/tr.e-.5
        c=np.floor(col).astype(int);r=np.floor(row).astype(int);u=col-c;v=row-r
        left,top=int(c.min()),int(r.min());right,bottom=int(c.max()+2),int(r.max()+2)
        h=src.read(1,window=Window(left,top,right-left,bottom-top)).astype('f8');c-=left;r-=top
        a,b,d,e=h[r,c],h[r,c+1],h[r+1,c],h[r+1,c+1]
        assert np.all(np.isfinite([a,b,d,e])) and not np.any(np.asarray([a,b,d,e])==src.nodata)
        expected=(a*(1-u)+b*u)*(1-v)+(d*(1-u)+e*u)*v
        error=np.abs(expected-actual);assert error.max()<1e-7
        dd=np.diff(p,axis=0);length=np.hypot(dd[:,0],dd[:,1]);nonzero=length>1e-12
        ux=np.zeros(len(p));uz=np.zeros(len(p));ux[1:][nonzero]=dd[nonzero,0]/length[nonzero];uz[1:][nonzero]=dd[nonzero,1]/length[nonzero];ux[0]=ux[1];uz[0]=uz[1]
        ex=((b-a)*(1-v)+(e-d)*v)/dx;sz=(d-a)*(1-u)+(e-b)*u
        along=np.degrees(np.arctan(np.abs(ex*ux+sz*uz)));cross=np.degrees(np.arctan(np.abs(-ex*uz+sz*ux)))
        assert along.max()<=control['alongBound']+1e-6 and cross.max()<=control['crossBound']+1e-6
        dh=np.diff(expected);distance=np.sum(np.sqrt(np.sum(dd*dd,axis=1)+dh*dh));ascent=np.maximum(0,dh).sum()
        reports.append({'strategy':control['strategy'],'sourcePointsChecked':len(p),'maxHeightDifferenceMetres':float(error.max()),'nativeDirectionalChecksExceededBound':0,'sampledAlongMaxDegrees':float(along.max()),'sampledCrossMaxDegrees':float(cross.max()),'independentDistanceMetres':float(distance),'independentAscentMetres':float(ascent)})
result={'reports':reports,'method':'Direct source-projected coordinates and NumPy bilinear TIFF sampling versus JS geographic conversion and hash-verified compressed tile sampling. Directional sample checks are supplementary to complete envelope edge checks.','maximumAllowedNumericDifferenceMetres':1e-7,'limits':'Computational agreement, not absolute terrain accuracy or astronaut limits.'}
Path('../docs/native-profile-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
