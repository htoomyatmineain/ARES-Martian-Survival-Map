"""One evidence-based integrity check for the scoped deliverables; no app tests."""
import datetime, hashlib, json, math, subprocess
from pathlib import Path
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(path.read_text(encoding='utf-8'))
catalog=read(BASE/'photos/photo-catalog.json')['photos']
sites={s['id']:s for s in read(ROOT/'mars-explorer-web/src/data/science-sites.json')}
assert len(catalog)==2 and len({p['imageId'] for p in catalog})==2
for p in catalog:
    assert p['siteId'] in sites and p['acquiredUtc'] is None
    path=ROOT/p['thumbnailPath']
    assert path.is_file() and path.stat().st_size==p['thumbnailBytes'] and sha(path)==p['thumbnailSha256']
    assert p['credit'] and p['associationReason'] and p['evidenceUrls']
assert not (BASE/'geology/geology-local.json').exists()
sources=read(BASE/'evidence/retrieval-manifest.json')
cache_path=BASE/'evidence/source-validation.json'
cache=read(cache_path) if cache_path.exists() else {}
for source in sources:
    if source.get('status')!=200:continue
    path=BASE/source['path'];key=source['sha256']
    if key not in cache:
        assert path.stat().st_size==source['bytes'] and sha(path)==key
        cache[key]={'path':source['path'],'bytes':source['bytes'],'sha256':key,'result':'pass','validatedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
cache_path.write_text(json.dumps(cache,indent=2)+'\n',encoding='utf-8')
for path in BASE.rglob('*.json'):
    if 'raw' not in path.relative_to(BASE).parts:read(path)
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=ROOT,text=True).splitlines()
assert all(p.startswith('docs/resource-preparation/teammate/') for p in changed),changed
files=[]
for path in sorted(BASE.rglob('*')):
    relative=path.relative_to(BASE)
    if not path.is_file() or 'raw' in relative.parts or '__pycache__' in relative.parts or path.name=='deliverable-manifest.json':continue
    files.append(dict(path='docs/resource-preparation/teammate/'+relative.as_posix(),bytes=path.stat().st_size,sha256=sha(path)))
result=dict(schemaVersion=1,validatedUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),checks=dict(jsonParses=True,thumbnailPathsBytesHashes=True,siteIds=True,uniquePhotos=True,unknownUtcPreserved=True,originalSourcesValidatedOnce=True,scopedTrackedChanges=True,noUnverifiedGeologyClip=True),files=files,totalDeliverableBytesExcludingThisManifest=sum(f['bytes'] for f in files),totalThumbnailBytes=sum(p['thumbnailBytes'] for p in catalog))
(BASE/'deliverable-manifest.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':'pass','files':len(files),'assetBytes':result['totalThumbnailBytes'],'deliverableBytesExcludingManifest':result['totalDeliverableBytesExcludingThisManifest']}))
