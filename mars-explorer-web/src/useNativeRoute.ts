import {useEffect,useRef,useState} from 'react';
import {loadNativeHazards} from './loadNativeHazards';
import {DEMO_RULES,densify,profileMetrics,type HazardGrid,type NativeRoute,type RoutingRules} from './nativeRouting';
import {sites,toGeo,type Point} from './terrain';
import type {SharedRegionalMap} from './sharedRegionalData';

export function useNativeRoute(shared:SharedRegionalMap|null,destination:Point,slopePriority:boolean,blocked:boolean,limits:RoutingRules,retry:number,allowApproach=false){
  const [grid,setGrid]=useState<HazardGrid|null>(null),[dataError,setDataError]=useState('');
  const [state,setState]=useState<{route:NativeRoute|null;status:string;error:string;requestKey?:string}>({route:null,status:'Loading native slopes…',error:''});
  const sequence=useRef(0);
  const requestKey=JSON.stringify([destination.x,destination.z,slopePriority,blocked,limits,allowApproach]);
  useEffect(()=>{const c=new AbortController();setGrid(null);setState({route:null,status:'Loading native slopes…',error:''});setDataError('');loadNativeHazards(c.signal).then(setGrid).catch(e=>{if(!c.signal.aborted)setDataError(e.message);});return()=>c.abort();},[retry]);
  useEffect(()=>{
    if(!grid||!shared)return;
    const w=new Worker(new URL('./nativeRouting.worker.ts',import.meta.url),{type:'module'});
    const update=(value:{route:NativeRoute|null;status:string;error:string})=>setState({...value,requestKey});
    const id=++sequence.current,c=new AbortController();update({route:null,status:'Searching terrain; retrying a finer grid if needed…',error:''});
    w.onmessage=async(event:MessageEvent<{id:number;route:NativeRoute|null;diagnosis?:{message:string};error?:string}>)=>{
      const m=event.data;if(m.id!==id||c.signal.aborted)return;
      if(m.error){update({route:null,status:'Route calculation failed',error:m.error});return;}
      if(!m.route){update({route:null,status:m.diagnosis?.message??'No route under these rules. Try another destination or review demo limits.',error:''});return;}
      const route=m.route;update({route,status:'Checking native 1 m route profile…',error:''});
      const profileController=new AbortController();
      try{const points=densify(route.points,1),signal=AbortSignal.any([c.signal,profileController.signal,AbortSignal.timeout(120000)]),heights=await shared.store.elevationProfile(points.map(p=>toGeo(p,shared.terrain.meta.center)),signal,(done,total)=>{if(!signal.aborted)update({route,status:`Checking native route tiles: ${done}/${total}…`,error:''});});c.signal.throwIfAborted();const metrics=profileMetrics(points,heights);
        update({route:null,status:'Calculating return corridor to habitat…',error:''});
        const returnWorker=new Worker(new URL('./nativeRouting.worker.ts',import.meta.url),{type:'module'});
        let back:NativeRoute;
        try{back=await new Promise<NativeRoute>((resolve,reject)=>{
          const abort=()=>reject(new Error('Return route check cancelled or timed out'));
          signal.addEventListener('abort',abort,{once:true});
          returnWorker.onmessage=(event:MessageEvent<{route:NativeRoute|null;error?:string}>)=>{signal.removeEventListener('abort',abort);event.data.route?resolve(event.data.route):reject(new Error(event.data.error??'No assessed return route to habitat under these rules.'));};
          returnWorker.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Return route worker failed'));};
          if(signal.aborted){abort();return;}
          returnWorker.postMessage({id,grid,start:route.points.at(-1),end:sites[0],allowApproach:false,rules:route.rules,blocked});
        });}finally{returnWorker.terminate();}
        const returnPoints=densify(back.points,1);
        update({route:null,status:'Checking native 1 m return profile…',error:''});
        const returnHeights=await shared.store.elevationProfile(returnPoints.map(p=>toGeo(p,shared.terrain.meta.center)),signal);
        signal.throwIfAborted();
        const returnRoute={...back,...profileMetrics(returnPoints,returnHeights),profileStatus:'verified' as const,profileSamples:returnPoints.length};
        update({route:{...route,...metrics,profileStatus:'verified',profileSamples:points.length,returnRoute},status:route.approach?'Outbound + return verified · final science-site access unresolved':'Outbound + return native profiles checked · demo rules only',error:''});}
      catch(e){profileController.abort();if(!c.signal.aborted)update({route:null,status:'Native route verification failed',error:e instanceof Error?e.message:'Native route data unavailable'});}
    };
    w.onerror=()=>{if(!c.signal.aborted)update({route:null,status:'Route worker failed',error:'The route worker failed. Reload or retry the route.'});};
    w.postMessage({id,grid,start:sites[0],end:destination,allowApproach,rules:{...limits,slopeWeight:slopePriority?DEMO_RULES.slopeWeight:0},blocked});
    return()=>{c.abort();w.terminate();};
  },[grid,shared,destination,slopePriority,blocked,limits,retry,requestKey,allowApproach]);
  return {grid,route:state.requestKey===requestKey?state.route:null,status:dataError?'Native slopes unavailable':state.status,error:dataError||state.error};
}
