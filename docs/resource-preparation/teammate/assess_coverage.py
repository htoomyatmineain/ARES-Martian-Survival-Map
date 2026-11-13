"""Conditional coverage assessment, not an accepted app transformation or clip."""
import json, math, sys
from pathlib import Path
BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / 'raw/python-libs'))
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import explain_validity

def polygon(geometry):
    shells, holes = [], []
    for ring in geometry['rings']:
        area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]))/2
        (shells if area < 0 else holes).append(ring)
    return MultiPolygon([Polygon(s, [h for h in holes if Polygon(s).covers(Polygon(h).representative_point())]) for s in shells])

if __name__ == '__main__':
    from retrieve import fetch
    from urllib.parse import urlencode
    service = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer'
    source = CRS.from_wkt(json.loads((BASE/'raw/geology-service.json').read_text())['spatialReference']['wkt'])
    forward = Transformer.from_crs(source.geodetic_crs, source, always_xy=True)
    corners = [forward.transform(77.42+math.degrees(x/(3396190*math.cos(math.radians(18.46)))),18.46-math.degrees(z/3396190)) for x,z in [(-5000,-5000),(5000,-5000),(5000,5000),(-5000,5000)]]
    zone = Polygon(corners)
    extent = [zone.bounds[0]-10,zone.bounds[1]-10,zone.bounds[2]+10,zone.bounds[3]+10]
    results = {}
    for layer,label in [(0,'boundary'),(8,'units'),(5,'contacts')]:
        params = dict(f='json',geometry=','.join(map(str,extent)),geometryType='esriGeometryEnvelope',spatialRel='esriSpatialRelIntersects',outFields='*',returnGeometry='true')
        path = BASE/f'raw/geology-zone-{label}.json'
        if not path.exists(): fetch(f'{service}/{layer}/query?'+urlencode(params),path.name)
        data = json.loads(path.read_text())
        assert 'error' not in data and not data.get('exceededTransferLimit')
        if label == 'contacts':
            results[label] = dict(sourceFeatures=len(data['features']),contactTypes=sorted({f['attributes']['TYPE'] for f in data['features']}))
            continue
        geometries = [polygon(f['geometry']) for f in data['features']]
        invalid = [dict(index=i,reason=explain_validity(g)) for i,g in enumerate(geometries) if not g.is_valid]
        union = unary_union(geometries) if not invalid else None
        results[label] = dict(sourceFeatures=len(geometries),invalidGeometry=invalid,coverageFractionInReleasedGisFrame=union.intersection(zone).area/zone.area if union else None,uncoveredSquareMetresInSourceProjection=zone.difference(union).area if union else None,unitCodes=sorted({str(f['attributes']['unit']) for f in data['features']}) if label=='units' else None)
    results['limitations'] = ['Assessment in declared service CRS only; no app clip or absolute registration accepted. Footprint edges approximated by four projected corners; coverage is conditional, not geographic accuracy.','Pamphlet 77.3 E versus released GIS 77.5 E unresolved.','Metadata warns 100-200 m random control offsets.']
    (BASE/'geology/coverage-assessment.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
