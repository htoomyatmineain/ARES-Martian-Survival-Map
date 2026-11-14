import {lazy,Suspense} from 'react';
import LandingPage from './LandingPage';
const RegionalWorkspace=lazy(()=>import('./RegionalWorkspace'));
export default function App(){
 const params=new URLSearchParams(window.location.search);
 const explorer=params.has('workspace')||window.location.pathname==='/explorer';
 return explorer?<Suspense fallback={<p role="status">Loading Mars workspace…</p>}><RegionalWorkspace/></Suspense>:<LandingPage/>;
}
