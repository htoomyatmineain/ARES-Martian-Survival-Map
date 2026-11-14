import { fromGeo, MARS_RADIUS, type Point } from './terrain.ts';
type Projection = { sourceOrigin: number[]; sourceResolution: number[]; sourceGeoKeys: Record<string, string | number> };
export function imageryPixelToWorld(p: Projection, col: number, row: number, center = { lat: 18.46, lon: 77.42 }): Point {
  const d=Math.PI/180,k=p.sourceGeoKeys,R=Number(k.GeogSemiMajorAxisGeoKey);
  if(R!==MARS_RADIUS||Number(k.ProjCoordTransGeoKey)!==21)throw Error('Unsupported imagery CRS');
  const lat0=Number(k.ProjCenterLatGeoKey)*d,lon0=Number(k.ProjCenterLongGeoKey)*d;
  const x=p.sourceOrigin[0]+col*p.sourceResolution[0],y=p.sourceOrigin[1]+row*p.sourceResolution[1];
  const rho=Math.hypot(x,y),c=Math.asin(rho/R),sc=Math.sin(c),cc=Math.cos(c);
  const lat=rho?Math.asin(cc*Math.sin(lat0)+y*sc*Math.cos(lat0)/rho):lat0;
  const lon=lon0+(rho?Math.atan2(x*sc,rho*Math.cos(lat0)*cc-y*Math.sin(lat0)*sc):0);
  return fromGeo(lat/d,lon/d,center);
}
export function imageryTriangle(p: Projection, window: number[], uv: [number,number][], center?: {lat:number;lon:number}) {
  const points=uv.map(([u,v])=>imageryPixelToWorld(p,window[0]+u,window[1]+v,center));
  const [a,b,c]=uv,[A,B,C]=points,du=b[0]-a[0],dv=b[1]-a[1],eu=c[0]-a[0],ev=c[1]-a[1],det=du*ev-eu*dv;
  const aa=((B.x-A.x)*ev-(C.x-A.x)*dv)/det,cc=((C.x-A.x)*du-(B.x-A.x)*eu)/det;
  const bb=((B.z-A.z)*ev-(C.z-A.z)*dv)/det,dd=((C.z-A.z)*du-(B.z-A.z)*eu)/det;
  return {points,matrix:[aa,bb,cc,dd,A.x-aa*a[0]-cc*a[1],A.z-bb*a[0]-dd*a[1]]};
}
