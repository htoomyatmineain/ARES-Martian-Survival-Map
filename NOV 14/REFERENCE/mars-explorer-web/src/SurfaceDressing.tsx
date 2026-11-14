import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { groundHeight, type Ground } from './cinematicGround';
import { DEPARTURE_Z } from './missionSite';

// Sub-resolution debris is visual reconstruction, never added to the measured DEM.
export default function SurfaceDressing({ ground }: { ground: Ground }) {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // Position-derived distortion keeps coincident face vertices together.
      const r = 1 + Math.sin(x * 17 + y * 23 + z * 31) * .17;
      p.setXYZ(i, x * r, Math.max(-.5, y * r * .62), z * r * .85);
    }
    g.computeVertexNormals(); return g;
  }, []);
  useEffect(() => {
    let seed = 47207;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const transform = new THREE.Object3D(), color = new THREE.Color();
    meshes.current.forEach((mesh, group) => {
      if (!mesh) return;
      for (let i = 0; i < mesh.count; i++) {
        const radius = Math.sqrt(rand()) * (group ? 115 : 65), theta = rand() * Math.PI * 2;
        let x = Math.cos(theta) * radius, z = DEPARTURE_Z - 36 + Math.sin(theta) * radius;
        // Leave the walking trail readable without a ruler-straight cleared strip.
        if (Math.abs(x) < 1.2 && z < DEPARTURE_Z && rand() > .25) x += x < 0 ? -1.5 : 1.5;
        const size = group ? .13 + Math.pow(rand(), 3) * .55 : .025 + Math.pow(rand(), 2) * .13;
        transform.position.set(x, groundHeight(ground, x, z) + size * .28, z);
        transform.rotation.set(rand() * .3, rand() * Math.PI * 2, rand() * .3);
        transform.scale.set(size * (1 + rand()), size, size * (1 + rand() * .6));
        transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
        color.setHSL(.035 + rand() * .018, .27 + rand() * .18, .11 + rand() * .12);
        mesh.setColorAt(i, color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [ground]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>{[1500, 240].map((count, i) => <instancedMesh key={i} ref={m => { meshes.current[i] = m; }} args={[geometry, undefined, count]} castShadow={i === 1} receiveShadow>
    <meshStandardMaterial roughness={1} flatShading color="#cba18c"/>
  </instancedMesh>)}</group>;
}
