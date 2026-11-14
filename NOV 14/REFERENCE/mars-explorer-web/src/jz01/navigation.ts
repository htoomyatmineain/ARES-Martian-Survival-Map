export type NavigationConfig = {
  width:number;height:number;spacing:number;meshStep:number;xmin:number;zmin:number;
  elevationOffset:number;eyeHeight:number;boundaryMargin:number;
  spawn:{x:number;z:number;yaw:number;pitch:number};walkSpeed:number;fastSpeed:number;
};
export const JZ01_NAVIGATION:NavigationConfig = {
  width:500,height:500,spacing:1,meshStep:2,xmin:-249.5,zmin:-249.5,
  elevationOffset:2425.92626953125,eyeHeight:1.7,boundaryMargin:2,
  spawn:{x:-170,z:100,yaw:-Math.PI/2,pitch:-.12},walkSpeed:1.4,fastSpeed:2.8,
};
export function walkBounds(c:NavigationConfig) {
  return {xmin:c.xmin+c.boundaryMargin,xmax:c.xmin+(c.width-1)*c.spacing-c.boundaryMargin,
    zmin:c.zmin+c.boundaryMargin,zmax:c.zmin+(c.height-1)*c.spacing-c.boundaryMargin};
}
export function clampPosition(x:number,z:number,c:NavigationConfig) {
  const b=walkBounds(c);
  return {x:Math.max(b.xmin,Math.min(b.xmax,x)),z:Math.max(b.zmin,Math.min(b.zmax,z))};
}

export function surfaceAt(values:Float32Array,x:number,z:number,config:NavigationConfig=JZ01_NAVIGATION) {
  const px=(x-config.xmin)/config.spacing,pz=(z-config.zmin)/config.spacing,w=config.width,h=config.height;
  if(values.length!==w*h||!Number.isFinite(x+z)||px<0||pz<0||px>w-1||pz>h-1)return null;
  const c=Math.min(w-2,Math.floor(px)),r=Math.min(h-2,Math.floor(pz)),fx=px-c,fz=pz-r;
  const dtm=((values[r*w+c]*(1-fx)+values[r*w+c+1]*fx)*(1-fz)
    +(values[(r+1)*w+c]*(1-fx)+values[(r+1)*w+c+1]*fx)*fz)+config.elevationOffset;
  // Source OBJ samples every second pixel plus the final pixel; use its exact diagonal.
  const step=config.meshStep;
  const mc=Math.min(Math.ceil((w-1)/step)-1,Math.floor(px/step)),mr=Math.min(Math.ceil((h-1)/step)-1,Math.floor(pz/step));
  const cx=mc*step,rz=mr*step,nx=Math.min(w-1,cx+step),nz=Math.min(h-1,rz+step);
  const u = (px-cx)/(nx-cx), v = (pz-rz)/(nz-rz);
  const a=values[rz*w+cx],b=values[rz*w+nx],d=values[nz*w+cx],e=values[nz*w+nx];
  const mesh=(u+v<=1?a+(b-a)*u+(d-a)*v:e+(d-e)*(1-u)+(b-e)*(1-v))+config.elevationOffset;
  return {dtm,mesh,eye:Math.max(dtm,mesh)+config.eyeHeight};
}
