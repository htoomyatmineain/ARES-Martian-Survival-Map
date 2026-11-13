"""Cache the official reference PDF via HTTP byte ranges, then extract relevant pages."""
import io, urllib.request, hashlib, json, datetime
from pathlib import Path
from pypdf import PdfReader
B=Path(__file__).resolve().parent
URL='https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/initial_reports/initial_reports_volume2.pdf'
class Remote(io.RawIOBase):
 def __init__(self): self.pos=0; self.size=104818942; self.block=262144; self.logs=[]
 def readable(self):return True
 def seekable(self):return True
 def tell(self):return self.pos
 def seek(self,o,w=0):
  self.pos= o if w==0 else self.pos+o if w==1 else self.size+o
  return self.pos
 def read(self,n=-1):
  if n<0:n=self.size-self.pos
  out=bytearray()
  while n>0 and self.pos<self.size:
   start=self.pos//self.block*self.block;end=min(start+self.block,self.size)-1
   path=B/'raw'/'report-ranges'/str(start);path.parent.mkdir(exist_ok=True)
   if path.exists():data=path.read_bytes()
   else:
    req=urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}'})
    with urllib.request.urlopen(req,timeout=40) as r:
     assert r.status==206 and r.headers['Content-Range']==f'bytes {start}-{end}/{self.size}'
     data=r.read();assert len(data)==end-start+1
    path.write_bytes(data)
   if not any(x['start']==start for x in self.logs):self.logs.append({'start':start,'end':end,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
   take=min(n,len(data)-(self.pos-start));out.extend(data[self.pos-start:self.pos-start+take]);self.pos+=take;n-=take
  return bytes(out)
from concurrent.futures import ThreadPoolExecutor
r=Remote()
def fill(start):
 rr=Remote();rr.seek(start);rr.read(min(rr.block,rr.size-start))
starts=[s for s in range(0,r.size,r.block) if not (B/'raw'/'report-ranges'/str(s)).exists()]
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fill,starts))
full=B/'raw'/'initial_reports_volume2.pdf'
with full.open('wb') as out:
 for start in range(0,r.size,r.block):out.write((B/'raw'/'report-ranges'/str(start)).read_bytes())
print('Reference PDF cached',full.stat().st_size,flush=True)
pdf=PdfReader(full)
def get_page(index):
 node=pdf.trailer['/Root']['/Pages'].get_object()
 while '/Kids' in node:
  for ref in node['/Kids']:
   child=ref.get_object(); count=child.get('/Count',1)
   if index<count:node=child;break
   index-=count
  else:raise IndexError(index)
 from pypdf import PageObject
 page=PageObject(pdf=pdf);page.update(node);return page
texts=[]
for i in [19,20,51,57,62,63]:
 text=get_page(i).extract_text();texts.append({'pdfPage':i+1,'text':text});print('Read PDF page',i+1,flush=True)
(B/'evidence'/'report-entries.json').write_text(json.dumps({'url':URL,'retrievedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'totalSourceBytes':r.size,'fullSourceSha256':hashlib.sha256(full.read_bytes()).hexdigest(),'note':'Full reference PDF reconstructed from HTTP ranges and kept ignored. Text extracts are preliminary report evidence.','pages':texts,'originalFilename':'initial_reports_volume2.pdf','rangeBytesCached':sum(f.stat().st_size for f in (B/'raw/report-ranges').iterdir()),'rangeRetrievalNote':'Interrupted range reads were resumed using existing cached blocks. One TLS EOF failure was retried with fewer concurrent connections. No TLS verification was disabled.','ranges':r.logs},indent=2),encoding='utf-8')
