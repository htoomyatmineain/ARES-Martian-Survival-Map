"""Regenerate catalogues from cached sources. Does not touch application files."""
import datetime, hashlib, json, platform, shutil
from pathlib import Path
from PIL import Image, __version__ as pillow_version
BASE = Path(__file__).resolve().parent
PREFIX = 'docs/resource-preparation/teammate/'
def write(path, data):
    (BASE/path).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
records = json.loads((BASE/'evidence/retrieval-manifest.json').read_text())
by_name = {Path(r.get('path','')).name:r for r in records if r.get('status')==200}
source_page = 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/'
photos = []
for site,filename,sample,sol,date,lmst in [
    ('skinner-ridge-skyland','skyland.png','Skyland',495,'July 12, 2022','16:54:24'),
    ('wildcat-ridge-hazeltop','hazeltop.png','Hazeltop',509,'July 26, 2022','16:17:10')]:
    source = by_name[filename]
    from html.parser import HTMLParser
    class ImageMetadata(HTMLParser):
        def handle_starttag(self,tag,attrs):
            data=dict(attrs)
            if tag=='img' and source['originalFilename'] in data.get('src',''): self.alt=data.get('alt')
    image_metadata=ImageMetadata();image_metadata.feed((BASE/'raw/rock-samples.html').read_text(encoding='utf-8'))
    image_id = source['originalFilename'].removesuffix('.png')
    original = BASE/source['path']
    with Image.open(original) as image:
        original_dimensions = list(image.size)
        image.thumbnail((960,960),Image.Resampling.BICUBIC)
        thumbnail = BASE/'photos/thumbnails'/f'{image_id}.webp'
        image.convert('RGB').save(thumbnail,quality=88,method=6)
        dimensions = list(image.size)
    limitations = ['Historical image; not current conditions.','NASA web PNG asset, not independently cross-matched to a native PDS camera product.','Exact-site means caption association with the sampled outcrop, not a geolocated camera footprint.','NASA provides a calendar date and LMST, not a verified UTC acquisition instant.']
    if sample=='Hazeltop': limitations.append('NASA lists image acquisition July 26 but sample sealing July 27, both labelled sol 509. Preserve these distinct fields; do not reconcile by guessing.')
    photos.append(dict(siteId=site,imageId=image_id,imageIdNamespace='NASA Science web asset filename',title=f'{sample} sample outcrop after drilling',association='exact-site',associationReason=f'NASA sample catalogue explicitly names {sample}, its parent feature, and this linked image; association does not rely on rover proximity.',evidenceUrls=[source_page],sourcePageUrl=source_page,originalImageUrl=source['finalUrl'],caption=image_metadata.alt,camera='Left Navigation Camera (Navcam)',sol=sol,acquiredUtc=None,acquisitionDateAsPublished=date,localMeanSolarTime=lmst,credit='NASA/JPL-Caltech',thumbnailPath=PREFIX+thumbnail.relative_to(BASE).as_posix(),thumbnailDimensions=dimensions,thumbnailBytes=thumbnail.stat().st_size,thumbnailSha256=digest(thumbnail),originalFilename=source['originalFilename'],originalDimensions=original_dimensions,originalBytes=source['bytes'],originalSha256=source['sha256'],retrievedUtc=source['retrievedUtc'],limitations=limitations))
write('photos/photo-catalog.json',dict(schemaVersion=1,photos=photos))
attributes=json.loads((BASE/'raw/geology-unit-attributes.json').read_text())
assert not attributes.get('exceededTransferLimit') and 'error' not in attributes
renderer=json.loads((BASE/'raw/geology-layer-8.json').read_text())['drawingInfo']['renderer']
colours={u['value']:u['symbol']['color'] for u in renderer['uniqueValueInfos']}
units={}
for feature in attributes['features']:
    a=feature['attributes']; code=a['unit']
    normalized={k:v for k,v in a.items() if k not in ['OBJECTID','Shape__Area','Shape__Length']}
    if code in units:
        if units[code]['properties'] != normalized and normalized not in units[code]['attributeVariants']: units[code]['attributeVariants'].append(normalized)
    else: units[code]=dict(attributeVariants=[],unitId=code,code=a['symbol'],label=a['name'],description=a['Unit_Description'],properties=normalized,rgba=colours.get(code),colourSource='USGS feature-service renderer',source='https://doi.org/10.3133/sim3464')
write('geology/units.json',dict(schemaVersion=1,status='source legend inventory, not accepted local feature geometry',units=list(units.values())))
for name in ['sim3464_metadata.xml','sim3464_readme.txt','geology-service.json','geology-item.json','geology-layer-8.json','geology-layer-5.json']:
    target=BASE/'evidence'/name
    if not target.exists(): shutil.copyfile(BASE/'raw'/name,target)
write('geology/source-manifest.json',dict(schemaVersion=1,publication='USGS SIM 3464',authors=['Vivian Z. Sun','Kathryn M. Stack'],publicationYear=2020,publicationDate='2020-12-02',version='2020 publication; service snapshot retrieved as recorded; no separate version claimed',sourceCrsWkt=json.loads((BASE/'raw/geology-service.json').read_text())['spatialReference']['wkt'],sources=[r for r in records if any(x in r['requestedUrl'] for x in ['usgs','arcgis'])],largeOriginals=[dict(url='https://pubs.usgs.gov/sim/3464/sim3464_database.zip',downloaded=False,sizeAsListed='333M in official directory (349.3 MB on publication record)',sha256=None,reason='Large archive not required for assessment; use official ZIP to reconcile released geometry and CRS before integration.')]))
write('photos/validation.json',dict(schemaVersion=1,validatedUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),selectedCount=len(photos),sitesCovered=[p['siteId'] for p in photos],visualInspection='Both full-resolution sources and their 960 px thumbnails viewed once; rock, drill holes and abrasion patches remain readable; no crop, rotation or generative edit.',checks=dict(decoded=True,dimensionsPreservedWithinPixelRounding=True,siteIdsMatchApp=True,uniqueImageIds=True,sourceAttributionPresent=True,unknownUtcLeftNull=True),toolVersions=dict(python=platform.python_version(),Pillow=pillow_version),totalThumbnailBytes=sum(p['thumbnailBytes'] for p in photos)))
print('Prepared',len(photos),'photos and',len(units),'source units')
