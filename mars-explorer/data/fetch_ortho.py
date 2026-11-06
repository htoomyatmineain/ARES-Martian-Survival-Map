import concurrent.futures as cf, subprocess
from pathlib import Path

folder=Path('data/ortho-parts')
folder.mkdir(exist_ok=True)
url="https://hirise-pds.lpl.arizona.edu/PDS/DTM/ESP/ORB_045900_045999/ESP_045994_1985_ESP_046060_1985/ESP_046060_1985_RED_C_01_ORTHO.JP2"
length=33534820
n=12
def get(i):
    a,b=length*i//n,length*(i+1)//n-1
    out=folder/f'{i:02}.bin'
    for host in ("www.uahirise.org","hirise-pds.lpl.arizona.edu"):
        existing=out.stat().st_size if out.exists() else 0
        if existing==b-a+1: break
        tail=out.with_suffix(".tail")
        subprocess.run(['curl.exe','-fsSL','--connect-timeout','12','--max-time','100','-r',f'{a+existing}-{b}','-o',str(tail),url.replace('hirise-pds.lpl.arizona.edu',host)],check=False)
        if tail.exists() and tail.stat().st_size<=b-a+1-existing:
            with out.open('ab') as output:
                output.write(tail.read_bytes())
        if tail.exists(): tail.unlink()
    if out.stat().st_size!=b-a+1: raise ValueError(f'Incomplete ortho part {i}')
    print('Ortho part',i,'received',flush=True)
    return out
with cf.ThreadPoolExecutor(max_workers=n) as pool:
    paths=list(pool.map(get,range(n)))
with Path('data/hirise-ortho-complete.jp2').open('wb') as fp:
    for p in paths: fp.write(p.read_bytes())
