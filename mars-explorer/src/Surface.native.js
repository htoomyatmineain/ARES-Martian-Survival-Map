import React,{useEffect,useRef} from 'react';
import {GLView} from 'expo-gl';
import {renderer} from './render';

export default function Surface({state,tick,onError}) {
  const clean=useRef(null);
  useEffect(()=>()=>clean.current?.(),[]);
  return <GLView style={{flex:1}} onContextCreate={gl=>{try{clean.current?.();clean.current=renderer(gl,state,tick,onError);}catch(e){onError(e);}}}/>;
}
