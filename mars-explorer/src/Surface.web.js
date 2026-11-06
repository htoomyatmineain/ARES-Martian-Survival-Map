import React,{useEffect,useRef} from 'react';
import {renderer} from './render';

export default function Surface({state,tick,onError}) {
  const canvas=useRef(null);
  useEffect(()=>{
    const el=canvas.current;
    const size=()=>{const rect=el.getBoundingClientRect(),scale=Math.min(devicePixelRatio,1.75);el.width=Math.max(1,rect.width*scale);el.height=Math.max(1,rect.height*scale);};
    const observer=new ResizeObserver(size);observer.observe(el);size();
    const gl=el.getContext('webgl',{antialias:true});
    if(!gl){onError(Error('WebGL is unavailable in this browser'));return ()=>observer.disconnect();}
    let clean;
    try{clean=renderer(gl,state,tick,onError);}catch(e){onError(e);}
    return ()=>{clean?.();observer.disconnect();};
  },[state,tick,onError]);
  return <canvas ref={canvas} style={{display:'block',width:'100%',height:'100%'}}/>;
}
