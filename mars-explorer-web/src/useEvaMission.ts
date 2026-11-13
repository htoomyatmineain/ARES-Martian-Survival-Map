import {useEffect,useReducer} from 'react';
import {initialMission,missionReducer} from './evaMission';
export function useEvaMission(){const [state,dispatch]=useReducer(missionReducer,undefined,initialMission);
 useEffect(()=>{if(state.paused||!['outbound','science','returning'].includes(state.phase))return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),minutes=(now-last)/60000*state.rate;last=now;dispatch({type:'tick',minutes});},250);return()=>clearInterval(timer);},[state.phase,state.paused,state.rate]);
 return {state,dispatch};
}
