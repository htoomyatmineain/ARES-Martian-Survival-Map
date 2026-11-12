"""Compare visible and IR CRISM reflectance to the shared HiRISE basemap.

The result is a relative image registration, not absolute Mars survey accuracy.
No mineral values or map files are edited by this script.
"""
import hashlib
import json
from pathlib import Path
import runpy

import cv2
import numpy as np
from pyproj import CRS,Transformer

CACHE=Path('scripts/.cache/science-audit')


def run():
    register=runpy.run_path('scripts/audit-science-registration.py')['register']
    n=250
    x,z=np.meshgrid(-5000+(np.arange(n)+.5)*40,-5000+(np.arange(n)+.5)*40)
    lat=18.46-z/3396190*180/np.pi
    lon=77.42+x/(3396190*np.cos(np.deg2rad(18.46)))*180/np.pi
    radius=3394839.813316312
    transform=Transformer.from_crs(CRS.from_proj4(f'+proj=longlat +R={radius}'),CRS.from_proj4(f'+proj=eqc +lat_ts=15 +R={radius}'),always_xy=True)
    east,north=transform.transform(lon,lat)
    col=np.floor((east-4422632.2)/36).astype(int);row=np.floor((1109935.5-north)/36).astype(int)
    hirise=Path('source-data/Western-Jezero-Web-Lossless/overview-imagery.webp')
    reference=cv2.resize(cv2.imread(str(hirise),cv2.IMREAD_GRAYSCALE),(n,n),interpolation=cv2.INTER_AREA)
    reports=[]
    for name in ['R770','R1330']:
        path=CACHE/f'crism-{name}.f32'
        values=np.fromfile(path,dtype='<f4').reshape(751,455)[row,col]
        valid=np.isfinite(values)&(values!=65535)
        low,high=np.quantile(values[valid],[.01,.99])
        normalized=np.clip((values-low)/(high-low)*255,0,255).astype('uint8');normalized[~valid]=0
        result=register(normalized,reference)
        assert result is not None, f'No registration for {name}'
        matrix,report=result
        report['band']=name;report['sourceBandSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        centre=np.array([124.5,124.5]);delta=matrix@np.r_[centre,1]-centre
        report['centreEastShiftMetres']=float(delta[0]*40);report['centreSouthShiftMetres']=float(delta[1]*40)
        report['phaseCorrelation']=[]
        for sigma in [1,3,6]:
            a=normalized.astype('f4')-cv2.GaussianBlur(normalized.astype('f4'),(0,0),sigma)
            b=reference.astype('f4')-cv2.GaussianBlur(reference.astype('f4'),(0,0),sigma)
            a[~valid]=0;b[~valid]=0
            shift,response=cv2.phaseCorrelate(a,b,cv2.createHanningWindow((n,n),cv2.CV_32F))
            report['phaseCorrelation'].append({'highPassSigmaPixels':sigma,'eastShiftMetres':shift[0]*40,'southShiftMetres':shift[1]*40,'response':response})
        # Numerical feature offsets after correction are evaluated using held-out
        # matches; withheld matches within the stated gate are counted explicitly.
        report['heldoutMedianResidualMetres']=report['heldoutMedianResidualPixels']*40
        report['heldoutP95ResidualMetres']=report['heldoutP95ResidualPixels']*40
        cv2.imwrite(str(CACHE/f'{name}-before.jpg'),normalized)
        cv2.imwrite(str(CACHE/f'{name}-registered.jpg'),cv2.warpAffine(normalized,matrix,(n,n),flags=cv2.INTER_NEAREST))
        reports.append(report)
    ir=reports[1]
    accepted=ir['trainInliers']>=20 and ir['heldoutWithin2Pixels']>=10 and ir['heldoutMedianResidualPixels']<1 and ir['heldoutP95ResidualPixels']<2
    agreement=np.hypot(ir['centreEastShiftMetres']-reports[0]['centreEastShiftMetres'],ir['centreSouthShiftMetres']-reports[0]['centreSouthShiftMetres'])
    accepted=accepted and agreement<40
    result={'checkedAt':'2026-11-12','type':'relative-image-registration','sourceProduct':'HRL000040FF_07_SU183J_MTR3','reference':'NASA HiRISE ortho overview, shared regional georeference','referenceSha256':hashlib.sha256(hirise.read_bytes()).hexdigest(),'outputGridSpacingMetres':40,'method':'SIFT ratio 0.7 with unique reference matches; seeded 75% training, 25% held out; similarity model, RANSAC 2-pixel gate. Independent high-pass phase correlation at three scales. IR R1330 model selected; R770 verifies its shift.','acceptance':'At least 20 training inliers, 10 held-out matches within 2 pixels, gated holdout median <1 pixel and P95 <2 pixels; visible/IR centre-shift agreement <40 m. These are image-registration criteria, not EVA safety or absolute survey limits.','accepted':bool(accepted),'visibleVsInfraredCentreShiftDifferenceMetres':float(agreement),'sourceRegionalPixelsToReferencePixels':ir['matrix'] if accepted else None,'bands':reports,'limits':['Feature residuals describe matched image structure, not per-pixel mineral confidence.','Held-out statistics exclude explicitly counted >2-pixel outliers; both counts are reported.','No independent absolute survey control is available.','Registration uses no mineral classification, marker positions or fitted terrain-height offsets.']}
    Path('../docs/mineral-registration-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':run()
