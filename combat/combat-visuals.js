(() => {
  "use strict";
  const Anim=window.QTEAnimations;
  const Characters=window.QTECharacters;
  const {EffectSystem,profileFor}=window.QTEEffects;
  const {CameraController}=window.QTECamera;
  const VEmblems=window.QTEVisualEmblems;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const COMBAT_DURATION_SCALE=2.15;
  const PREVIEW_DURATION_SCALE=1.25;

  class CombatVisualRenderer{
    constructor(canvas,{preview=false}={}){
      if(!canvas)throw new Error("CombatVisualRenderer necesita un canvas.");
      this.canvas=canvas;this.ctx=canvas.getContext("2d",{alpha:true});this.preview=preview;
      this.effects=new EffectSystem();this.camera=new CameraController();this.running=false;this.raf=0;this.runToken=0;this.width=0;this.height=0;
      this.player=Characters.create("stickman",{bodyColor:"#c9f6ff",accentColor:"#47dfff",name:"Jugador",facing:1});
      this.enemy=Characters.create("stickman",{bodyColor:"#ead9ff",accentColor:"#c56fff",name:"Rival",facing:-1});
      this.idlePose=Anim.basePose();this.activePose={player:{...this.idlePose},enemy:{...this.idlePose}};this.activeRuntime={player:null,enemy:null};
      this.boundResize=()=>this.resize();
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(this.boundResize);this.resizeObserver.observe(canvas);}else window.addEventListener("resize",this.boundResize,{passive:true});
      this.resize();
    }
    resize(){
      const rect=this.canvas.getBoundingClientRect(),host=this.canvas.parentElement?.getBoundingClientRect?.(),dpr=Math.min(2,window.devicePixelRatio||1);
      const w=Math.max(280,Math.round(host?.width||rect.width||800)),h=Math.max(180,Math.round(host?.height||rect.height||420));
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
      this.canvas.style.width="100%";this.canvas.style.height="100%";this.width=w;this.height=h;this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.backdropGradient=this.ctx.createLinearGradient(0,0,0,h);this.backdropGradient.addColorStop(0,"rgba(3,10,24,.05)");this.backdropGradient.addColorStop(.55,"rgba(7,15,33,.25)");this.backdropGradient.addColorStop(1,"rgba(2,7,18,.72)");
      this.glowGradient=this.ctx.createRadialGradient(w/2,h*.8-30,0,w/2,h*.8-30,w*.42);this.glowGradient.addColorStop(0,"rgba(101,72,255,.18)");this.glowGradient.addColorStop(1,"transparent");
      const ground=h*(this.preview?.78:.8);this.player.setPosition(w*.24,ground);this.enemy.setPosition(w*.76,ground);
    }
    destroy(){this.stop();this.resizeObserver?.disconnect();window.removeEventListener("resize",this.boundResize);}
    drawBackdrop(ctx){
      const w=this.width,h=this.height,ground=h*.8;ctx.save();ctx.fillStyle=this.backdropGradient;ctx.fillRect(0,0,w,h);ctx.strokeStyle="rgba(79,214,255,.13)";ctx.lineWidth=1;
      for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(w/2,ground-5);ctx.lineTo(w/2+i*w*.13,h);ctx.stroke();}
      for(let i=0;i<6;i++){const y=ground+i*i*4;ctx.globalAlpha=.5-i*.06;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.fillStyle=this.glowGradient;ctx.fillRect(0,0,w,h);ctx.restore();
    }
    visualFor(side,time){
      const runtime=this.activeRuntime[side],id=runtime?.emblemId||runtime?.emblem?.id||null,entry=VEmblems.registry.visual(id,time,runtime);
      return{bodyColor:side==="player"?"#c9f6ff":"#ead9ff",limbColor:side==="player"?"#8fd8ea":"#c6a5e8",extremityColor:entry.extremityColor,glow:entry.glow,item:entry.item,alpha:1};
    }
    drawCharacter(ctx,side,time,intensity=1){
      const ch=side==="player"?this.player:this.enemy,pose=this.activePose[side],runtime=this.activeRuntime[side],visual=this.visualFor(side,time),item=visual.item;
      item?.drawBefore(ctx,ch,pose,runtime,time,intensity);ch.draw(ctx,pose,visual);item?.drawAfter(ctx,ch,pose,runtime,time,intensity);item?.emitPassive(this.effects,ch.anchors(pose).torso,runtime,time,intensity);
    }
    drawScene(time,dt){
      const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.save();this.camera.apply(ctx,this.width,this.height);this.drawBackdrop(ctx);this.effects.draw(ctx);this.drawCharacter(ctx,"player",time,1);this.drawCharacter(ctx,"enemy",time,1);ctx.restore();this.drawLabels(ctx);this.effects.update(dt);this.player.updateRecoil(dt);this.enemy.updateRecoil(dt);this.camera.update(dt);
    }
    drawLabels(ctx){
      ctx.save();ctx.font="600 13px system-ui, sans-serif";ctx.textAlign="center";
      for(const[side,ch]of[["player",this.player],["enemy",this.enemy]]){const runtime=this.activeRuntime[side],em=runtime?.emblem;ctx.fillStyle=side==="player"?"rgba(117,229,255,.94)":"rgba(216,151,255,.94)";ctx.fillText(side==="player"?"JUGADOR":"RIVAL",ch.x,this.height*.12);if(em){ctx.font="500 11px system-ui, sans-serif";ctx.fillStyle=em.color||"#fff";ctx.fillText(`${em.icon||""} ${em.name||""}`,ch.x,this.height*.12+18);ctx.font="600 13px system-ui, sans-serif";}}
      ctx.restore();
    }
    idleFrame(time=performance.now()/1000){this.activePose.player=Anim.basePose();this.activePose.enemy=Anim.basePose();this.drawScene(time,1/60);}
    async wait(seconds,token){
      if(!(seconds>0))return;const start=performance.now();
      await new Promise(resolve=>{const frame=now=>{if(token!==this.runToken){resolve();return;}this.drawScene(now/1000,1/60);if((now-start)/1000>=seconds){resolve();return;}this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);});
    }
    projectilePoint(descriptor,t,actor,target,anchors){
      let travel=clamp((t-.28)/.58);if(descriptor.returnProjectile)travel=travel<.5?travel*2:(1-travel)*2;
      const x=actor.x+(target.x-actor.x)*travel,y=anchors.frontHand.y-18*Math.sin(Math.PI*travel);
      return{x,y};
    }
    async playSingleStep(execution,side,config,token){
      const runtime=execution.runtime||{},descriptor=Anim.get(config.type),profile=profileFor(execution.result?.accuracy||0),actor=side==="player"?this.player:this.enemy,target=side==="player"?this.enemy:this.player,other=side==="player"?"enemy":"player";
      const scale=this.preview?PREVIEW_DURATION_SCALE:COMBAT_DURATION_SCALE;
      const duration=Math.max(.32,(config.duration/Math.max(.25,config.speed))*profile.duration*scale),impactList=Anim.impactTimes(config);let nextImpact=0,last=performance.now(),start=last,trailAccumulator=0;
      await new Promise(resolve=>{
        const frame=now=>{
          if(token!==this.runToken){resolve();return;}
          const elapsed=(now-start)/1000,t=clamp(elapsed/duration),dt=Math.min(.04,(now-last)/1000||1/60);last=now;
          const pose=descriptor.sample(t,config);this.activePose[side]=pose;this.activePose[other]={...this.idlePose,x:target.recoil};
          const anchors=actor.anchors(pose),trailAnchor=anchors[descriptor.trailPart]||anchors.frontHand;trailAccumulator+=dt;
          if(trailAccumulator>=1/60){trailAccumulator=0;this.effects.addTrail(trailAnchor,profile,config,this.visualFor(side,elapsed).extremityColor);}
          if(descriptor.projectile&&t>.25&&t<.9){
            const point=this.projectilePoint(descriptor,t,actor,target,anchors);this.effects.addTrail(point,profile,{...config,trailLength:Math.max(.65,config.trailLength)},profile.color);
            if(descriptor.beam){for(let i=1;i<6;i++)this.effects.addTrail({x:anchors.frontHand.x+(point.x-anchors.frontHand.x)*i/6,y:anchors.frontHand.y+(point.y-anchors.frontHand.y)*i/6},profile,{...config,trailLength:.32,effectSize:config.effectSize*.7},profile.color);}
          }
          while(nextImpact<impactList.length&&t>=impactList[nextImpact]){const targetAnchor=target.anchors(this.activePose[other]).torso,visual=this.visualFor(side,elapsed);this.effects.impact({x:targetAnchor.x,y:targetAnchor.y-8,profile,config,camera:this.camera,direction:actor.facing,emblemColor:visual.extremityColor});target.recoil=Math.max(target.recoil,24*profile.impact);nextImpact++;}
          if(descriptor.teleport)this.camera.follow((pose.x||0)*actor.facing*.12,0,1+.03*Math.sin(Math.PI*t));
          else if(["dash","charge","jump","flying-kick","lunge","meteor-dive","backflip-kick"].includes(config.type))this.camera.follow((pose.x||0)*actor.facing*.18,(pose.y||0)*.08,1+.025*profile.impact);
          else this.camera.follow(0,0,1);
          this.drawScene(now/1000,dt);
          if(t>=1){this.activePose[side]=Anim.basePose();resolve();return;}this.raf=requestAnimationFrame(frame);
        };this.raf=requestAnimationFrame(frame);
      });
    }
    async playExecution(execution,side="player",{onStep=null}={}){
      if(!execution)return;this.resize();this.effects.clear();this.camera.reset();this.running=true;const token=++this.runToken;
      const runtime=execution.runtime||{},card=runtime.card||execution.card||{},sequence=Anim.sequenceOf(card.animation||execution.card?.animation||{});
      this.activeRuntime[side]=runtime;const other=side==="player"?"enemy":"player";if(!this.activeRuntime[other])this.activeRuntime[other]={emblemId:null,emblem:null};
      for(let index=0;index<sequence.length&&token===this.runToken;index++){
        const step=sequence[index];onStep?.(step,index,sequence.length);await this.playSingleStep(execution,side,step.animation,token);await this.wait(step.pauseAfter,token);
      }
      if(token===this.runToken){this.running=false;this.activePose[side]=Anim.basePose();this.idleFrame();}
    }
    async playTurn({playerExecutions=[],enemyExecutions=[]}={}){for(const execution of playerExecutions)await this.playExecution(execution,"player");for(const execution of enemyExecutions)await this.playExecution(execution,"enemy");}
    stop(){this.running=false;this.runToken++;cancelAnimationFrame(this.raf);this.effects.clear();this.activePose.player=Anim.basePose();this.activePose.enemy=Anim.basePose();}
  }

  const instances=new WeakMap();
  function getRenderer(canvas,options={}){if(!canvas)return null;if(!instances.has(canvas))instances.set(canvas,new CombatVisualRenderer(canvas,options));return instances.get(canvas);}
  async function preview(canvas,config,emblemId="shadow",accuracy=96){
    const renderer=getRenderer(canvas,{preview:true});renderer.stop();renderer.activeRuntime.player={emblemId,emblem:window.QTEEmblems?.get?.(emblemId)||null,vengeanceActive:emblemId==="vengeance"};renderer.activeRuntime.enemy={emblemId:"squire",emblem:window.QTEEmblems?.get?.("squire")||null};
    const total=8,correct=Math.round(total*Math.max(0,Math.min(100,Number(accuracy)||0))/100),result={accuracy:Number(accuracy)||0,correct,incorrect:Math.max(0,total-correct),missed:0,total,realTime:1.8,netPower:4.2},card={nombre:"Previsualización",animation:Anim.normalize(config)};
    await renderer.playExecution({card,runtime:{card,emblemId,emblem:window.QTEEmblems?.get?.(emblemId)||null,vengeanceActive:emblemId==="vengeance"},result},"player");
  }
  window.QTECombatVisuals={CombatVisualRenderer,getRenderer,preview,COMBAT_DURATION_SCALE};
})();
