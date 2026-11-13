"""Prepare small time-matched MEDA weather records; no interpolation or cloud writes.
Run from mars-explorer-web. --download retrieves original NASA/PDS files only.
"""
import argparse,bisect,csv,hashlib,io,json,math,re,subprocess,xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone
BASE='https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda'
CACHE=Path('scripts/.cache/environment');NS={'p':'http://pds.nasa.gov/pds4/pds/v1'}
def fetch(url,path,download,force=False):
 if not path.exists() or force:
  if not download:raise FileNotFoundError(path)
  temporary=path.with_name(path.name+'.part')
  subprocess.run(['curl.exe','--fail','--silent','--show-error','--location','--retry','1','--connect-timeout','20','--max-time','90','--output',str(temporary),url],check=True)
  temporary.replace(path)
 return path.read_bytes()
def inventory(sol,level,download):
 url=f'{BASE}/data_{level}_env/sol_0420_0539/sol_{sol:04d}/'
 path=CACHE/f'historical-weather-{sol}-{level}-index.html';content=fetch(url,path,download)
 return url,re.findall(r'href="([^"/]+\.(?:CSV|xml))"',content.decode()),{'url':url,'file':path.name,'sha256':hashlib.sha256(content).hexdigest()}
def product(url,stem,download):
 label=fetch(url+stem+'.xml',CACHE/(stem+'.xml'),download);root=ET.fromstring(label)
 content=fetch(url+stem+'.CSV',CACHE/(stem+'.CSV'),download)
 expected=root.find('.//p:File/p:md5_checksum',NS).text;size=int(root.find('.//p:File/p:file_size',NS).text)
 if (len(content)!=size or hashlib.md5(content).hexdigest()!=expected) and download:content=fetch(url+stem+'.CSV',CACHE/(stem+'.CSV'),download,force=True)
 if len(content)!=size or hashlib.md5(content).hexdigest()!=expected:raise ValueError('NASA checksum/size mismatch: '+stem)
 rows=list(csv.DictReader(io.StringIO(content.decode('utf-8-sig'))))
 assert len(rows)==int(root.find('.//p:Table_Delimited/p:records',NS).text)
 fields={}
 for field in root.findall('.//p:Field_Delimited',NS):
  fields[field.find('p:name',NS).text]={key:field.find('p:'+key,NS).text if field.find('p:'+key,NS) is not None else None for key in ['unit','description']}
 return rows,{'file':stem+'.CSV','url':url+stem+'.CSV','labelUrl':url+stem+'.xml','bytes':size,'records':len(rows),'sha256':hashlib.sha256(content).hexdigest(),'md5':expected,'labelSha256':hashlib.sha256(label).hexdigest(),'utcStart':root.find('.//p:Time_Coordinates/p:start_date_time',NS).text,'utcEnd':root.find('.//p:Time_Coordinates/p:stop_date_time',NS).text,'fields':fields}
def retrieve(download):
 CACHE.mkdir(parents=True,exist_ok=True);products={};indices=[];availability=[]
 for sol in [477,502]:
  found={}
  for level in ['calibrated','derived']:
   url,names,evidence=inventory(sol,level,download);indices.append(evidence);found[level]=(url,names)
  for kind,level,sensor in [('air','calibrated','ATS'),('pressure','derived','PS')]:
   url,names=found[level];prefix=f'WE__{sol:04d}___________'+('CAL_' if level=='calibrated' else 'DER_')+sensor
   candidates=[n[:-4] for n in names if n.startswith(prefix+'_') and n.endswith('.CSV')]
   if len(candidates)!=1:raise ValueError(f'Expected one reviewed {sol} {kind} product; got {candidates}')
   products[f'{sol}-{kind}']=product(url,candidates[0],download)
  wind=[n for url,names in found.values() for n in names if n.endswith('.CSV') and re.search(r'_(?:WS|WIND)_',n)]
  availability.append({'sol':sol,'windProducts':wind,'status':'No wind product listed in the checked calibrated/derived sol directories.' if not wind else 'Wind product requires separate field/quality review.'})
 manifest={'checkedUtc':datetime.now(timezone.utc).isoformat(),'indices':indices,'windAvailability':availability,'products':{k:v[1] for k,v in products.items()}}
 (CACHE/'historical-weather-source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 return products,manifest
def numeric(row,key):
 try:
  value=float(row[key]);return value if math.isfinite(value) else None
 except (KeyError,TypeError,ValueError):return None
def nearest(rows,clock,tolerance=30):
 clocks=[numeric(r,'SCLK') for r in rows]
 if any(c is None for c in clocks) or clocks!=sorted(clocks):raise ValueError('Invalid/unsorted source clocks')
 def match(target):
  index=bisect.bisect_left(clocks,target);candidates=[i for i in [index-1,index] if 0<=i<len(rows)]
  i=min(candidates,key=lambda j:abs(clocks[j]-target))
  return (rows[i],i+2) if abs(clocks[i]-target)<=tolerance else (None,None)
 return match(clock)
def build(products,manifest):
 thermal=json.loads(Path('src/data/thermal-observations.json').read_text());records=[];summary={}
 places=list(csv.DictReader(io.StringIO(Path('../docs/elevation-validation-sources/best_tactical.csv').read_text())))
 positions={}
 for sol in [477,502]:
  anc=list(csv.DictReader(io.StringIO((CACHE/f'WE__{sol:04d}___________DER_ANCILLARY___________P01.CSV').read_text())))
  anchor=next(r for r in places if r['frame']=='ROVER' and int(r['sol'])==sol);origin,_=nearest(anc,float(anchor['sclk']),2)
  if origin is None:raise ValueError('Missing ancillary anchor')
  positions[sol]=(anc,anchor,origin)
 def position(sol,clock):
  anc,anchor,origin=positions[sol];row,_=nearest(anc,clock,2)
  if row is None:return None
  north=float(row['ROVER_POSITION_X'])-float(origin['ROVER_POSITION_X']);east=-(float(row['ROVER_POSITION_Y'])-float(origin['ROVER_POSITION_Y']))
  lat=float(anchor['planetocentric_latitude'])+math.degrees(north/3396190);lon=float(anchor['longitude'])+math.degrees(east/(3396190*math.cos(math.radians(float(anchor['planetocentric_latitude'])))))
  if not (18.375646975709426<=lat<=18.544353024290576 and 77.33107113608344<=lon<=77.50892886391657):return None
  return {'latitude':lat,'longitude':lon,'ancillarySclk':float(row['SCLK']),'positionOffsetSeconds':float(row['SCLK'])-clock,'status':'Approximate same-sol PLACES anchor plus MEDA M2020_TOPO displacement. Not independent geolocation or sensor footprint.'}
 for target in thermal['observations']:
  output={'thermalId':target['id'],'sol':target['sol'],'referenceSclk':target['sclk']}
  for kind in ['air','pressure']:
   rows,source=products[f"{target['sol']}-{kind}"];row,line=nearest(rows,target['sclk'])
   if row is None:
    output[kind]={'available':False,'reason':'No source sample within 30 spacecraft-clock seconds.','sample':None};continue
   sample={'sourceFile':source['file'],'sourceLine':line,'sclk':numeric(row,'SCLK'),'offsetSeconds':numeric(row,'SCLK')-target['sclk'],'lmst':row['LMST'],'ltst':row['LTST'],'qualityFlags':None,'qualityStatus':'Review required: no per-row quality flags supplied in this selected product.'}
   sample['position']=position(target['sol'],sample['sclk'])
   if kind=='air':
    detectors=[]
    for i in range(1,6):
     field=f'ATS_LOCAL_TEMP{i}';value=numeric(row,field);valid=value is not None and 0<value<500
     detectors.append({'sensor':i,'kelvin':value if valid else None,'sourceField':field,'reason':None if valid else 'Missing, nonfinite or outside ingestion sanity bounds.'})
    sample['detectors']=detectors;sample['uncertaintyKelvin']=None
    available=any(d['kelvin'] is not None for d in detectors)
   else:
    value=numeric(row,'PRESSURE');valid=value is not None and 0<value<3000
    sample['pascal']=value if valid else None;sample['transducer']=numeric(row,'TRANSDUCER');sample['sourceUncertaintyValue']=numeric(row,'PRESSURE_UNCERTAINTY');sample['uncertaintyStatus']='Uncertainty not displayed: selected label declares kelvin for pressure uncertainty, a dimensional inconsistency. Raw source value is retained if supplied.'
    available=valid
   output[kind]={'available':available,'reason':None if available else 'No valid physical measurement in the matched source sample.','sample':sample}
  wind=next(w for w in manifest['windAvailability'] if w['sol']==target['sol'])
  output['wind']={'available':False,'metresPerSecond':None,'directionDegrees':None,'reason':wind['status']}
  records.append(output)
 for sol in [477,502]:
  subset=[r for r in records if r['sol']==sol];summary[str(sol)]={'records':len(subset),'airAvailable':sum(r['air']['available'] for r in subset),'pressureAvailable':sum(r['pressure']['available'] for r in subset),'windAvailable':0}
 result={'version':1,'title':'Historical Jezero environmental observations','timeMatchToleranceSeconds':30,'selection':'Actual air/pressure samples nearest the existing hourly-selected ground-temperature observations, within 30 spacecraft-clock seconds. Individual source times are retained; samples are not necessarily simultaneous. No interpolation, averaging, model or zone-wide extrapolation.','spatialCoverage':'Approximate recorded rover positions only. Marker uses the selected ground-observation reference position; individual air/pressure positions are supplied where ancillary timing permits. Not conditions at the simulated astronaut, habitat or entire route.','airInterpretation':'Calibrated local detector temperatures, not a model-corrected ambient air estimate. Rover heating, illumination and sensor placement can affect representativeness. No detector average or best-detector rule is invented.','pressureUncertaintyNote':'Selected DER_PS labels declare kelvin for PRESSURE UNCERTAINTY. Preserve this inconsistency; do not convert it into a made-up Pa uncertainty.','qualityNote':'Products supply no per-row quality flags for these selected variables. Review required is retained, not a passed-quality or EVA-safety claim. Numerical ingestion bounds are not astronaut limits.','sources':list(manifest['products'].values()),'windAvailability':manifest['windAvailability'],'summary':summary,'observations':records}
 data=json.dumps(result,indent=2,allow_nan=False)+'\n';Path('src/data/historical-weather.json').write_text(data)
 docs=Path('../docs/historical-weather');docs.mkdir(exist_ok=True)
 docs.joinpath('source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'records':len(records),'bytes':len(data.encode()),'summary':summary},indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args();products,manifest=retrieve(args.download)
 build(products,manifest)
