(() => {
  "use strict";

  const clamp = (v,min=0,max=1) => Math.min(max,Math.max(min,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const easeOut = t => 1-Math.pow(1-clamp(t),3);
  const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const pulse = (t,center,width=.12) => Math.max(0,1-Math.abs(t-center)/width);
  const wave = (t,cycles=1) => Math.sin(t*Math.PI*2*cycles);

  const DEFAULT_ANIMATION = Object.freeze({
    type:"straight-punch", speed:1, distance:150, impacts:1, duration:.82,
    jumpHeight:70, effectSize:1, trailLength:.72, cameraShake:.55, sound:"impact"
  });

  const TYPES = [
    ["straight-punch","Golpe recto"],["dash","Dash"],["kick","Patada"],["uppercut","Uppercut"],
    ["spin","Giro"],["sword-slash","Espadazo"],["shot","Disparo"],["explosion","Explosión"],
    ["charge","Carga"],["jump","Salto"],["combo","Combo"],["hammer","Martillazo"],
    ["teleport","Teletransporte"],["sweep","Barrido"],["grab","Agarre"]
  ];

  const labels = Object.fromEntries(TYPES);
  const registry = new Map();

  function basePose(){
    return {x:0,y:0,body:0,headX:0,headY:0,armBack:2.18,forearmBack:1.25,armFront:.92,forearmFront:.05,legBack:1.86,shinBack:1.42,legFront:1.29,shinFront:1.72,scaleX:1,scaleY:1,alpha:1};
  }
  function withPose(values={}){ return {...basePose(),...values}; }
  function impacts(count,start=.48,end=.66){
    const n=Math.max(1,Math.round(Number(count)||1));
    if(n===1)return [(start+end)/2];
    return Array.from({length:n},(_,i)=>lerp(start,end,i/(n-1)));
  }
  function register(def){ registry.set(def.id,Object.freeze(def)); return def; }

  register({id:"straight-punch",label:"Golpe recto",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.5,.68),sample:(t,c)=>{
    const wind=pulse(t,.2,.2), hit=easeOut(clamp((t-.32)/.34)), recover=easeInOut(clamp((t-.68)/.32));
    return withPose({x:c.distance*.18*hit*(1-recover),body:-.18*wind+.12*hit,armFront:lerp(.95,-.05,hit)*(1-recover)+.95*recover,forearmFront:lerp(.1,0,hit),armBack:2.35-.25*wind,legFront:1.18,legBack:1.98});
  }});
  register({id:"dash",label:"Dash",trailPart:"torso",impactTimes:c=>impacts(c.impacts,.62,.74),sample:(t,c)=>{
    const move=easeInOut(clamp(t/.72)); const returnMove=easeInOut(clamp((t-.78)/.22));
    return withPose({x:c.distance*move*(1-returnMove),body:-.28,armFront:.15,forearmFront:.05,armBack:2.85,forearmBack:3.05,legFront:1.0+.28*wave(t,3),legBack:2.15-.28*wave(t,3),scaleX:1.04,scaleY:.97});
  }});
  register({id:"kick",label:"Patada",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.55,.7),sample:(t,c)=>{
    const hit=easeOut(clamp((t-.25)/.4)),rec=easeInOut(clamp((t-.7)/.3));
    return withPose({x:c.distance*.1*hit*(1-rec),body:-.22*hit,legFront:lerp(1.28,.06,hit)*(1-rec)+1.28*rec,shinFront:lerp(1.72,.12,hit)*(1-rec)+1.72*rec,legBack:1.94,armFront:.55,armBack:2.5});
  }});
  register({id:"uppercut",label:"Uppercut",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.52,.68),sample:(t,c)=>{
    const hit=easeOut(clamp((t-.28)/.38)),rec=easeInOut(clamp((t-.7)/.3));
    return withPose({x:c.distance*.08*hit*(1-rec),y:-c.jumpHeight*.28*hit*(1-rec),body:-.18,armFront:lerp(.9,-1.32,hit)*(1-rec)+.9*rec,forearmFront:-1.35,legFront:1.2,legBack:1.95});
  }});
  register({id:"spin",label:"Giro",trailPart:"frontHand",impactTimes:c=>impacts(Math.max(2,c.impacts),.38,.76),sample:(t,c)=>{
    const spin=easeInOut(t)*Math.PI*2;
    return withPose({x:c.distance*.1*Math.sin(Math.PI*t),body:spin,armFront:.15,forearmFront:.1,armBack:Math.PI+.15,forearmBack:Math.PI+.1,legFront:1.15,legBack:1.98});
  }});
  register({id:"sword-slash",label:"Espadazo",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.48,.7),sample:(t,c)=>{
    const slash=easeInOut(clamp((t-.18)/.62));
    return withPose({x:c.distance*.12*slash,body:-.1+.3*slash,armFront:lerp(-1.3,.55,slash),forearmFront:lerp(-1.05,.2,slash),armBack:2.25,legFront:1.18,legBack:1.98});
  }});
  register({id:"shot",label:"Disparo",trailPart:"frontHand",projectile:true,impactTimes:c=>impacts(c.impacts,.62,.82),sample:(t)=>{
    const recoil=pulse(t,.38,.13);
    return withPose({body:.08*recoil,armFront:.02,forearmFront:.01,armBack:2.32,forearmBack:1.45,legFront:1.28,legBack:1.85});
  }});
  register({id:"explosion",label:"Explosión",trailPart:"torso",areaEffect:true,impactTimes:c=>impacts(c.impacts,.58,.72),sample:(t,c)=>{
    const charge=Math.sin(clamp(t/.55)*Math.PI/2),blast=pulse(t,.65,.17);
    return withPose({y:-8*charge,body:0,armFront:lerp(.9,-.65,charge),armBack:lerp(2.2,3.75,charge),forearmFront:-.4,forearmBack:3.45,scaleX:1+.08*blast,scaleY:1+.08*blast});
  }});
  register({id:"charge",label:"Carga",trailPart:"torso",impactTimes:c=>impacts(c.impacts,.64,.78),sample:(t,c)=>{
    const move=easeOut(clamp((t-.18)/.62));
    return withPose({x:c.distance*move,body:-.45,armFront:.55,forearmFront:.25,armBack:2.65,forearmBack:2.85,legFront:1.05,legBack:2.2,scaleX:1.08,scaleY:.94});
  }});
  register({id:"jump",label:"Salto",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.74,.84),sample:(t,c)=>{
    const arc=Math.sin(Math.PI*clamp(t));
    return withPose({x:c.distance*.45*easeInOut(t),y:-c.jumpHeight*arc,body:.15*wave(t,.5),armFront:.25,armBack:2.85,legFront:.75+.8*(1-arc),legBack:2.35-.8*(1-arc)});
  }});
  register({id:"combo",label:"Combo",trailPart:"frontHand",impactTimes:c=>impacts(Math.max(3,c.impacts),.28,.78),sample:(t,c)=>{
    const hitWave=Math.sin(t*Math.PI*Math.max(3,c.impacts));
    return withPose({x:c.distance*.14*easeOut(t),body:.18*hitWave,armFront:.35-.9*Math.max(0,hitWave),forearmFront:.1,armBack:2.45+.7*Math.min(0,hitWave),forearmBack:2.9,legFront:1.18,legBack:1.98});
  }});
  register({id:"hammer",label:"Martillazo",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.66,.78),sample:(t,c)=>{
    const lift=easeOut(clamp(t/.38)),slam=easeInOut(clamp((t-.38)/.45));
    return withPose({x:c.distance*.1*slam,body:.28*slam,armFront:lerp(.9,-1.55,lift)+2.05*slam,forearmFront:lerp(.1,-1.6,lift)+2.0*slam,armBack:lerp(2.2,4.55,lift)+2.0*slam,forearmBack:4.6,legFront:1.2,legBack:1.95});
  }});
  register({id:"teleport",label:"Teletransporte",trailPart:"torso",teleport:true,impactTimes:c=>impacts(c.impacts,.6,.7),sample:(t,c)=>{
    const vanish=clamp(t/.3),appear=clamp((t-.42)/.22),returnMove=easeInOut(clamp((t-.78)/.22));
    return withPose({x:(t<.4?0:c.distance)*(1-returnMove),alpha:t>.28&&t<.48?.08:Math.max(.15,1-Math.sin(Math.PI*vanish)*.85)*(1-appear)+appear,scaleX:1-.18*Math.sin(Math.PI*vanish),scaleY:1+.25*Math.sin(Math.PI*vanish)});
  }});
  register({id:"sweep",label:"Barrido",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.5,.72),sample:(t,c)=>{
    const sweep=easeInOut(clamp((t-.18)/.62));
    return withPose({x:c.distance*.08*sweep,y:12*sweep,body:.42*sweep,legFront:lerp(1.28,.02,sweep),shinFront:.08,legBack:2.12,armFront:.35,armBack:2.72,scaleY:.92});
  }});
  register({id:"grab",label:"Agarre",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.56,.7),sample:(t,c)=>{
    const reach=easeOut(clamp((t-.18)/.36)),pull=easeInOut(clamp((t-.58)/.3));
    return withPose({x:c.distance*.16*reach-c.distance*.08*pull,body:-.2*reach+.35*pull,armFront:lerp(.92,.02,reach)+.55*pull,forearmFront:0,armBack:lerp(2.18,3.1,reach)-.55*pull,forearmBack:3.14,legFront:1.18,legBack:1.98});
  }});

  function normalize(source={},index=0){
    const type=registry.has(source?.type)?source.type:TYPES[index%TYPES.length][0];
    return {
      type,
      speed:clamp(Number(source?.speed ?? DEFAULT_ANIMATION.speed),.25,3),
      distance:clamp(Number(source?.distance ?? DEFAULT_ANIMATION.distance),0,500),
      impacts:Math.round(clamp(Number(source?.impacts ?? DEFAULT_ANIMATION.impacts),1,8)),
      duration:clamp(Number(source?.duration ?? DEFAULT_ANIMATION.duration),.2,4),
      jumpHeight:clamp(Number(source?.jumpHeight ?? DEFAULT_ANIMATION.jumpHeight),0,280),
      effectSize:clamp(Number(source?.effectSize ?? DEFAULT_ANIMATION.effectSize),.2,3),
      trailLength:clamp(Number(source?.trailLength ?? DEFAULT_ANIMATION.trailLength),0,2),
      cameraShake:clamp(Number(source?.cameraShake ?? DEFAULT_ANIMATION.cameraShake),0,2),
      sound:["none","impact","energy","slash","blast"].includes(source?.sound)?source.sound:DEFAULT_ANIMATION.sound
    };
  }
  function get(id){ return registry.get(id)||registry.get(DEFAULT_ANIMATION.type); }
  function sample(config,t){ return get(config.type).sample(clamp(t),normalize(config)); }
  function impactTimes(config){ return get(config.type).impactTimes(normalize(config)); }

  window.QTEAnimations={
    DEFAULT_ANIMATION,TYPES,labels,registry,register,get,sample,impactTimes,normalize,basePose,
    helpers:{clamp,lerp,easeOut,easeInOut,pulse,wave}
  };
})();
