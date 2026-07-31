(() => {
  "use strict";
  const Anim=window.QTEAnimations;
  const Characters=window.QTECharacters;
  const {EffectSystem,profileFor}=window.QTEEffects;
  const {CameraController}=window.QTECamera;
  const VEmblems=window.QTEVisualEmblems;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));

  class CombatVisualRenderer {
    constructor(canvas,{preview=false}={}){
      if(!canvas)throw new Error("CombatVisualRenderer necesita un canvas.");
      this.canvas=canvas;this.ctx=canvas.getContext("2d",{alpha:true});this.preview=preview;
      this.effects=new EffectSystem();this.camera=new CameraController();this.running=false;this.raf=0;this.last=0;this.width=0;this.height=0;
      this.player=Characters.create("stickman",{bodyColor:"#c9f6ff",accentColor:"#47dfff",name:"Jugador",facing:1});
      this.enemy=Characters.create("stickman",{bodyColor:"#ead9ff",accentColor:"#c56fff",name:"Rival",facing:-1});
      this.idlePose=Anim.basePose();this.activePose={player:{...this.idlePose},enemy:{...this.idlePose}};this.activeVisual={player:null,enemy:null};this.activeRuntime={player:null,enemy:null};
      this.backgroundAlpha=1;this.boundResize=()=>this.resize();
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(this.boundResize);this.resizeObserver.observe(canvas);}else window.addEventListener("resize",this.boundResize,{passive:true});
      this.resize();
    }
    resize(){
      const rect=this.canvas.getBoundingClientRect(),host=this.canvas.parentElement?.getBoundingClientRect?.(),dpr=Math.min(2,window.devicePixelRatio||1);
      const w=Math.max(280,Math.round(host?.width||rect.width||800));
      const h=Math.max(180,Math.round(host?.height||rect.height||420));
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
      this.canvas.style.width="100%";this.canvas.style.height="100%";
      this.width=w;this.height=h;this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.backdropGradient=this.ctx.createLinearGradient(0,0,0,h);this.backdropGradient.addColorStop(0,"rgba(3,10,24,.05)");this.backdropGradient.addColorStop(.55,"rgba(7,15,33,.25)");this.backdropGradient.addColorStop(1,"rgba(2,7,18,.72)");
      this.glowGradient=this.ctx.createRadialGradient(w/2,h*.8-30,0,w/2,h*.8-30,w*.42);this.glowGradient.addColorStop(0,"rgba(101,72,255,.18)");this.glowGradient.addColorStop(1,"transparent");
      const ground=h*(this.preview?.78:.8);this.player.setPosition(w*.24,ground);this.enemy.setPosition(w*.76,ground);
    }
    destroy(){cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();window.removeEventListener("resize",this.boundResize);this.effects.clear();}
    clear(){this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.clearRect(0,0,this.width,this.height);}
    drawBackdrop(ctx,time){
      const w=this.width,h=this.height,ground=h*.8;
      ctx.save();
      ctx.fillStyle=this.backdropGradient;ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="rgba(79,214,255,.13)";ctx.lineWidth=1;
      for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(w/2,ground-5);ctx.lineTo(w/2+i*w*.13,h);ctx.stroke();}
      for(let i=0;i<6;i++){const y=ground+i*i*4;ctx.globalAlpha=.5-i*.06;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.fillStyle=this.glowGradient;ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
    visualFor(side,time){
      const runtime=this.activeRuntime[side],id=runtime?.emblemId||runtime?.emblem?.id||null,entry=VEmblems.registry.visual(id,time,runtime);
      return {bodyColor:side==="player"?"#c9f6ff":"#ead9ff",limbColor:side==="player"?"#8fd8ea":"#c6a5e8",extremityColor:entry.extremityColor,glow:entry.glow,item:entry.item,alpha:1};
    }
    drawCharacter(ctx,side,time,intensity=1){
      const ch=side==="player"?this.player:this.enemy,pose=this.activePose[side],runtime=this.activeRuntime[side],visual=this.visualFor(side,time),item=visual.item;
      item?.drawBefore(ctx,ch,pose,runtime,time,intensity);ch.draw(ctx,pose,visual);item?.drawAfter(ctx,ch,pose,runtime,time,intensity);
      item?.emitPassive(this.effects,ch.anchors(pose).torso,runtime,time,intensity);
    }
    drawScene(time,dt){
      const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.save();this.camera.apply(ctx,this.width,this.height);this.drawBackdrop(ctx,time);this.effects.draw(ctx);this.drawCharacter(ctx,"player",time,1);this.drawCharacter(ctx,"enemy",time,1);ctx.restore();
      this.drawLabels(ctx,time);this.effects.update(dt);this.player.updateRecoil(dt);this.enemy.updateRecoil(dt);this.camera.update(dt);
    }
    drawLabels(ctx,time){
      ctx.save();ctx.font="600 13px system-ui, sans-serif";ctx.textAlign="center";
      for(const [side,ch] of [["player",this.player],["enemy",this.enemy]]){const runtime=this.activeRuntime[side],em=runtime?.emblem;const x=ch.x,y=this.height*.12;ctx.fillStyle=side==="player"?"rgba(117,229,255,.94)":"rgba(216,151,255,.94)";ctx.fillText(side==="player"?"JUGADOR":"RIVAL",x,y);if(em){ctx.font="500 11px system-ui, sans-serif";ctx.fillStyle=em.color||"#fff";ctx.fillText(`${em.icon||""} ${em.name||""}`,x,y+18);ctx.font="600 13px system-ui, sans-serif";}}
      ctx.restore();
    }
    idleFrame(time=performance.now()/1000){this.activePose.player=Anim.basePose();this.activePose.enemy=Anim.basePose();this.drawScene(time,1/60);}
    async playExecution(execution,side="player",{label=""}={}){
      if(!execution)return;
      this.resize();this.effects.clear();this.camera.reset();
      const runtime=execution.runtime||{},card=runtime.card||execution.card||{},config=Anim.normalize(card.animation||execution.card?.animation||{}),descriptor=Anim.get(config.type),profile=profileFor(execution.result?.accuracy||0);
      this.activeRuntime[side]=runtime;const other=side==="player"?"enemy":"player";if(!this.activeRuntime[other])this.activeRuntime[other]={emblemId:null,emblem:null};
      const actor=side==="player"?this.player:this.enemy,target=side==="player"?this.enemy:this.player;
      const duration=Math.max(.18,config.duration/Math.max(.25,config.speed)*profile.duration);const impacts=Anim.impactTimes(config);let nextImpact=0,lastTime=performance.now(),start=lastTime,trailAccumulator=0;
      this.running=true;
      await new Promise(resolve=>{
        const frame=(now)=>{
          if(!this.running){resolve();return;}
          const elapsed=(now-start)/1000,t=clamp(elapsed/duration),dt=Math.min(.04,(now-lastTime)/1000||1/60);lastTime=now;
          const pose=descriptor.sample(t,config);this.activePose[side]=pose;this.activePose[other]={...this.idlePose,x:target.recoil};
          const anchors=actor.anchors(pose),trailAnchor=anchors[descriptor.trailPart]||anchors.frontHand;
          trailAccumulator+=dt;if(trailAccumulator>=1/60){trailAccumulator=0;this.effects.addTrail(trailAnchor,profile,config,this.visualFor(side,elapsed).extremityColor);}
          if(descriptor.projectile&&t>.35&&t<.82){const travel=clamp((t-.35)/.47),x=actor.x+(target.x-actor.x)*travel,y=anchors.frontHand.y-12*Math.sin(Math.PI*travel);this.effects.addTrail({x,y},profile,{...config,trailLength:Math.max(.5,config.trailLength)},profile.color);}
          while(nextImpact<impacts.length&&t>=impacts[nextImpact]){
            const targetAnchor=target.anchors(this.activePose[other]).torso;const visual=this.visualFor(side,elapsed);this.effects.impact({x:targetAnchor.x,y:targetAnchor.y-8,profile,config,camera:this.camera,direction:actor.facing,emblemColor:visual.extremityColor});target.recoil=Math.max(target.recoil,24*profile.impact);nextImpact++;
          }
          if(descriptor.teleport)this.camera.follow((pose.x||0)*actor.facing*.12,0,1+.03*Math.sin(Math.PI*t));
          else if(["dash","charge","jump"].includes(config.type))this.camera.follow((pose.x||0)*actor.facing*.18,(pose.y||0)*.08,1+.025*profile.impact);
          else this.camera.follow(0,0,1);
          this.drawScene(now/1000,dt);
          if(t>=1&&this.effects.flashes.length===0){this.running=false;this.activePose[side]=Anim.basePose();setTimeout(resolve,70);return;}
          this.raf=requestAnimationFrame(frame);
        };
        this.raf=requestAnimationFrame(frame);
      });
    }
    async playTurn({playerExecutions=[],enemyExecutions=[]}={}){
      this.running=true;
      for(const execution of playerExecutions)await this.playExecution(execution,"player");
      for(const execution of enemyExecutions)await this.playExecution(execution,"enemy");
      this.running=false;this.activePose.player=Anim.basePose();this.activePose.enemy=Anim.basePose();this.idleFrame();
    }
    stop(){this.running=false;cancelAnimationFrame(this.raf);this.effects.clear();}
  }

  const instances=new WeakMap();
  function getRenderer(canvas,options={}){if(!canvas)return null;if(!instances.has(canvas))instances.set(canvas,new CombatVisualRenderer(canvas,options));return instances.get(canvas);}
  async function preview(canvas,config,emblemId="shadow",accuracy=96){
    const renderer=getRenderer(canvas,{preview:true});renderer.stop();renderer.activeRuntime.player={emblemId,emblem:window.QTEEmblems?.get?.(emblemId)||null,vengeanceActive:emblemId==="vengeance"};renderer.activeRuntime.enemy={emblemId:"squire",emblem:window.QTEEmblems?.get?.("squire")||null};
    const total=8,correct=Math.round(total*Math.max(0,Math.min(100,Number(accuracy)||0))/100);const result={accuracy:Number(accuracy)||0,correct,incorrect:Math.max(0,total-correct),missed:0,total,realTime:1.8,netPower:4.2};const card={nombre:"Previsualización",animation:Anim.normalize(config)};await renderer.playExecution({card,runtime:{card,emblemId,emblem:window.QTEEmblems?.get?.(emblemId)||null,vengeanceActive:emblemId==="vengeance"},result},"player");
  }
  window.QTECombatVisuals={CombatVisualRenderer,getRenderer,preview};
})();
