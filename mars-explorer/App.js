import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,StyleSheet,StatusBar,PanResponder,Platform,useWindowDimensions} from 'react-native';
import Surface from './src/Surface';
import weather from './assets/meda-weather.json';
import {base,sites,heightAt,distance,blocked,routes,suit,clamp} from './src/mission';

const archive=weather.sols.filter(s=>typeof s.min_temp==='number'&&typeof s.pressure==='number').at(-1);
const destination=sites[0];
const start=()=>({x:base.x,z:base.z,eye:heightAt(base.x,base.z)+1.83,yaw:-1.22,pitch:.015,zoom:1,map:false,layer:0,route:null,time:0,steps:0});
const fmt=t=>Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0');

function Reading({label,value,unit,styles:S}){
  return <View style={S.reading}>
    <View><Text style={S.label}>{label}</Text><Text style={S.readout}>{value}</Text></View>
    <View style={S.unit}><Text style={S.unitText}>{unit}</Text></View>
  </View>;
}

export default function App(){
  const {width,height}=useWindowDimensions();
  const scale=clamp(Math.min(width/700,height/365),.88,2.05);
  const S=useMemo(()=>suitcamStyles(scale),[scale]);
  const world=useRef(start()),inputs=useRef({keys:new Set(),x:0,z:0});
  const frame=useRef(0);
  const [hud,setHud]=useState({...world.current}),[error,setError]=useState('');
  useEffect(()=>{
    world.current.route=routes(world.current,destination)[0]?.path??null;
  },[]);
  const tick=useCallback(dt=>{
    const s=world.current,i=inputs.current;
    const before=s.steps;
    const dx=i.x+(i.keys.has('d')||i.keys.has('arrowright')?1:0)-(i.keys.has('a')||i.keys.has('arrowleft')?1:0);
    const dz=i.z+(i.forward||i.sceneForward?1:0)+(i.keys.has('w')||i.keys.has('arrowup')?1:0)-(i.keys.has('s')||i.keys.has('arrowdown')?1:0);
    const length=Math.max(1,Math.hypot(dx,dz)), time=dt*suit.timeScale;
    const motion=time*suit.walkMetresPerSecond*(i.keys.has('shift')?1.8:1)/length;
    const vx=(Math.sin(s.yaw)*dz+Math.cos(s.yaw)*dx)*motion;
    const vz=(-Math.cos(s.yaw)*dz+Math.sin(s.yaw)*dx)*motion;
    const substeps=Math.max(1,Math.ceil(Math.hypot(vx,vz)/.20));
    function step(dx,dz){
      const hop=Math.hypot(dx,dz), x=s.x+dx,z=s.z+dz;
      if(hop===0||blocked(x,z)||Math.abs(heightAt(x,z)-heightAt(s.x,s.z))>hop*.56)return false;
      s.x=x;s.z=z;s.steps+=hop;return true;
    }
    for(let n=0;n<substeps;n++){
      const x=vx/substeps,z=vz/substeps;
      if(!step(x,z)){step(x,0);step(0,z);}
    }
    if(s.steps>before)s.time+=time;
    const bob=s.steps>before?Math.sin(s.steps*4.6)*.11:0;
    s.eye+=(heightAt(s.x,s.z)+1.83+bob-s.eye)*Math.min(1,dt*11);
    frame.current+=dt;
    if(frame.current>.14){frame.current=0;setHud({...s});}
  },[]);
  const onError=useCallback(e=>setError(String(e.message??e)),[]);
  const look=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{const i=inputs.current;i.lookX=0;i.lookY=0;i.sceneForward=true;},
    onPanResponderRelease:()=>{inputs.current.sceneForward=false;},
    onPanResponderTerminate:()=>{inputs.current.sceneForward=false;},
    onPanResponderMove:(_,g)=>{
      const i=inputs.current,s=world.current;
      if(Math.hypot(g.dx,g.dy)>7)i.sceneForward=false;
      s.yaw+=(g.dx-i.lookX)*.0062;
      s.pitch=clamp(s.pitch-(g.dy-i.lookY)*.005,-.86,.72);
      i.lookX=g.dx;i.lookY=g.dy;
    },
  })).current;
  const pointer=useRef(null);
  const webLook={
    onPointerDown:e=>{
      if(e.button!==0||pointer.current)return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0};
      inputs.current.sceneForward=true;
    },
    onPointerMove:e=>{
      const p=pointer.current;
      if(!p||p.id!==e.pointerId)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      p.x=e.clientX;p.y=e.clientY;p.travel+=Math.hypot(dx,dy);
      if(p.travel>7)inputs.current.sceneForward=false;
      world.current.yaw+=dx*.0062;
      world.current.pitch=clamp(world.current.pitch-dy*.005,-.86,.72);
    },
    onLostPointerCapture:e=>{
      if(pointer.current?.id===e.pointerId){pointer.current=null;inputs.current.sceneForward=false;}
    },
    onPointerCancel:()=>{pointer.current=null;inputs.current.sceneForward=false;},
  };
  const [stick,setStick]=useState([0,0]);
  const joystick=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{inputs.current.z=.65;setStick([0,-16]);},
    onPanResponderMove:(_,g)=>{const d=Math.max(33,Math.hypot(g.dx,g.dy));const x=g.dx/d,y=g.dy/d;inputs.current.x=x;inputs.current.z=-y;setStick([x*25,y*25]);},
    onPanResponderRelease:()=>{inputs.current.x=0;inputs.current.z=0;setStick([0,0]);},
    onPanResponderTerminate:()=>{inputs.current.x=0;inputs.current.z=0;setStick([0,0]);},
    onPanResponderTerminationRequest:()=>false,
  })).current;
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const down=e=>{const k=e.key.toLowerCase();if(['w','a','s','d','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();inputs.current.keys.add(k);}};
    const up=e=>inputs.current.keys.delete(e.key.toLowerCase());
    const blur=()=>{const i=inputs.current;i.keys.clear();i.sceneForward=false;i.forward=false;i.x=0;i.z=0;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
  },[]);
  const delta=distance(hud,destination);
  const bearing=Math.atan2(destination.x-hud.x,hud.z-destination.z)-hud.yaw;
  const heading=Math.atan2(Math.sin(bearing),Math.cos(bearing));
  const arrived=delta<=9;
  const oxygen=Math.max(0,100-hud.time*suit.oxygenPerMinute/60);
  const battery=Math.max(0,100-hud.time*suit.batteryPerMinute/60);
  return <View style={S.root}>
    <StatusBar hidden/>
    <Surface state={world} tick={tick} onError={onError}/>
    {Platform.OS==='web'
      ? <div aria-label="Hold to walk or drag to look" style={{position:'absolute',inset:0,touchAction:'none',cursor:'grab'}} {...webLook}/>
      : <View style={StyleSheet.absoluteFill} {...look.panHandlers} accessibilityLabel="Hold to walk or drag to look"/>}
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[S.bar,S.topBar]}/><View style={[S.bar,S.bottomBar]}/>
      <View style={[S.rail,S.leftRail]}/><View style={[S.rail,S.rightRail]}/>
      <View style={[S.fiducial,S.topMark]}/><View style={[S.fiducial,S.bottomMark]}/>
      <View style={S.missionDay}>
        <Text style={S.kicker}>MISSION DAY</Text>
        <Text style={S.sol}>{archive?'SOL '+archive.sol:'JEZERO'}</Text>
      </View>
      <View style={S.log}>
        <Text style={[S.kicker,S.right]}>EVA {fmt(hud.time)}</Text>
        <Text style={[S.label,S.right]}>JEZERO / SURFACE LOG</Text>
      </View>
      {archive&&<View style={S.environment}>
        <Reading styles={S} label="PRESSURE" value={archive.pressure.toFixed(1)} unit="Pa"/>
        <Reading styles={S} label="TEMP LOW" value={archive.min_temp.toFixed(1)} unit="°C"/>
        <Reading styles={S} label="TEMP HIGH" value={archive.max_temp.toFixed(1)} unit="°C"/>
        <Text style={S.label}>MEDA ARCHIVE</Text>
      </View>}
      <View style={S.suit}>
        <Reading styles={S} label="OXYGEN" value={oxygen.toFixed(1)} unit="%"/>
        <Reading styles={S} label="BATTERY" value={battery.toFixed(1)} unit="%"/>
        <Text style={[S.label,S.right]}>SUIT DATA / SIM</Text>
      </View>
      <View style={S.signature}>
        <Text style={S.signatureText}>JEZERO <Text style={S.signatureLight}>SUITCAM</Text></Text>
        <Text style={S.label}>SURFACE FEED / JZ-01</Text>
      </View>
      <View style={[S.destination,{left:(arrived?50:50+clamp(heading*43,-34,34))+'%'}]}>
        <View style={S.beacon}><Text style={S.beaconIcon}>{!arrived&&Math.abs(heading)>1.1?(heading>0?'›':'‹'):'●'}</Text></View>
        <Text style={S.destinationText}>{destination.name.toUpperCase()}</Text>
        <Text style={S.destinationText}>{arrived?'ARRIVED':Math.round(delta)+' m'}</Text>
      </View>
    </View>
    <View style={[S.joy,width>=700&&S.joyWide]} {...joystick.panHandlers} accessibilityLabel="Drag to walk">
      <Text style={S.joyArrow}>⌃</Text><View style={[S.joyThumb,{transform:[{translateX:stick[0]},{translateY:stick[1]}]}]}/>
    </View>
    <View style={S.walkDock}>
      {Platform.OS==='web'
        ? <button type="button" aria-label="Walk forward" style={S.webWalk}
            onPointerDown={e=>{if(e.button===0){e.currentTarget.setPointerCapture(e.pointerId);inputs.current.forward=true;}}}
            onPointerUp={()=>{inputs.current.forward=false;}}
            onPointerCancel={()=>{inputs.current.forward=false;}}
            onLostPointerCapture={()=>{inputs.current.forward=false;}}
            onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();inputs.current.forward=true;}}}
            onKeyUp={()=>{inputs.current.forward=false;}}
            onBlur={()=>{inputs.current.forward=false;}}>↑ &nbsp; WALK</button>
        : <Pressable accessibilityRole="button" accessibilityLabel="Walk forward"
            onPressIn={()=>{inputs.current.forward=true;}} onPressOut={()=>{inputs.current.forward=false;}}
            style={({pressed})=>[S.walk,pressed&&S.walkPressed]}>
            <Text style={S.walkText}>↑  WALK</Text>
          </Pressable>}
    </View>}
    {error!==''&&<View style={S.error}><Text style={S.kicker}>3D renderer unavailable</Text><Text style={S.label}>{error}</Text></View>}
  </View>;
}

const ink='#f4dac3',line='#f4dac399';
const suitcamStyles=s=>StyleSheet.create({
  root:{flex:1,backgroundColor:'#160d0a',overflow:'hidden'},
  bar:{position:'absolute',height:15*s,left:0,right:0,backgroundColor:'#090706'},
  topBar:{top:0},bottomBar:{bottom:0},
  rail:{position:'absolute',top:29*s,bottom:30*s,width:1,backgroundColor:line},
  leftRail:{left:'5%'},rightRail:{right:'5%'},
  fiducial:{position:'absolute',alignSelf:'center',height:7*s,width:43*s,borderColor:line},
  topMark:{top:30*s,borderTopWidth:1},bottomMark:{bottom:31*s,borderBottomWidth:1},
  missionDay:{position:'absolute',top:29*s,left:'6%',alignItems:'flex-start',gap:5*s},
  kicker:{color:ink,fontSize:11*s,fontWeight:'800',letterSpacing:1.5*s},
  sol:{color:'#2c201b',backgroundColor:'#ead0b9',fontSize:18*s,fontWeight:'900',letterSpacing:1.4*s,paddingHorizontal:5*s},
  log:{position:'absolute',top:29*s,right:'6%',gap:5*s},
  right:{textAlign:'right'},
  environment:{position:'absolute',top:'31%',left:'6%',gap:9*s},
  suit:{position:'absolute',top:'51%',right:'6%',gap:9*s},
  reading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8*s},
  label:{color:ink,fontSize:8*s,fontWeight:'700',letterSpacing:1.05*s,textShadowColor:'#21110b',textShadowRadius:4,textShadowOffset:{width:0,height:1}},
  readout:{color:ink,fontSize:19*s,fontVariant:['tabular-nums'],fontWeight:'300',textShadowColor:'#21110b',textShadowRadius:5,textShadowOffset:{width:0,height:1}},
  unit:{width:26*s,height:26*s,borderRadius:13*s,borderWidth:1,borderColor:line,alignItems:'center',justifyContent:'center'},
  unitText:{color:ink,fontSize:8*s,fontWeight:'700'},
  signature:{position:'absolute',left:'6%',bottom:29*s,gap:3*s},
  signatureText:{color:ink,fontSize:19*s,fontWeight:'900',letterSpacing:2*s},
  signatureLight:{fontWeight:'300'},
  destination:{position:'absolute',top:'43%',width:122,transform:[{translateX:-61}],alignItems:'center',gap:3},
  beacon:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:'#ffc675',backgroundColor:'#3d241a9e',alignItems:'center',justifyContent:'center'},
  beaconIcon:{color:'#ffce8a',fontSize:11},
  destinationText:{color:ink,fontSize:10,fontWeight:'800',letterSpacing:1,textShadowColor:'#170d08',textShadowRadius:5,textShadowOffset:{width:0,height:1}},
  joy:{position:'absolute',left:'6%',bottom:84,width:68,height:68,borderRadius:34,backgroundColor:'#271b1766',borderColor:line,borderWidth:1,justifyContent:'center',alignItems:'center'},
  joyWide:{left:'27%'},
  joyArrow:{position:'absolute',top:2,color:ink,fontSize:14},
  joyThumb:{width:25,height:25,borderRadius:13,backgroundColor:'#e1ba9899',borderColor:ink,borderWidth:1},
  walkDock:{position:'absolute',alignSelf:'center',bottom:52},
  webWalk:{touchAction:'none',cursor:'pointer',border:'1px solid '+line,borderRadius:3,backgroundColor:'#241915d9',padding:'10px 20px',color:ink,fontWeight:'800',fontSize:12,letterSpacing:2},
  walk:{backgroundColor:'#241915d9',borderWidth:1,borderColor:line,borderRadius:3,paddingHorizontal:20,paddingVertical:10},
  walkPressed:{backgroundColor:'#5c3927'},
  walkText:{color:ink,fontSize:12,fontWeight:'800',letterSpacing:2},
  error:{position:'absolute',top:'45%',left:'15%',right:'15%',backgroundColor:'#241915',padding:12},
});
