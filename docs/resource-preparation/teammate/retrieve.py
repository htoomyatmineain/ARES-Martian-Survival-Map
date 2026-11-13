"""Cached retrieval: successful unchanged URLs are reused; no automatic retries."""
import urllib.request, urllib.error, hashlib, json, datetime, sys
from pathlib import Path
BASE=Path(__file__).resolve().parent
MANIFEST=BASE/'evidence'/'retrieval-manifest.json'
def fetch(url,name):
    records=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else []
    old=next((r for r in records if r['requestedUrl']==url and r.get('status')==200),None)
    if old and (BASE/old['path']).exists(): return BASE/old['path']
    record={'requestedUrl':url,'retrievedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    target=BASE/'raw'/name; target.parent.mkdir(parents=True,exist_ok=True)
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MartianMap-ResourcePreparation/1.0'}),timeout=20) as r:
            if int(r.headers.get('Content-Length','0'))>80000000: raise ValueError('80 MB source limit exceeded before download')
            data=r.read(80000001)
            if len(data)>80000000: raise ValueError('80 MB source limit exceeded')
            target.write_bytes(data)
            record.update(status=r.status,finalUrl=r.url,originalFilename=r.url.split('/')[-1].split('?')[0],path=target.relative_to(BASE).as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),contentType=r.headers.get('Content-Type'),etag=r.headers.get('ETag'),lastModified=r.headers.get('Last-Modified'))
    except Exception as e: record.update(status=getattr(e,'code',None),error=str(e))
    records.append(record); MANIFEST.write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
    print(name,record.get('status'),record.get('bytes'),record.get('error',''))
    return target if record.get('status')==200 else None
if __name__=='__main__': fetch(sys.argv[1],sys.argv[2])
