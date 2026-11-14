import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Diagrammatic cut edges, not measured subsurface or surrounding landscape. */
export default function SurveyFrame({ root,spacing=1 }: { root: THREE.Object3D;spacing?:number }) {
  const geometry = useMemo(() => {
    const points = new Map<string, THREE.Vector3>();
    root.updateWorldMatrix(true,true);
    const box=new THREE.Box3().setFromObject(root),base=box.min.y-8;
    const xmin=box.min.x-spacing/2,xmax=box.max.x+spacing/2,zmin=box.min.z-spacing/2,zmax=box.max.z+spacing/2;
    root.traverse(o => { if (o instanceof THREE.Mesh) {
      const p=o.geometry.attributes.position, v=new THREE.Vector3();
      for(let i=0;i<p.count;i++) {
        v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
        if(Math.abs(v.x-box.min.x)<.0001||Math.abs(v.x-box.max.x)<.0001||Math.abs(v.z-box.min.z)<.0001||Math.abs(v.z-box.max.z)<.0001) points.set(`${v.x},${v.z}`,v.clone());
      }
    } });
    const center=box.getCenter(new THREE.Vector3());
    const perimeter=[...points.values()].sort((a,b)=>Math.atan2(a.z-center.z,a.x-center.x)-Math.atan2(b.z-center.z,b.x-center.x));
    const vertices:number[]=[];
    for(let i=0;i<perimeter.length;i++) {
      const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
      vertices.push(a.x,a.y,a.z,b.x,b.y,b.z,a.x,base,a.z,b.x,b.y,b.z,b.x,base,b.z,a.x,base,a.z);
    }
    const wall=new THREE.BufferGeometry(); wall.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    wall.computeVertexNormals();
    // The raster boundary is 0.5 m outside the outer sample centers.
    const border=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xmin,base+.1,zmin),new THREE.Vector3(xmax,base+.1,zmin),
      new THREE.Vector3(xmax,base+.1,zmax),new THREE.Vector3(xmin,base+.1,zmax),new THREE.Vector3(xmin,base+.1,zmin)]);
    return {wall,border,width:xmax-xmin,depth:zmax-zmin,center,base};
  },[root,spacing]);
  useEffect(()=>()=>{geometry.wall.dispose();geometry.border.dispose();},[geometry]);
  return <group name="Survey display framing (not geology)">
    <mesh geometry={geometry.wall}><meshStandardMaterial color="#342e29" roughness={1} side={THREE.DoubleSide}/></mesh>
    <mesh position={[geometry.center.x,geometry.base-.05,geometry.center.z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[geometry.width,geometry.depth]}/><meshStandardMaterial color="#292b29" roughness={1} side={THREE.DoubleSide}/></mesh>
    <lineLoop geometry={geometry.border}><lineBasicMaterial color="#74958b" transparent opacity={.65}/></lineLoop>
  </group>;
}
