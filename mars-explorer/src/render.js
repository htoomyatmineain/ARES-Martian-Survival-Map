import {terrain, count, half, spacing, heightAt, rocks, base, sites} from './mission';

// One direction for the terrain horizon test, rock shadows, and sky lighting.
const sunAzimuth=[.91,.415];
const sunSlope=.34;
const sunlightDirection=`vec3(${sunAzimuth[0]},${sunSlope},${sunAzimuth[1]})`;

const vertex = `
attribute vec3 aPosition,aNormal,aColor;
attribute float aKind;
uniform mat4 uView;
uniform vec3 uEye;
varying vec3 vP,vN,vC;
varying float vKind,vD;
void main(){
  gl_Position=uView*vec4(aPosition,1.);
  vP=aPosition;vN=aNormal;vC=aColor;vKind=aKind;vD=length(aPosition-uEye);
}`;
const fragment = `
precision highp float;
varying vec3 vP,vN,vC;
varying float vKind,vD;
uniform float uLayer,uHasTexture;
uniform sampler2D uSurface;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.849);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float detail(vec2 p){
  return noise(p*.74)*.68+noise(p*3.7)*.24+noise(p*13.)*.08;
}
void main(){
  if(vKind>3.5){
    vec3 color=vKind>4.5?vec3(229.,246.,252.)/255.:vec3(.24,.82,1.);
    gl_FragColor=vec4(color,vC.r*smoothstep(2.5,5.,vD));
    return;
  }
  if(vKind>2.5){gl_FragColor=vec4(.16,.068,.039,vC.r);return;}
  vec3 n=normalize(vN), light=normalize(${sunlightDirection});
  float direct=max(0.,dot(n,light));
  float visibility=vKind<.5?clamp(vKind/.42,0.,1.):1.-clamp((vKind-1.)/.42,0.,1.);
  vec3 fill=mix(vec3(.29,.27,.28),vec3(.48,.43,.39),max(n.y,0.));
  vec3 sun=fill+vec3(1.22,1.08,.91)*direct*visibility;
  vec3 color=vC*sun;
  if(vKind<.5&&uHasTexture>.5&&max(abs(vP.x),abs(vP.z))<=250.){
    float tone=texture2D(uSurface,vP.xz/500.+.5).r;
    color=mix(vec3(.24,.108,.064),vec3(1.11,.68,.44),smoothstep(.05,.91,tone))*sun;
  }
  if(vKind<.5){
    vec2 p=vP.xz;
    float grains=detail(p);
    float grainFade=1.-smoothstep(26.,85.,vD);
    vec2 ridge=vec2(p.x*.16+p.y*.085,p.y*.105);
    float broad=noise(ridge)*.56+noise(p*.04)*.44;
    vec2 micro=vec2(detail(p+vec2(.085,0.))-grains,detail(p+vec2(0.,.085))-grains);
    vec3 bumped=normalize(n+vec3(-micro.x,0.,-micro.y)*grainFade*1.45);
    float relief=(max(0.,dot(bumped,light))-direct)*grainFade;
    color*=.77+.44*broad+.27*mix(.5,grains,grainFade)+relief*.71*visibility;
    vec2 grid=p*22.;
    vec2 cell=floor(grid);
    float seed=hash(cell);
    vec2 center=vec2(.25+seed*.50,.25+hash(cell+12.7)*.50);
    vec2 stone=fract(grid)-center;
    float density=smoothstep(.55,.87,seed);
    float surface=1.-smoothstep(.04,.25,length(stone*vec2(.9,1.28)));
    float shade=1.-smoothstep(.12,.40,length((stone-vec2(.16,-.10))*vec2(.89,1.18)));
    color*=1.-shade*density*grainFade*.29;
    color+=vec3(.23,.132,.079)*surface*density*grainFade*(.76+clamp(-stone.x+stone.y,0.,.4));
    float exposed=smoothstep(.012,.17,1.-n.y);
    vec2 bedding=vec2(p.x*.38+p.y*.16,vP.y*1.65+noise(p*.21)*.85);
    float seams=noise(bedding*vec2(.38,1.9));
    float slabs=noise(bedding*vec2(2.9,.71));
    float face=smoothstep(.28,.76,seams*.69+slabs*.31);
    color*=mix(1.,.69+face*.49,exposed);
    color+=vec3(.12,.062,.032)*exposed*face*direct*visibility;
    color+=vec3(.051,.026,.017)*smoothstep(.62,.90,grains)*grainFade;
    if(uLayer>.5&&uLayer<1.5){
      float h=clamp(vP.y*.032+.27,0.,1.);
      color=mix(vec3(.07,.16,.17),vec3(.83,.37,.10),h)*sun;
      color+=vec3(.08)*smoothstep(.90,.98,fract(vP.y*.2));
    }else if(uLayer>1.5){
      float grade=1.-n.y;
      color=mix(vec3(.17,.38,.34),vec3(.90,.20,.045),clamp(grade*14.,0.,1.))*sun;
    }
  }
  if(vKind>.5&&vKind<1.5){
    float fracture=noise(vP.xz*9.1+vP.y*4.8);
    float strata=noise(vec2(vP.y*9.3+vP.x*.48,vP.z*2.2));
    float patina=noise(vP.xz*2.8+vec2(vP.y*.31,vP.y*1.6));
    color*=.54+.45*fracture+.25*strata+.16*patina;
    color+=vec3(.25,.16,.095)*pow(direct,3.)*(.29+strata*.71)*visibility;
  }
  if(vKind<.5 && uLayer<.5)color+=vec3(.018,.024,.041)*(1.-visibility);
  if(vKind>1.5)color=vC;
  vec3 haze=vec3(.89,.60,.49);
  float fog=(1.-exp(-vD*.0025))*(vKind>1.5?.27:.88);
  vec3 graded=mix(color,haze,fog);
  if(uLayer<.5&&vKind<1.5){
    graded=graded/(.71+.40*graded);
    graded=pow(max(graded,vec3(0.)),vec3(1.13));
    // Reference swatches call for iron-red soil and cooler brown shadows.
    graded*=vec3(.94,.80,.85);
  }
  gl_FragColor=vec4(graded,1.);
}`;
const skyVert=`attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}`;
const skyFrag=`
precision highp float;varying vec2 v;
uniform vec4 uSkyView;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.849);}
float dustNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
void main(){
  float heading=uSkyView.x+atan(v.x*uSkyView.z*uSkyView.w);
  float elevation=uSkyView.y+atan(v.y*uSkyView.w);
  float h=clamp(elevation*1.55+.10,0.,1.);
  vec3 horizon=vec3(228.,167.,143.)/255.;
  vec3 middle=vec3(193.,139.,126.)/255.;
  vec3 upper=vec3(112.,82.,80.)/255.;
  vec3 c=mix(horizon,middle,smoothstep(.22,.35,elevation));
  c=mix(c,upper,smoothstep(.35,.46,elevation));
  c=mix(c,vec3(.20,.15,.16),smoothstep(.46,.79,elevation));
  vec3 ray=vec3(sin(heading)*cos(elevation),sin(elevation),-cos(heading)*cos(elevation));
  float halo=pow(max(0.,dot(ray,normalize(${sunlightDirection}))),5.);
  vec2 air=vec2(sin(heading)*4.+cos(heading)*2.,h*9.);
  float dust=dustNoise(air)*.77+dustNoise(air*2.3+8.)*.23;
  float veil=smoothstep(.30,.77,dust)*smoothstep(.12,.60,h);
  gl_FragColor=vec4(c+halo*vec3(.09,.042,.026)-veil*vec3(.059,.041,.034),1.);
}`;
function program(gl, vs, fs){
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const p=gl.createProgram(),a=compile(gl.VERTEX_SHADER,vs),b=compile(gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  gl.deleteShader(a);gl.deleteShader(b);return p;
}
const unit = a => {const d=Math.hypot(...a)||1;return a.map(i=>i/d);};
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function camera(eye,direction,aspect,zoom){
  const f=unit(direction),s=unit(cross(f,[0,1,0])),u=cross(s,f);
  const view=[s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-dot(s,eye),-dot(u,eye),dot(f,eye),1];
  const h=1/Math.tan(.63/zoom),far=2800,near=.12;
  const p=[h/aspect,0,0,0,0,h,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],m=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let i=0;i<4;i++)m[col*4+row]+=p[i*4+row]*view[col*4+i];
  return m;
}
// Directional visibility calculated on the same elevation grids used by the scene.
const lightSteps=[4,8,13,20,30,45,65,90,125,180,260,380];
function sceneHeight(x,z){
  if(Math.max(Math.abs(x),Math.abs(z))<=half)return heightAt(x,z);
  const context=terrain.context;
  if(!context)return 0;
  const n=context.count, step=context.size/(n-1), radius=context.size/2;
  const u=Math.max(0,Math.min(n-1.001,(x+radius)/step)),v=Math.max(0,Math.min(n-1.001,(z+radius)/step));
  const i=Math.floor(u),j=Math.floor(v),a=j*n+i,xr=u-i,zr=v-j,h=context.heights;
  return (h[a]*(1-xr)+h[a+1]*xr)*(1-zr)+(h[a+n]*(1-xr)+h[a+n+1]*xr)*zr;
}
function sunlight(x,y,z){
  let margin=1;
  for(const d of lightSteps){
    const obstruction=(sceneHeight(x+d*sunAzimuth[0],z+d*sunAzimuth[1])-y-.6)/d;
    margin=Math.min(margin,Math.max(.08,Math.min(1,(sunSlope-obstruction)*8+.5)));
  }
  return margin*.42;
}
function ground(){
  const values=[],indices=[];
  for(let z=0;z<count;z++)for(let x=0;x<count;x++){
    const px=x*spacing-half,pz=z*spacing-half,h=terrain.heights[z*count+x];
    const n=unit([heightAt(px-spacing,pz)-heightAt(px+spacing,pz),2*spacing,heightAt(px,pz-spacing)-heightAt(px,pz+spacing)]);
    const tone=terrain.tone?.[z*count+x]??.6;
    values.push(px,h,pz,...n,.29+tone*.53,.118+tone*.28,.063+tone*.168,sunlight(px,h,pz));
    const i=z*count+x;
    if(x<count-1&&z<count-1)indices.push(i,i+count,i+1,i+1,i+count,i+count+1);
  }
  return {values,indices};
}
function contextMesh(){
  const values=[],indices=[],context=terrain.context;
  if(!context)return {values,indices};
  const n=context.count,d=context.size/(n-1),extent=context.size/2;
  const at=(x,z)=>context.heights[Math.max(0,Math.min(n-1,z))*n+Math.max(0,Math.min(n-1,x))];
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){
    const px=x*d-extent,pz=z*d-extent;
    const seam=Math.abs(Math.max(Math.abs(px),Math.abs(pz))-half)<.01;
    const h=seam?heightAt(px,pz):at(x,z);
    const normal=unit([at(x-1,z)-at(x+1,z),2*d,at(x,z-1)-at(x,z+1)]);
    const color=.56+.08*Math.sin(h*.075)+.06*Math.sin(px*.06+pz*.028);
    values.push(px,h,pz,...normal,.29+color*.53,.118+color*.28,.063+color*.168,sunlight(px,h,pz));
    if(x<n-1&&z<n-1&&!(px>=-half&&px<half&&pz>=-half&&pz<half)){
      const i=z*n+x;indices.push(i,i+n,i+1,i+1,i+n,i+n+1);
    }
  }
  return {values,indices};
}
function triangle(out,a,b,c,color,kind=1){
  const n=unit(cross(diff(b,a),diff(c,a)));
  for(const p of [a,b,c])out.push(...p,...n,...color,kind);
}
function block(out,x,y,z,w,h,d,color){
  const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
  const up=p=>[p[0],p[1]+h,p[2]],A=up(a),B=up(b),C=up(c),E=up(e);
  for(const [v,w,x,y] of [[A,E,C,B],[a,A,B,b],[b,B,C,c],[c,C,E,e],[e,E,A,a]]){
    triangle(out,v,w,x,color);triangle(out,v,x,y,color);
  }
}
function stoneFace(out,a,b,c,color,rock,baseY){
  const {x,z,r,h}=rock;
  const kind=1+.42-rock.sunlight;
  if(r<.42){triangle(out,a,b,c,color,kind);return;}
  const normalAt=p=>unit([(p[0]-x-r*.13)/r,(p[1]-baseY-h*.45)/h,(p[2]-z+r*.10)/r]);
  const midpoint=(p,q)=>{
    const v=p.map((n,i)=>(n+q[i])*.5), normal=normalAt(v);
    const distance=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
    const texture=Math.sin(v[0]*9.73+v[1]*5.27+v[2]*7.91+rock.tint*32);
    return v.map((n,i)=>n+normal[i]*texture*distance*.105);
  };
  const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
  for(const [p,q,t] of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]]){
    const normal=unit(cross(diff(q,p),diff(t,p)));
    for(const v of [p,q,t]){
      const radial=normalAt(v);
      const smooth=unit(normal.map((n,i)=>n*.69+radial[i]*.31));
      out.push(...v,...smooth,...color,kind);
    }
  }
}
function props(){
  const out=[];
  for(const line of terrain.traverse??[]){
    for(let i=1;i<line.length;i++){
      const [x,z]=line[i],h=heightAt(x,z)+.14;
      const c=[.98,.69,.28];
      triangle(out,[x-.35,h,z-.35],[x-.35,h,z+.35],[x+.35,h,z-.35],c,2);
      triangle(out,[x+.35,h,z-.35],[x-.35,h,z+.35],[x+.35,h,z+.35],c,2);
    }
  }
  for(const source of rocks){
    const {x,z,h,r,angle,tint}=source;
    const y=heightAt(x,z)-h*.19;
    const rock={...source,sunlight:sunlight(x,y+h*.65,z)};
    const sides=r>1.2?16:r>.6?11:r>.16?7:5;
    const rings=[];
    const layers=r>.55?[[.02,.88],[.22,.99],[.48,1],[.72,.81],[.96,.43]]:[[.02,.9],[.57,.8],[.94,.34]];
    for(let layer=0;layer<layers.length;layer++){
      const [level,width]=layers[layer];
      rings.push(Array.from({length:sides},(_,i)=>{
        const a=angle+i*Math.PI*2/sides+(layer%2)*.19;
        const edge=.82+.19*Math.sin(i*4.92+tint*14)+.11*Math.cos(i*2.6+layer*2.4);
        const jag=.11*Math.sin(i*7.7+layer*1.9);
        return [x+Math.cos(a)*r*width*edge+level*r*.23,
          y+h*(level+jag),z+Math.sin(a)*r*width*edge*.85-level*r*.17];
      }));
    }
    const color=[.39+tint*.26,.15+tint*.15,.091+tint*.09];
    const shade=(i,band)=>color.map(v=>v*(.91+.12*Math.sin(i*2.15+band*1.3+tint*7)**2));
    for(let band=0;band<rings.length-1;band++){
      const low=rings[band],high=rings[band+1];
      for(let i=0;i<sides;i++){
        const j=(i+1)%sides;
        stoneFace(out,low[i],high[i],low[j],shade(i,band),rock,y);
        stoneFace(out,low[j],high[i],high[j],shade(i+1,band),rock,y);
      }
    }
    const top=rings.at(-1),cap=[x+r*.2,y+h*1.06,z-r*.2];
    for(let i=0;i<sides;i++)stoneFace(out,top[(i+1)%sides],top[i],cap,shade(i,3),rock,y);
    if(r<.75)continue;
    // Illustrative scree, grounded on the measured mesh around larger boulders.
    for(let i=0;i<9;i++){
      const bearing=angle+i*2.39996;
      const offset=r*(1.06+.97*Math.sin(i*3.21+tint*17)**2);
      const px=x+Math.cos(bearing)*offset,pz=z+Math.sin(bearing)*offset;
      if(Math.max(Math.abs(px),Math.abs(pz))>=half)continue;
      const size=.035+Math.min(r,.9)*.19*Math.sin(i*5.12+tint*21)**4;
      const bed=heightAt(px,pz)-size*.12;
      const chip=Array.from({length:5},(_,j)=>{
        const a=bearing+j*Math.PI*2/5;
        const spread=size*(.64+.36*Math.sin(j*3.14+i*1.22)**2);
        return [px+Math.cos(a)*spread,bed,pz+Math.sin(a)*spread];
      });
      const crown=[px+Math.cos(bearing)*size*.36,bed+size*(.4+.36*tint),pz+Math.sin(bearing)*size*.24];
      for(let j=0;j<chip.length;j++)triangle(out,chip[j],crown,chip[(j+1)%chip.length],shade(i,j),1+.42-rock.sunlight);
    }
  }
  const y=heightAt(base.x,base.z);
  block(out,base.x+7,y,base.z+4,8,2.7,4,[.64,.58,.47]);
  block(out,base.x+7,y+1.0,base.z+1.94,4,.7,.12,[.13,.32,.38]);
  block(out,base.x+7,y+2.7,base.z+4,8,.13,4,[.60,.23,.11]);
  block(out,base.x+13,y,base.z+4,.23,6,.23,[.24,.25,.23]);
  block(out,base.x+13,y+5.8,base.z+4,.38,.5,.38,[.98,.48,.08]);
  const {x,z}=sites[0], ground=heightAt(x,z);
  block(out,x,ground,z,.22,3.1,.22,[.53,.33,.15]);
  block(out,x,ground+2.65,z,.72,.47,.47,[1.,.58,.12]);
  return out;
}
function contactShadows(){
  const vertices=[];
  for(const {x,z,r,h} of rocks){
    if(r<.16)continue;
    const p=(a,scale)=>{
      const length=h/sunSlope;
      const u=(Math.cos(a)*(r+length*.46)*scale-length*.43),v=Math.sin(a)*r*scale;
      const px=x+u*sunAzimuth[0]-v*sunAzimuth[1],pz=z+u*sunAzimuth[1]+v*sunAzimuth[0];
      return [px,heightAt(px,pz)+.035,pz];
    };
    const add=(p,alpha)=>vertices.push(...p,0,1,0,alpha,0,0,3);
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
      const left=p(a,.50),right=p(b,.50),edgeL=p(a,1.17),edgeR=p(b,1.17);
      add(p(0,0),.61);add(left,.43);add(right,.43);
      add(left,.43);add(edgeL,0);add(right,.43);
      add(right,.43);add(edgeL,0);add(edgeR,0);
    }
  }
  return vertices;
}
function navigation(path){
  const values=[];
  if(!path?.length)return values;
  let gap=5.4;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length<.01)continue;
    const x=(b.x-a.x)/length,z=(b.z-a.z)/length;
    while(gap<=length){
      const px=a.x+x*gap,pz=a.z+z*gap;
      const p=(side,forward)=>{const q=px+z*side+x*forward,r=pz-x*side+z*forward;return [q,heightAt(q,r)+.14,r];};
      const shape=[[0,.78],[-.98,-.45],[-.94,-.85],[0,.31],[.94,-.85],[.98,-.45]];
      const scale=.62;
      const core=shape.map(([side,forward])=>p(side*scale,forward*scale));
      const rim=shape.map(([side,forward])=>p(side*scale*1.24,(forward+.2)*scale*1.24-.2*scale));
      const halo=(point,alpha)=>values.push(...point,0,1,0,alpha,0,0,4);
      for(let j=0;j<core.length;j++){
        const k=(j+1)%core.length;
        halo(core[j],.48);halo(rim[j],0);halo(core[k],.48);
        halo(core[k],.48);halo(rim[j],0);halo(rim[k],0);
      }
      for(const [a,b,c] of [[0,1,3],[1,2,3],[0,3,5],[3,4,5]]){
        triangle(values,core[a],core[b],core[c],[1,0,0],5);
      }
      gap+=5.3;
    }
    gap-=length;
  }
  return values;
}
export function renderer(gl,state,tick,onError){
  const p=program(gl,vertex,fragment),sky=program(gl,skyVert,skyFrag);
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  const source=terrain.texture;
  let pixels=new Uint8Array([153]);
  if(source){
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    pixels=new Uint8Array(source.size*source.size);
    let bits=0,buffer=0,i=0;
    for(const c of source.gray){
      if(c==='=')break;
      buffer=(buffer<<6)|alphabet.indexOf(c);bits+=6;
      if(bits>=8){bits-=8;pixels[i++]=(buffer>>bits)&255;}
    }
  }
  const texSize=source?.size??1;
  const rgba=new Uint8Array(pixels.length*4);
  for(let i=0;i<pixels.length;i++){
    const j=i*4;rgba[j]=pixels[i];rgba[j+1]=pixels[i];rgba[j+2]=pixels[i];rgba[j+3]=255;
  }
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texSize,texSize,0,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.useProgram(p);
  gl.uniform1i(gl.getUniformLocation(p,'uSurface'),0);
  gl.uniform1f(gl.getUniformLocation(p,'uHasTexture'),source?1:0);
  const names=['aPosition','aNormal','aColor','aKind'];
  const attributes=names.map(k=>gl.getAttribLocation(p,k));
  const view=gl.getUniformLocation(p,'uView'), eyeLoc=gl.getUniformLocation(p,'uEye'), layer=gl.getUniformLocation(p,'uLayer');
  const skyAt=gl.getAttribLocation(sky,'a'),skyView=gl.getUniformLocation(sky,'uSkyView');
  const buffer=values=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);return b;};
  const skyBuffer=buffer([-1,-1,3,-1,-1,3]),g=ground(),gBuffer=buffer(g.values),r=props(),rBuffer=buffer(r),navBuffer=buffer([]);
  const context=contextMesh(),cBuffer=buffer(context.values),ce=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ce);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(context.indices),gl.STATIC_DRAW);
  const shade=contactShadows(),shadeBuffer=buffer(shade);
  const elements=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(g.indices),gl.STATIC_DRAW);
  const bind=b=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);attributes.forEach((at,i)=>{gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,i===3?1:3,gl.FLOAT,false,40,i*12);});};
  let pathRef,navCount=0,frame=0,last=0,stopped=false;
  function draw(now){
    if(stopped)return;
    try{
      const dt=last?Math.min((now-last)/1000,.12):0;last=now;
      tick(dt);
      const s=state.current;
      const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      gl.viewport(0,0,w,h);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(sky);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
      gl.enableVertexAttribArray(skyAt);
      gl.vertexAttribPointer(skyAt,2,gl.FLOAT,false,0,0);
      gl.uniform4f(skyView,s.yaw,s.pitch,w/Math.max(1,h),Math.tan(.63/(s.map?1:s.zoom)));
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.disableVertexAttribArray(skyAt);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(p);
      const eye=s.map?[0,530/s.zoom,62]:[s.x,s.eye,s.z];
      const dir=s.map?[0,-1,-.13]:[Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),-Math.cos(s.yaw)*Math.cos(s.pitch)];
      gl.uniformMatrix4fv(view,false,camera(eye,dir,w/Math.max(1,h),s.map?1:s.zoom));
      gl.uniform3f(eyeLoc,...eye);
      gl.uniform1f(layer,s.layer);
      if(!s.map&&context.indices.length){bind(cBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ce);gl.drawElements(gl.TRIANGLES,context.indices.length,gl.UNSIGNED_SHORT,0);}
      bind(gBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.drawElements(gl.TRIANGLES,g.indices.length,gl.UNSIGNED_SHORT,0);
      if(!s.map&&s.layer===0){
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bind(shadeBuffer);gl.drawArrays(gl.TRIANGLES,0,shade.length/10);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      bind(rBuffer);gl.drawArrays(gl.TRIANGLES,0,r.length/10);
      if(pathRef!==s.route){pathRef=s.route;const data=navigation(pathRef);navCount=data.length/10;gl.bindBuffer(gl.ARRAY_BUFFER,navBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);}
      if(navCount){
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
        bind(navBuffer);gl.drawArrays(gl.TRIANGLES,0,navCount);
        gl.depthMask(true);gl.disable(gl.BLEND);
      }
      if(gl.endFrameEXP)gl.endFrameEXP();
      frame=requestAnimationFrame(draw);
    }catch(error){onError(error);}
  }
  frame=requestAnimationFrame(draw);
  return ()=>{stopped=true;cancelAnimationFrame(frame);for(const b of [skyBuffer,gBuffer,rBuffer,navBuffer,elements,cBuffer,ce,shadeBuffer])gl.deleteBuffer(b);gl.deleteTexture(tex);gl.deleteProgram(p);gl.deleteProgram(sky);};
}
