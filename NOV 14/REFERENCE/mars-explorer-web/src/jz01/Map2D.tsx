import { useEffect, useRef, useState } from 'react';

type Route = { name:string;points:string;color:string;dashed:boolean };
type MapView = { x:number;y:number;size:number };
const INITIAL:MapView={x:0,y:0,size:550};

/** Original orthomosaic-derived PNG and supplied routes; north is up, meters throughout. */
export default function Map2D({action}:{action:{kind:string;tick:number}}) {
  const svg=useRef<SVGSVGElement>(null),pointer=useRef<{id:number;x:number;y:number}|null>(null);
  const [view,setView]=useState(INITIAL),[routes,setRoutes]=useState<Route[]>([]);
  const [loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    const image=new Image();image.onload=()=>setLoaded(true);image.onerror=()=>setError('Orthomosaic unavailable');
    image.src='/assets/mars/jz01/orthomosaic.png';
    Promise.all([
      ['route_dijkstra.csv','Existing Dijkstra baseline','#ffc185',true],
      ['route_slope_aware_astar.csv','Existing slope-aware A* baseline','#26d9dc',false],
    ].map(async ([file,name,color,dashed])=>{
      const response=await fetch(`/assets/mars/jz01/${file}`,{signal:controller.signal});
      if(!response.ok)throw Error(`Route unavailable: ${file}`);
      const rows=(await response.text()).trim().split(/\r?\n/);rows.shift();
      const points=rows.map(row=>{
        const [east,south]=row.split(',').map(Number);
        if(!Number.isFinite(east+south)||east<0||east>500||south<0||south>500)throw Error('Invalid route coordinates');
        return `${east-250},${south-250}`;
      }).join(' ');
      return {name:String(name),points,color:String(color),dashed:Boolean(dashed)};
    })).then(setRoutes).catch(e=>{if(!controller.signal.aborted)setError(String(e));});
    return()=>{controller.abort();image.onload=null;image.onerror=null;};
  },[]);
  useEffect(()=>{
    if(action.kind==='reset')setView(INITIAL);
    else setView(s=>({...s,size:Math.max(50,Math.min(2500,s.size*(action.kind==='in'?.8:1.25)))}));
  },[action]);
  useEffect(()=>{
    const element=svg.current!;
    const wheel=(e:WheelEvent)=>{
      e.preventDefault();const rect=element.getBoundingClientRect();
      setView(s=>{
        const size=Math.max(50,Math.min(2500,s.size*Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.001)))));
        const units=s.size/Math.min(rect.width,rect.height),ratio=1-size/s.size;
        return {x:s.x+(e.clientX-rect.left-rect.width/2)*units*ratio,y:s.y+(e.clientY-rect.top-rect.height/2)*units*ratio,size};
      });
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[]);
  const release=()=>{pointer.current=null;};
  return <div className="jz01-map" data-ready={loaded&&routes.length===2&&!error}>
    <svg ref={svg} role="img" aria-label="JZ-01 orthomosaic with existing verified routes"
      viewBox={`${view.x-view.size/2} ${view.y-view.size/2} ${view.size} ${view.size}`}
      onPointerDown={e=>{if(e.button!==0)return;pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{const p=pointer.current;if(!p||p.id!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect();
        const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
        setView(s=>({...s,x:s.x-dx*s.size/Math.min(rect.width,rect.height),y:s.y-dy*s.size/Math.min(rect.width,rect.height)}));}}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <image href="/assets/mars/jz01/orthomosaic.png" x={-250} y={-250} width={500} height={500}
        onLoad={()=>setLoaded(true)} onError={()=>setError('Orthomosaic unavailable')}/>
      {routes.map(route=><polyline key={route.name} aria-label={route.name} points={route.points} fill="none"
        stroke={route.color} strokeWidth={2.3} vectorEffect="non-scaling-stroke" strokeDasharray={route.dashed?'7 5':undefined}>
        <title>{route.name}</title></polyline>)}
    </svg>
    {error?<p className="jz01-notice" role="alert">{error}</p>:(!loaded||routes.length!==2)&&<p className="jz01-notice" role="status">Loading map and existing routes…</p>}
  </div>;
}
