"""Read-only independent NASA report-map / HiRISE image registration audit."""
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np
import pymupdf as fitz
import rasterio
from rasterio.windows import Window

CACHE=Path('scripts/.cache/science-audit')
PDF=CACHE/'initial_reports_volume2.pdf'


def register(source,reference,seed=20261112):
    sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    kp1,d1=sift.detectAndCompute(source,None);kp2,d2=sift.detectAndCompute(reference,None)
    if d1 is None or d2 is None:return None
    pairs=cv2.BFMatcher().knnMatch(d1,d2,k=2)
    good=[m for m,n in pairs if m.distance<.7*n.distance]
    if len(good)<8:return None
    # Unique reference features avoid duplicate matches inflating evidence.
    unique={}
    for match in sorted(good,key=lambda m:m.distance):
        if match.trainIdx not in unique:unique[match.trainIdx]=match
    good=list(unique.values())
    a=np.array([kp1[m.queryIdx].pt for m in good],np.float32)
    b=np.array([kp2[m.trainIdx].pt for m in good],np.float32)
    rng=np.random.default_rng(seed);order=rng.permutation(len(a));split=int(len(a)*.75)
    train,test=order[:split],order[split:]
    cv2.setRNGSeed(seed)
    matrix,inliers=cv2.estimateAffinePartial2D(a[train],b[train],method=cv2.RANSAC,ransacReprojThreshold=2,maxIters=10000,confidence=.999)
    if matrix is None:return None
    predict=lambda p:p@matrix[:,:2].T+matrix[:,2]
    residual=np.linalg.norm(predict(a[test])-b[test],axis=1)
    heldout=residual<2
    report={'sourceFeatures':len(kp1),'referenceFeatures':len(kp2),'ratioMatchedUniqueFeatures':len(good),'trainMatches':len(train),'trainInliers':int(inliers.sum()),'heldoutMatches':len(test),'heldoutWithin2Pixels':int(heldout.sum()),'heldoutMedianResidualPixels':float(np.median(residual[heldout])) if heldout.any() else None,'heldoutP95ResidualPixels':float(np.quantile(residual[heldout],.95)) if heldout.any() else None,'matrix':matrix.tolist()}
    return matrix,report


def run():
    doc=fitz.open(PDF)
    sites=json.loads(Path('src/data/science-sites.json').read_text())
    coverage=json.loads(Path('src/data/science-site-coverage.json').read_text())
    manifest=json.loads(Path('source-data/Western-Jezero-10km-HiRISE/download-manifest.json').read_text())
    offset=np.array(manifest['products']['imagery']['cropWindow'][:2])
    results=[]
    with rasterio.open('source-data/Western-Jezero-10km-HiRISE/imagery.vrt') as imagery:
        for site,page_index,centre in zip(sites,[19,62],[(2035,2112),(1822,2331)]):
            page=doc[page_index]
            image=doc.extract_image(page.get_images(full=True)[0][0])
            rgb=cv2.imdecode(np.frombuffer(image['image'],np.uint8),cv2.IMREAD_COLOR)
            # Figure map only: exclude report text and caption. The red target is
            # not used as a control point in estimating the terrain-image transform.
            x0,y0,x1,y1=594,980,4506,4020
            crop=rgb[y0:y1,x0:x1]
            factor=.4
            source=cv2.resize(cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY),None,fx=factor,fy=factor,interpolation=cv2.INTER_AREA)
            predicted=coverage['sites'][len(results)]['samples']['imagery']['sourcePixel']
            local=np.array(predicted)-offset
            left,top=local[0]-650,local[1]-550
            reference=imagery.read(1,window=Window(left,top,1300,1300))
            assert reference.dtype==np.uint8
            estimate=register(source,reference)
            if estimate is None:
                results.append({'siteId':site['id'],'status':'No reliable image transform'});continue
            matrix,metrics=estimate
            cx,cy=centre
            red=(rgb[:,:,2]>130)&(rgb[:,:,2]>rgb[:,:,1].astype(float)*1.45)&(rgb[:,:,2]>rgb[:,:,0].astype(float)*1.45)
            yy,xx=np.nonzero(red[max(0,cy-45):cy+45,max(0,cx-45):cx+45])
            assert len(xx)>8
            target=np.array([np.median(xx)+cx-45,np.median(yy)+cy-45])
            mapped=matrix@np.r_[((target-[x0,y0])*factor),1]
            global_pixel=mapped+[left,top]+offset
            source_position=np.array(predicted)+.5
            residual_pixels=global_pixel-source_position
            result={'siteId':site['id'],'reportPdfPage':page_index+1,'reportTargetCentrePixels':target.tolist(),'sourceMarkerPixel':source_position.tolist(),'registeredReportTargetPixel':global_pixel.tolist(),'markerVsReportTargetMetres':float(np.linalg.norm(residual_pixels)*.25),'eastPixelDelta':float(residual_pixels[0]),'southPixelDelta':float(residual_pixels[1]),'registration':metrics,'limits':'Relative image agreement only. Published red-circle location and precision limit the result; not independent survey accuracy.'}
            results.append(result)
            preview=cv2.cvtColor(reference,cv2.COLOR_GRAY2BGR)
            cv2.circle(preview,tuple(np.rint(mapped).astype(int)),10,(0,0,255),2)
            cv2.drawMarker(preview,(int(local[0]-left),int(local[1]-top)),(0,255,255),cv2.MARKER_CROSS,25,2)
            cv2.imwrite(str(CACHE/f'{site["id"]}-registered.jpg'),preview)
    report={'checkedAt':'2026-11-12','sourceUrl':'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/initial_reports/initial_reports_volume2.pdf','pdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'method':'SIFT unique ratio matches; similarity transform fit to seeded 75% controls; remaining 25% held out. Source native HiRISE imagery is never moved.','sites':results}
    Path('../docs/science-registration-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':run()
