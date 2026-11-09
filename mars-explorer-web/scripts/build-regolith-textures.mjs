import sharp from 'sharp';
const n=1024, height=new Float32Array(n*n), albedo=Buffer.alloc(n*n), map=Buffer.alloc(n*n), rough=Buffer.alloc(n*n);
let seed=73421;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
for(let i=0;i<height.length;i++)height[i]=random()*.06;
for(let grain=0;grain<33000;grain++){
  const cx=Math.floor(random()*n),cy=Math.floor(random()*n),size=grain<1600?2+random()*8:.6+random()*2.2,amp=grain<1600?.2+random()*.45:.04+random()*.14,rx=size*(.6+random()*.8),ry=size*(.6+random()*.8);
  for(let dy=-Math.ceil(ry*2);dy<=Math.ceil(ry*2);dy++)for(let dx=-Math.ceil(rx*2);dx<=Math.ceil(rx*2);dx++){
    const d=dx*dx/(rx*rx)+dy*dy/(ry*ry);if(d>3)continue;const x=(cx+dx+n)%n,y=(cy+dy+n)%n;height[y*n+x]+=Math.exp(-d*1.8)*amp;
  }
}
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,v=Math.min(1,height[i]);map[i]=Math.round(v*255);
  albedo[i]=Math.round(Math.max(0,Math.min(255,130+v*100+(random()-.5)*40)));
  rough[i]=Math.round(220+(1-v)*30);
}
for(const [name,data] of [['regolith-detail',albedo],['regolith-height',map],['regolith-roughness',rough]])await sharp(data,{raw:{width:n,height:n,channels:1}}).png().toFile(`public/assets/mars/${name}.png`);
console.log('Prepared seamless reconstructed regolith PBR microdetail; terrain heights are unchanged.');
