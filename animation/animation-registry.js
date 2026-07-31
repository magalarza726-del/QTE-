(() => {
  "use strict";

  const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const easeOut=t=>1-Math.pow(1-clamp(t),3);
  const easeIn=t=>Math.pow(clamp(t),3);
  const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const pulse=(t,center,width=.12)=>Math.max(0,1-Math.abs(t-center)/width);
  const wave=(t,cycles=1)=>Math.sin(t*Math.PI*2*cycles);
  const saw=(t,cycles=1)=>((t*cycles)%1)*2-1;

  const DEFAULT_ANIMATION=Object.freeze({
    mode:"single",type:"straight-punch",name:"",speed:1,distance:150,impacts:1,duration:.82,
    jumpHeight:70,effectSize:1,trailLength:.72,cameraShake:.55,sound:"impact",pauseAfter:.08
  });

  const TYPES=[
    ["straight-punch","Golpe recto"],["dash","Dash"],["kick","Patada"],["uppercut","Uppercut"],
    ["spin","Giro"],["sword-slash","Espadazo"],["shot","Disparo"],["explosion","Explosión"],
    ["charge","Carga"],["jump","Salto"],["combo","Combo"],["hammer","Martillazo"],
    ["teleport","Teletransporte"],["sweep","Barrido"],["grab","Agarre"],
    ["elbow-strike","Codazo"],["knee-strike","Rodillazo"],["flying-kick","Patada voladora"],
    ["double-slash","Doble corte"],["spear-thrust","Estocada"],["boomerang","Bumerán energético"],
    ["laser-beam","Rayo láser"],["shockwave","Onda de choque"],["ground-slam","Golpe al suelo"],
    ["backflip-kick","Patada con voltereta"],["lunge","Embestida"],["meteor-dive","Caída meteórica"],
    ["whirlwind","Torbellino"],["rapid-shots","Ráfaga de disparos"],["energy-wave","Corte de energía"]
  ];
  const labels=Object.fromEntries(TYPES);
  const registry=new Map();

  function basePose(){
    return {x:0,y:0,body:0,headX:0,headY:0,armBack:2.18,forearmBack:1.25,armFront:.92,forearmFront:.05,legBack:1.86,shinBack:1.42,legFront:1.29,shinFront:1.72,scaleX:1,scaleY:1,alpha:1};
  }
  const withPose=(values={})=>({...basePose(),...values});
  function impacts(count,start=.48,end=.66){
    const n=Math.max(1,Math.round(Number(count)||1));
    if(n===1)return[(start+end)/2];
    return Array.from({length:n},(_,i)=>lerp(start,end,i/(n-1)));
  }
  function register(def){registry.set(def.id,Object.freeze(def));return def;}

  register({id:"straight-punch",label:"Golpe recto",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.5,.68),sample:(t,c)=>{const w=pulse(t,.2,.2),h=easeOut(clamp((t-.32)/.34)),r=easeInOut(clamp((t-.68)/.32));return withPose({x:c.distance*.18*h*(1-r),body:-.18*w+.12*h,armFront:lerp(.95,-.05,h)*(1-r)+.95*r,forearmFront:lerp(.1,0,h),armBack:2.35-.25*w,legFront:1.18,legBack:1.98});}});
  register({id:"dash",label:"Dash",trailPart:"torso",impactTimes:c=>impacts(c.impacts,.62,.74),sample:(t,c)=>{const m=easeInOut(clamp(t/.72)),r=easeInOut(clamp((t-.78)/.22));return withPose({x:c.distance*m*(1-r),body:-.28,armFront:.15,forearmFront:.05,armBack:2.85,forearmBack:3.05,legFront:1+.28*wave(t,3),legBack:2.15-.28*wave(t,3),scaleX:1.04,scaleY:.97});}});
  register({id:"kick",label:"Patada",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.55,.7),sample:(t,c)=>{const h=easeOut(clamp((t-.25)/.4)),r=easeInOut(clamp((t-.7)/.3));return withPose({x:c.distance*.1*h*(1-r),body:-.22*h,legFront:lerp(1.28,.06,h)*(1-r)+1.28*r,shinFront:lerp(1.72,.12,h)*(1-r)+1.72*r,legBack:1.94,armFront:.55,armBack:2.5});}});
  register({id:"uppercut",label:"Uppercut",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.52,.68),sample:(t,c)=>{const h=easeOut(clamp((t-.28)/.38)),r=easeInOut(clamp((t-.7)/.3));return withPose({x:c.distance*.08*h*(1-r),y:-c.jumpHeight*.28*h*(1-r),body:-.18,armFront:lerp(.9,-1.32,h)*(1-r)+.9*r,forearmFront:-1.35,legFront:1.2,legBack:1.95});}});
  register({id:"spin",label:"Giro",trailPart:"frontHand",impactTimes:c=>impacts(Math.max(2,c.impacts),.38,.76),sample:(t,c)=>{const s=easeInOut(t)*Math.PI*2;return withPose({x:c.distance*.1*Math.sin(Math.PI*t),body:s,armFront:.15,forearmFront:.1,armBack:Math.PI+.15,forearmBack:Math.PI+.1,legFront:1.15,legBack:1.98});}});
  register({id:"sword-slash",label:"Espadazo",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.48,.7),sample:(t,c)=>{const s=easeInOut(clamp((t-.18)/.62));return withPose({x:c.distance*.12*s,body:-.1+.3*s,armFront:lerp(-1.3,.55,s),forearmFront:lerp(-1.05,.2,s),armBack:2.25,legFront:1.18,legBack:1.98});}});
  register({id:"shot",label:"Disparo",trailPart:"frontHand",projectile:true,impactTimes:c=>impacts(c.impacts,.62,.82),sample:t=>{const r=pulse(t,.38,.13);return withPose({body:.08*r,armFront:.02,forearmFront:.01,armBack:2.32,forearmBack:1.45,legFront:1.28,legBack:1.85});}});
  register({id:"explosion",label:"Explosión",trailPart:"torso",areaEffect:true,impactTimes:c=>impacts(c.impacts,.58,.72),sample:(t,c)=>{const ch=Math.sin(clamp(t/.55)*Math.PI/2),b=pulse(t,.65,.17);return withPose({y:-8*ch,armFront:lerp(.9,-.65,ch),armBack:lerp(2.2,3.75,ch),forearmFront:-.4,forearmBack:3.45,scaleX:1+.08*b,scaleY:1+.08*b});}});
  register({id:"charge",label:"Carga",trailPart:"torso",impactTimes:c=>impacts(c.impacts,.64,.78),sample:(t,c)=>{const m=easeOut(clamp((t-.18)/.62));return withPose({x:c.distance*m,body:-.45,armFront:.55,forearmFront:.25,armBack:2.65,forearmBack:2.85,legFront:1.05,legBack:2.2,scaleX:1.08,scaleY:.94});}});
  register({id:"jump",label:"Salto",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.74,.84),sample:(t,c)=>{const a=Math.sin(Math.PI*clamp(t));return withPose({x:c.distance*.45*easeInOut(t),y:-c.jumpHeight*a,body:.15*wave(t,.5),armFront:.25,armBack:2.85,legFront:.75+.8*(1-a),legBack:2.35-.8*(1-a)});}});
  register({id:"combo",label:"Combo",trailPart:"frontHand",impactTimes:c=>impacts(Math.max(3,c.impacts),.28,.78),sample:(t,c)=>{const h=Math.sin(t*Math.PI*Math.max(3,c.impacts));return withPose({x:c.distance*.14*easeOut(t),body:.18*h,armFront:.35-.9*Math.max(0,h),forearmFront:.1,armBack:2.45+.7*Math.min(0,h),forearmBack:2.9,legFront:1.18,legBack:1.98});}});
  register({id:"hammer",label:"Martillazo",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.66,.78),sample:(t,c)=>{const l=easeOut(clamp(t/.38)),s=easeInOut(clamp((t-.38)/.45));return withPose({x:c.distance*.1*s,body:.28*s,armFront:lerp(.9,-1.55,l)+2.05*s,forearmFront:lerp(.1,-1.6,l)+2*s,armBack:lerp(2.2,4.55,l)+2*s,forearmBack:4.6,legFront:1.2,legBack:1.95});}});
  register({id:"teleport",label:"Teletransporte",trailPart:"torso",teleport:true,impactTimes:c=>impacts(c.impacts,.6,.7),sample:(t,c)=>{const v=clamp(t/.3),a=clamp((t-.42)/.22),r=easeInOut(clamp((t-.78)/.22));return withPose({x:(t<.4?0:c.distance)*(1-r),alpha:t>.28&&t<.48?.08:Math.max(.15,1-Math.sin(Math.PI*v)*.85)*(1-a)+a,scaleX:1-.18*Math.sin(Math.PI*v),scaleY:1+.25*Math.sin(Math.PI*v)});}});
  register({id:"sweep",label:"Barrido",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.5,.72),sample:(t,c)=>{const s=easeInOut(clamp((t-.18)/.62));return withPose({x:c.distance*.08*s,y:12*s,body:.42*s,legFront:lerp(1.28,.02,s),shinFront:.08,legBack:2.12,armFront:.35,armBack:2.72,scaleY:.92});}});
  register({id:"grab",label:"Agarre",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.56,.7),sample:(t,c)=>{const r=easeOut(clamp((t-.18)/.36)),p=easeInOut(clamp((t-.58)/.3));return withPose({x:c.distance*.16*r-c.distance*.08*p,body:-.2*r+.35*p,armFront:lerp(.92,.02,r)+.55*p,forearmFront:0,armBack:lerp(2.18,3.1,r)-.55*p,forearmBack:3.14,legFront:1.18,legBack:1.98});}});

  register({id:"elbow-strike",label:"Codazo",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.5,.64),sample:(t,c)=>{const h=easeOut(clamp((t-.22)/.38)),r=easeInOut(clamp((t-.68)/.3));return withPose({x:c.distance*.11*h*(1-r),body:-.34*h,armFront:lerp(.9,-.5,h),forearmFront:lerp(.1,1.4,h),armBack:2.4,legFront:1.12,legBack:2.02});}});
  register({id:"knee-strike",label:"Rodillazo",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.52,.68),sample:(t,c)=>{const h=easeOut(clamp((t-.2)/.42)),r=easeInOut(clamp((t-.7)/.3));return withPose({x:c.distance*.12*h*(1-r),body:-.18*h,legFront:lerp(1.3,-.45,h)*(1-r)+1.3*r,shinFront:lerp(1.72,1.05,h),armFront:.25,armBack:2.8});}});
  register({id:"flying-kick",label:"Patada voladora",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.64,.78),sample:(t,c)=>{const a=Math.sin(Math.PI*t),m=easeInOut(t);return withPose({x:c.distance*.8*m,y:-c.jumpHeight*.7*a,body:-.35,legFront:.02,shinFront:.02,legBack:2.75,shinBack:2.55,armFront:.3,armBack:2.9});}});
  register({id:"double-slash",label:"Doble corte",trailPart:"frontHand",impactTimes:c=>impacts(Math.max(2,c.impacts),.34,.72),sample:(t,c)=>{const phase=t<.5?easeInOut(t*2):easeInOut((t-.5)*2),dir=t<.5?1:-1;return withPose({x:c.distance*.12*easeOut(t),body:.22*dir*phase,armFront:dir>0?lerp(-1.3,.65,phase):lerp(.65,-1.1,phase),forearmFront:.15,armBack:2.4,legFront:1.15,legBack:2});}});
  register({id:"spear-thrust",label:"Estocada",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.6,.74),sample:(t,c)=>{const h=easeInOut(clamp((t-.18)/.6));return withPose({x:c.distance*.35*h,body:-.2,armFront:-.02,forearmFront:-.02,armBack:3.12,forearmBack:3.12,legFront:.95,legBack:2.25,scaleX:1.08});}});
  register({id:"boomerang",label:"Bumerán energético",trailPart:"frontHand",projectile:true,returnProjectile:true,impactTimes:c=>impacts(Math.max(2,c.impacts),.45,.82),sample:(t,c)=>{const s=pulse(t,.18,.16);return withPose({body:-.14*s,armFront:lerp(.9,-.7,s),forearmFront:lerp(.1,-.55,s),armBack:2.45,legFront:1.25,legBack:1.92});}});
  register({id:"laser-beam",label:"Rayo láser",trailPart:"frontHand",projectile:true,beam:true,impactTimes:c=>impacts(Math.max(2,c.impacts),.48,.82),sample:(t,c)=>{const ch=easeOut(clamp(t/.35)),r=pulse(t,.55,.28);return withPose({body:.06*r,armFront:lerp(.9,.02,ch),forearmFront:0,armBack:2.18,forearmBack:1.25,scaleX:1+.03*r});}});
  register({id:"shockwave",label:"Onda de choque",trailPart:"torso",areaEffect:true,impactTimes:c=>impacts(c.impacts,.58,.7),sample:(t,c)=>{const ch=easeOut(clamp(t/.45)),b=pulse(t,.62,.16);return withPose({y:-5*ch,body:.08*b,armFront:lerp(.9,-.25,ch),armBack:lerp(2.18,3.4,ch),forearmFront:-.2,forearmBack:3.25,scaleX:1+.12*b,scaleY:1-.05*b});}});
  register({id:"ground-slam",label:"Golpe al suelo",trailPart:"frontHand",areaEffect:true,impactTimes:c=>impacts(c.impacts,.7,.8),sample:(t,c)=>{const l=easeOut(clamp(t/.38)),s=easeInOut(clamp((t-.4)/.42));return withPose({y:-c.jumpHeight*.25*Math.sin(Math.PI*Math.min(1,t/.7)),body:.55*s,armFront:lerp(.9,-1.7,l)+2.5*s,forearmFront:lerp(.1,-1.6,l)+2.35*s,armBack:lerp(2.18,4.65,l)+2.1*s,forearmBack:4.55,legFront:1.05,legBack:2.1});}});
  register({id:"backflip-kick",label:"Patada con voltereta",trailPart:"frontFoot",impactTimes:c=>impacts(c.impacts,.5,.68),sample:(t,c)=>{const rot=easeInOut(t)*Math.PI*2,a=Math.sin(Math.PI*t);return withPose({x:c.distance*.25*Math.sin(Math.PI*t),y:-c.jumpHeight*.75*a,body:-rot,legFront:.05,shinFront:.1,legBack:2.7,shinBack:2.6,armFront:.4,armBack:2.75});}});
  register({id:"lunge",label:"Embestida",trailPart:"frontHand",impactTimes:c=>impacts(c.impacts,.68,.8),sample:(t,c)=>{const m=easeInOut(clamp((t-.1)/.72));return withPose({x:c.distance*.85*m,body:-.38,armFront:.08,forearmFront:.02,armBack:2.75,forearmBack:2.95,legFront:.82,legBack:2.35,scaleX:1.1,scaleY:.93});}});
  register({id:"meteor-dive",label:"Caída meteórica",trailPart:"frontFoot",areaEffect:true,impactTimes:c=>impacts(c.impacts,.8,.9),sample:(t,c)=>{const up=clamp(t/.38),down=clamp((t-.38)/.55),x=c.distance*.42*easeInOut(t);return withPose({x,y:t<.38?-c.jumpHeight*easeOut(up):-c.jumpHeight*(1-easeIn(down)),body:t<.38?-.25:1.05,armFront:-.2,armBack:3.3,legFront:.3,legBack:2.8,scaleX:1+.08*down,scaleY:1-.08*down});}});
  register({id:"whirlwind",label:"Torbellino",trailPart:"frontFoot",areaEffect:true,impactTimes:c=>impacts(Math.max(4,c.impacts),.22,.82),sample:(t,c)=>{const rot=easeInOut(t)*Math.PI*6;return withPose({x:c.distance*.18*Math.sin(Math.PI*t),body:rot,armFront:.1,forearmFront:.05,armBack:Math.PI+.1,forearmBack:Math.PI+.05,legFront:.15,shinFront:.1,legBack:Math.PI+.15,shinBack:Math.PI+.1,scaleX:1.04,scaleY:.96});}});
  register({id:"rapid-shots",label:"Ráfaga de disparos",trailPart:"frontHand",projectile:true,impactTimes:c=>impacts(Math.max(4,c.impacts),.3,.84),sample:(t,c)=>{const r=Math.max(0,wave(t,Math.max(4,c.impacts)));return withPose({body:.06*r,armFront:.02,forearmFront:.01,armBack:2.25+.08*r,forearmBack:1.35,legFront:1.25,legBack:1.9,x:c.distance*.04*easeOut(t)});}});
  register({id:"energy-wave",label:"Corte de energía",trailPart:"frontHand",projectile:true,waveProjectile:true,impactTimes:c=>impacts(c.impacts,.62,.8),sample:(t,c)=>{const s=easeInOut(clamp((t-.15)/.58));return withPose({x:c.distance*.1*s,body:.18*s,armFront:lerp(-1.25,.55,s),forearmFront:lerp(-1.1,.15,s),armBack:2.3,legFront:1.15,legBack:2.02});}});

  function normalizeSingle(source={},index=0){
    const type=registry.has(source?.type)?source.type:TYPES[index%TYPES.length][0];
    return {
      mode:"single",type,name:String(source?.name||""),
      speed:clamp(Number(source?.speed??DEFAULT_ANIMATION.speed),.25,3),
      distance:clamp(Number(source?.distance??DEFAULT_ANIMATION.distance),0,500),
      impacts:Math.round(clamp(Number(source?.impacts??DEFAULT_ANIMATION.impacts),1,12)),
      duration:clamp(Number(source?.duration??DEFAULT_ANIMATION.duration),.2,6),
      jumpHeight:clamp(Number(source?.jumpHeight??DEFAULT_ANIMATION.jumpHeight),0,320),
      effectSize:clamp(Number(source?.effectSize??DEFAULT_ANIMATION.effectSize),.2,3),
      trailLength:clamp(Number(source?.trailLength??DEFAULT_ANIMATION.trailLength),0,2.5),
      cameraShake:clamp(Number(source?.cameraShake??DEFAULT_ANIMATION.cameraShake),0,2),
      sound:["none","impact","energy","slash","blast"].includes(source?.sound)?source.sound:DEFAULT_ANIMATION.sound,
      pauseAfter:clamp(Number(source?.pauseAfter??DEFAULT_ANIMATION.pauseAfter),0,2)
    };
  }
  function normalize(source={},index=0){
    if(source?.mode==="sequence"||Array.isArray(source?.sequence)){
      const sequence=(Array.isArray(source.sequence)?source.sequence:[]).slice(0,16).map((step,i)=>{
        const animation=normalizeSingle(step?.animation||step,i);
        return {id:String(step?.id||`step-${i+1}`),animation,pauseAfter:clamp(Number(step?.pauseAfter??animation.pauseAfter??.08),0,2)};
      });
      if(!sequence.length)sequence.push({id:"step-1",animation:normalizeSingle(source,index),pauseAfter:.08});
      return {mode:"sequence",name:String(source?.name||"Secuencia personalizada"),type:sequence[0].animation.type,sequence};
    }
    return normalizeSingle(source,index);
  }
  function get(id){return registry.get(id)||registry.get(DEFAULT_ANIMATION.type);}
  function sample(config,t){const c=normalizeSingle(config);return get(c.type).sample(clamp(t),c);}
  function impactTimes(config){const c=normalizeSingle(config);return get(c.type).impactTimes(c);}
  function sequenceOf(config){const normalized=normalize(config);return normalized.mode==="sequence"?normalized.sequence:[{id:"single",animation:normalizeSingle(normalized),pauseAfter:normalized.pauseAfter||0}];}
  function labelFor(config){const normalized=normalize(config);return normalized.mode==="sequence"?(normalized.name||`Secuencia de ${normalized.sequence.length} técnicas`):(normalized.name||labels[normalized.type]||normalized.type);}
  function totalDuration(config,{scale=1}={}){return sequenceOf(config).reduce((sum,step)=>sum+(step.animation.duration/Math.max(.25,step.animation.speed))*scale+step.pauseAfter,0);}

  window.QTEAnimations={
    DEFAULT_ANIMATION,TYPES,labels,registry,register,get,sample,impactTimes,normalize,normalizeSingle,sequenceOf,labelFor,totalDuration,basePose,
    helpers:{clamp,lerp,easeOut,easeIn,easeInOut,pulse,wave,saw}
  };
})();
