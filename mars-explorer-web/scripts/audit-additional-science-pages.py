"""Audit reported coordinates without claiming absolute placement."""
import argparse,json,re,hashlib
from pathlib import Path
from pypdf import PdfReader
p=argparse.ArgumentParser();p.add_argument('--pdf-dir',required=True);args=p.parse_args()
base=Path(args.pdf_dir);rows=json.loads(Path('src/data/additional-science-sites.json').read_text(encoding='utf8'));readers={};reports=[]
for row in rows:
 vol=int(re.search(r'volume(\d)',row['reportUrl']).group(1))
 if vol not in readers:readers[vol]=PdfReader(base/f'initial_reports_volume{vol}.pdf')
 text=readers[vol].pages[row['coordinateReportPage']-1].extract_text()
 line=next((x for x in text.splitlines() if 'Latitude' in x and 'Elevation' in x),'')
 normalized=re.sub(r'(?<=\d)\s+(?=\d)','',line).replace('\u2013','-').replace('\u2212','-')
 nums=re.findall(r'-?\d+\.\d+',normalized)
 match=len(nums)>=2 and abs(float(nums[0])-row['latitude'])<1e-8 and abs(float(nums[1])-row['longitude'])<1e-8
 compact=re.sub(r'\s+','',text).lower()
 reports.append({'siteId':row['id'],'volume':vol,'pdfPage':row['coordinateReportPage'],'coordinateValuesMatch':match,'nameInPage':re.sub(r'\s+','',row['sample']).lower() in compact,'sampleIdInPage':row['id'].lower() in compact,'sourceUrl':row['reportUrl'],'extractionNormalization':'Spaces between digits removed; Unicode dash normalized; numeric coordinates unchanged.'})
assert all(r['coordinateValuesMatch'] and r['nameInPage'] and r['sampleIdInPage'] for r in reports),json.dumps(reports)
out={'schemaVersion':1,'method':'pypdf text extraction from cited coordinate pages of existing local PDF backups; not independent geolocation validation','records':reports,'pdfFiles':[{'volume':v,'file':f'initial_reports_volume{v}.pdf','sha256':hashlib.sha256((base/f'initial_reports_volume{v}.pdf').read_bytes()).hexdigest()} for v in readers],'limitations':['Coordinate-field agreement verified; source convention, datum and independent absolute placement remain unresolved.','Local backup copies used; no Drive/publisher byte-hash comparison performed.']}
Path('../docs/science-catalogues/source-page-validation.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8')
print(json.dumps({'pagesChecked':len(reports),'coordinateMatches':sum(r['coordinateValuesMatch'] for r in reports)}))
