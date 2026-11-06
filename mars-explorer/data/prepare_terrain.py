"""Prepare the 500 m Jezero sector and measured CTX horizon from source rasters."""
import argparse
import base64
import json
import math
import re
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "assets"
CENTER = (18.4900, 77.4198)
DTM_ID = "DTEEC_045994_1985_046060_1985_U01"
DTM_PAGE = "https://www.uahirise.org/dtm/ESP_045994_1985"
CTX_URL = "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif"
ZONE_SIZE = 500


def read_label(path):
    return path.read_bytes().split(b"END_OBJECT = VIEWING_PARAMETERS")[0].decode("ascii", errors="ignore")


def pds_number(label, key):
    match = re.search(rf"^\s*{re.escape(key)}\s*=\s*([-+\d.]+)", label, re.M)
    if not match:
        raise ValueError(f"Missing {key}")
    return float(match[1])


class PdsProjection:
    def __init__(self, label):
        self.scale = pds_number(label, "MAP_SCALE")
        self.radius = pds_number(label, "A_AXIS_RADIUS") * 1000
        self.parallel = pds_number(label, "CENTER_LATITUDE")
        self.meridian = pds_number(label, "CENTER_LONGITUDE")
        self.line_offset = pds_number(label, "LINE_PROJECTION_OFFSET")
        self.sample_offset = pds_number(label, "SAMPLE_PROJECTION_OFFSET")

    def pixels(self, lat, lon):
        east = self.radius * math.cos(math.radians(self.parallel)) * np.deg2rad(lon-self.meridian)
        north = self.radius * np.deg2rad(lat)
        return (self.sample_offset+east/self.scale, self.line_offset-north/self.scale)


def interpolate(array, x, y, *, allow_missing=False):
    good = (x >= 0) & (y >= 0) & (x < array.shape[1]-1) & (y < array.shape[0]-1)
    x = np.clip(x, 0, array.shape[1]-1.0001)
    y = np.clip(y, 0, array.shape[0]-1.0001)
    i, j = x.astype(int), y.astype(int)
    u, v = x-i, y-j
    with np.errstate(invalid="ignore", over="ignore"):
        result = ((1-u)*(1-v)*array[j,i] + u*(1-v)*array[j,i+1]
                  + (1-u)*v*array[j+1,i] + u*v*array[j+1,i+1])
    if not allow_missing and not np.all(good & np.isfinite(result) & (np.abs(result) < 100_000)):
        raise ValueError("Requested extent falls outside valid raster coverage")
    return result


with tifffile.TiffFile(DATA / "ctx-header.tif") as tif:
    page = tif.pages[0]
    ctx_tags = page.geotiff_tags
    ctx_shape = page.shape
    ctx_dtype = page.dtype.newbyteorder(tif.byteorder)
ctx_start = 2275
ctx = np.fromfile(DATA / 'ctx-rows-2275-2469.bin', dtype=ctx_dtype)
if ctx.size != 195*ctx_shape[1]:
    raise ValueError('Incomplete CTX row subset')
ctx = ctx.reshape(195, ctx_shape[1])


def latlon(lat, lon, east, south, radius=3396190):
    return lat-np.rad2deg(south/radius), lon+np.rad2deg(east/(radius*math.cos(math.radians(lat))))


def sample_ctx(lat, lon):
    x = 3396190 * math.cos(math.radians(ctx_tags["ProjStdParallel1GeoKey"])) * np.deg2rad(lon)
    y = 3396190 * np.deg2rad(lat)
    _, _, _, x0, y0, _ = ctx_tags["ModelTiepoint"]
    return interpolate(ctx, (x-x0)/20-.5, (y0-y)/20-.5-ctx_start)


def sample_hirise(lat, lon):
    label = read_label(DATA / "hirise-header.bin")
    proj = PdsProjection(label)
    nx = int(pds_number(label, "LINE_SAMPLES"))
    row_bytes = int(pds_number(label, "RECORD_BYTES"))
    if nx * 4 != row_bytes or "SAMPLE_TYPE      = PC_REAL" not in label:
        raise ValueError("Unexpected source row encoding")
    chunk = np.fromfile(DATA / "hirise-rows-2900-4000.bin", dtype="<f4")
    if chunk.size != nx*1101:
        raise ValueError("Incomplete HiRISE row subset")
    x, y = proj.pixels(lat, lon)
    return interpolate(chunk.reshape((1101, nx)), x, y-2900), proj


def sample_ortho(lat, lon):
    candidates=[DATA / name for name in ("hirise-ortho-complete.jp2","hirise-ortho.jp2")]
    path=next((p for p in candidates if p.is_file() and p.stat().st_size==33534820),None)
    if path is None: return None
    proj = PdsProjection(read_label(DATA / "hirise-ortho.lbl"))
    with Image.open(path) as image:
        x, y = proj.pixels(lat, lon)
        left, top = max(0,int(x.min())-2), max(0,int(y.min())-2)
        right,bottom=min(image.width,int(x.max())+3),min(image.height,int(y.max())+3)
        crop=image.crop((left,top,right,bottom)).convert("L")
        values=interpolate(np.asarray(crop), x-left, y-top)
        if np.any(values<=0):
            raise ValueError("Ortho crop includes missing pixels")
        low, high=np.percentile(values,[3,97])
        tone=np.clip((values-low)/max(1,high-low),0,1)*.72+.16
        return tone


def simplify_traverse(lat, lon):
    path = DATA / "perseverance-traverse.geojson"
    if not path.exists() or path.stat().st_size < 20:
        return []
    raw=json.loads(path.read_text(encoding="utf-8-sig"))
    paths=[]
    for feature in raw.get("features",[]):
        geo=feature.get("geometry") or {}
        if geo.get("type") == "LineString":
            paths.append(geo["coordinates"])
        elif geo.get("type") == "MultiLineString":
            paths.extend(geo["coordinates"])
    clipped=[]
    for line in paths:
        current=[]
        for coord in line:
            x=math.radians(coord[0]-lon)*3396190*math.cos(math.radians(lat))
            z=math.radians(lat-coord[1])*3396190
            if max(abs(x),abs(z))<=250:
                point=[round(x,2),round(z,2)]
                if not current or math.dist(point,current[-1])>=2: current.append(point)
            else:
                if len(current)>1: clipped.append(current)
                current=[]
        if len(current)>1: clipped.append(current)
    return clipped


def prepare(require_hirise):
    preferred = DATA / "hirise-zone-sampled-201.npz"
    sampled_path = preferred if preferred.is_file() else DATA / "hirise-zone-sampled.npz"
    n = 201 if require_hirise and preferred.is_file() else 101
    east,south=np.meshgrid(np.linspace(-250,250,n),np.linspace(-250,250,n))
    best=None
    if require_hirise and sampled_path.is_file():
        sampled=np.load(sampled_path)
        measured=sampled["heights"]
        if measured.shape != (n,n) or not np.all(np.isfinite(measured)&(np.abs(measured)<100000)):
            raise ValueError("Invalid HiRISE sampled grid")
        projection=PdsProjection(read_label(DATA / "hirise-header.bin"))
        best=(float("inf"),float(sampled["lat"]),float(sampled["lon"]),measured,projection)
    # The candidates remain within the same Western Delta neighborhood.
    for off_lat,off_lon in [(0,0),(.001,0),(0,.003),(-.001,.002),(.001,-.002),(-.002,-.003),(.002,.005)]:
        if best is not None and math.isinf(best[0]): break
        lat,lon=CENTER[0]+off_lat,CENTER[1]+off_lon
        ys,xs=latlon(lat,lon,east,south)
        if require_hirise:
            try: raw, projection=sample_hirise(ys,xs)
            except ValueError: continue
        else:
            raw,projection=sample_ctx(ys,xs),None
        grade=np.hypot(*np.gradient(raw,ZONE_SIZE/(n-1)))
        walkable=np.mean(grade<.45)
        if walkable<.78: continue
        # Prefer a zone with visible relief that still offers connected routes.
        score=float(np.ptp(raw))*(.68+.32*walkable)
        if best is None or score>best[0]:
            best=(score,lat,lon,raw,projection)
    if best is None: raise ValueError("No candidate with continuous elevation coverage")
    _,lat,lon,raw,projection=best
    ys,xs=latlon(lat,lon,east,south)
    offset=round(float(np.median(raw)),2)
    big_n=121
    e2,s2=np.meshgrid(np.linspace(-1500,1500,big_n),np.linspace(-1500,1500,big_n))
    cy,cx=latlon(lat,lon,e2,s2)
    context=sample_ctx(cy,cx)-offset
    source="USGS / JPL Mars 2020 Science Investigation CTX DEM"
    surface="Procedural surface color and rocks over measured CTX elevations."
    ortho=None
    if require_hirise:
        source="NASA / JPL / UArizona HiRISE "+DTM_ID
        try: ortho=sample_ortho(ys,xs)
        except (OSError,ValueError): pass
        surface="Registered HiRISE red-channel brightness with a stylized Mars palette. Boulders are procedural." if ortho is not None else "Procedural surface color and rocks over measured HiRISE elevations."
    result={
        "center":{"lat":lat,"lon":lon},"size":ZONE_SIZE,"count":n,
        "heights":np.round(raw-offset,3).flatten().tolist(),
        "sourceResolution":projection.scale if projection else 20,
        "product":source,"productUrl":DTM_PAGE if projection else CTX_URL,
        "sampling":f"Nearest source pixel at each {ZONE_SIZE/(n-1):g} m node" if require_hirise else "Bilinear resampling of 20 m CTX raster","datumOffset":offset,"datum":"Mars 2000 equipotential surface (areoid).",
        "surface":surface,"context":{"size":3000,"count":big_n,"heights":np.round(context,2).flatten().tolist()},
        "projection":{"type":"Equirectangular","radiusM":projection.radius,"standardParallel":projection.parallel,"centralMeridian":projection.meridian,"lineOffsetPx":projection.line_offset,"sampleOffsetPx":projection.sample_offset} if projection else {"type":"Equirectangular","radiusM":3396190,"standardParallel":18.4663,"centralMeridian":0},
        "traverse":simplify_traverse(lat,lon),
        "verticalRangeM":[round(float(raw.min()),2),round(float(raw.max()),2)],
    }
    if ortho is not None:
        result["tone"]=np.round(ortho,3).flatten().tolist()
        axis=np.linspace(-250,250,512)
        tex_e,tex_s=np.meshgrid(axis,axis)
        tex_lat,tex_lon=latlon(lat,lon,tex_e,tex_s)
        registered=sample_ortho(tex_lat,tex_lon)
        texture=np.round(registered*255).astype(np.uint8)
        result["texture"]={"size":512,"gray":base64.b64encode(texture.tobytes()).decode("ascii")}
        palette=np.array([[[74,30,16]]])+registered[:,:,None]*np.array([[[135,71,43]]])
        Image.fromarray(np.clip(palette,0,255).astype(np.uint8)).save(OUT / "jezero-ortho-crop.png")
    (OUT / "terrain.json").write_text(json.dumps(result,separators=(",",":")),encoding="utf-8")
    print(json.dumps({k:result[k] for k in ["product","center","surface","verticalRangeM"]}))
    print("Traverse segments in zone:", len(result["traverse"]))


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hirise",action="store_true",help="Require the verified HiRISE subset")
    prepare(parser.parse_args().hirise)
