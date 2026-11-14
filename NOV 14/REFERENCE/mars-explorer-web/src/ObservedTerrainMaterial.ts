import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { Ground } from './cinematicGround';
export function useObservedTerrainMaterial(layer: number, ground: Ground) {
  const source = useLoader(THREE.TextureLoader,['/data/ortho.jpg','/assets/mars/hirise-ortho.jpg','/assets/mars/soil-photo-color.jpg','/assets/mars/soil-photo-normal.jpg','/assets/mars/soil-photo-rough.jpg']);
  const textures = useMemo(()=>source.map((t,i)=>{const c=t.clone();c.colorSpace=i<3?THREE.SRGBColorSpace:THREE.NoColorSpace;if(i>=2){c.wrapS=THREE.RepeatWrapping;c.wrapT=THREE.RepeatWrapping;}c.anisotropy=8;c.needsUpdate=true;return c;}),[source]);
  const uniforms=useMemo(()=>({uLayer:{value:layer},uCtx:{value:textures[0]},uHi:{value:textures[1]},uGrain:{value:textures[2]},uPhotoNormal:{value:textures[3]},uPhotoRough:{value:textures[4]}}),[textures]);
  useEffect(()=>{uniforms.uLayer.value=layer;},[layer,uniforms]);
  const material=useMemo(()=>{
    const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1});
    const rad=ground.heading*Math.PI/180,cs=Math.cos(rad).toFixed(9),sn=Math.sin(rad).toFixed(9);
    m.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec3 vObservedWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvObservedWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader=`varying vec3 vObservedWorld;uniform sampler2D uCtx;uniform sampler2D uHi;uniform sampler2D uGrain;uniform sampler2D uPhotoNormal;uniform sampler2D uPhotoRough;uniform float uLayer;\n`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 local=vObservedWorld.xz;
        vec2 primary=vec2(-2200.,-1200.)+mat2(${cs},${sn},${(-Math.sin(rad)).toFixed(9)},${cs})*local;
        vec2 ctxUv=vec2((primary.x+5000.)/10000.,(5000.-primary.y)/10000.);
        vec2 hiUv=vec2(local.x/1024.+.5,.5-local.y/1024.);
        float edge=512.-max(abs(local.x),abs(local.y));
        float blend=smoothstep(0.,65.,edge);
        vec3 orbital=mix(texture2D(uCtx,ctxUv).rgb,texture2D(uHi,hiUv).rgb,blend);
        float gray=dot(orbital,vec3(.2126,.7152,.0722));
        float reflectance=pow(clamp(gray,.008,1.),.65);
        // Reference-directed rust pigment; orbital luminance remains the observed input.
        // This is presentation color, not calibrated multispectral surface color.
        vec3 pigment=mix(vec3(.16,.035,.018),vec3(.68,.205,.095),reflectance);
        float grains=dot(texture2D(uGrain,local/2.5).rgb,vec3(.2126,.7152,.0722));
        float closeDetail=1.-smoothstep(24.,100.,length(vViewPosition));
        float photoContrast=clamp((grains+.035)*4.5,.23,2.2);
        diffuseColor.rgb=pigment*(.92+reflectance*.65)*mix(1.,photoContrast,closeDetail*.85);
        if(uLayer>.5){diffuseColor.rgb=mix(vec3(.03,.12,.16),vec3(.78,.3,.075),clamp(vObservedWorld.y/90.,0.,1.));}
      `).replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
        vec3 q0=dFdx(-vViewPosition.xyz),q1=dFdy(-vViewPosition.xyz);
        vec2 st0=dFdx(vObservedWorld.xz/2.5),st1=dFdy(vObservedWorld.xz/2.5);
        vec3 q1perp=cross(q1,normal),q0perp=cross(normal,q0);
        vec3 T=q1perp*st0.x+q0perp*st1.x,B=q1perp*st0.y+q0perp*st1.y;
        float determinant=max(dot(T,T),dot(B,B));
        float invScale=determinant>.0000000001?inversesqrt(determinant):0.;
        vec3 mapNormal=texture2D(uPhotoNormal,vObservedWorld.xz/2.5).xyz*2.-1.;
        mapNormal.xy*=.8*(1.-smoothstep(30.,100.,length(vViewPosition)));
        normal=normalize(mat3(T*invScale,B*invScale,normal)*mapNormal);
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(texture2D(uPhotoRough,vObservedWorld.xz/2.5).r,.72,.99);
      `);
    };
    m.customProgramCacheKey=()=>`observed-hirise-ctx-${ground.heading}`;
    return m;
  },[ground.heading,uniforms]);
  useEffect(()=>()=>material.dispose(),[material]);
  useEffect(()=>()=>textures.forEach(t=>t.dispose()),[textures]);
  return material;
}
