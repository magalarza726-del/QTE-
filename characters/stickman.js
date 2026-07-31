(() => {
  "use strict";
  const point=(origin,angle,length)=>({x:origin.x+Math.cos(angle)*length,y:origin.y+Math.sin(angle)*length});
  const mix=(a,b,t)=>a+(b-a)*t;
  class StickmanCharacter {
    constructor({x=0,ground=0,facing=1,bodyColor="#dcecff",accentColor="#47dfff",name="Jugador"}={}){
      this.x=x;this.ground=ground;this.facing=facing;this.bodyColor=bodyColor;this.accentColor=accentColor;this.name=name;this.recoil=0;this.alpha=1;
    }
    setPosition(x,ground){this.x=x;this.ground=ground;}
    getSkeleton(pose={}){
      const p={x:0,y:0,body:0,headX:0,headY:0,armBack:2.18,forearmBack:1.25,armFront:.92,forearmFront:.05,legBack:1.86,shinBack:1.42,legFront:1.29,shinFront:1.72,scaleX:1,scaleY:1,alpha:1,...pose};
      const origin={x:this.x+(p.x||0)*this.facing+this.recoil*this.facing,y:this.ground+(p.y||0)};
      const local=(pt)=>({x:origin.x+pt.x*this.facing*(p.scaleX||1),y:origin.y+pt.y*(p.scaleY||1)});
      const hip=local({x:0,y:-58}),shoulder=local({x:Math.sin(p.body)*20,y:-116+Math.cos(p.body)*5}),head=local({x:Math.sin(p.body)*23+(p.headX||0),y:-150+(p.headY||0)});
      const limb=(start,a1,l1,a2,l2)=>{const knee=point(start,this.facing===1?a1:Math.PI-a1,l1);const end=point(knee,this.facing===1?a2:Math.PI-a2,l2);return {mid:knee,end};};
      const armBack=limb(shoulder,p.armBack,39,p.forearmBack,34),armFront=limb(shoulder,p.armFront,39,p.forearmFront,34);
      const legBack=limb(hip,p.legBack,46,p.shinBack,43),legFront=limb(hip,p.legFront,46,p.shinFront,43);
      return {pose:p,origin,hip,shoulder,head,armBack,armFront,legBack,legFront};
    }
    anchors(pose={}){
      const s=this.getSkeleton(pose);
      return {torso:{x:(s.hip.x+s.shoulder.x)/2,y:(s.hip.y+s.shoulder.y)/2},frontHand:s.armFront.end,backHand:s.armBack.end,frontFoot:s.legFront.end,backFoot:s.legBack.end,head:s.head};
    }
    draw(ctx,pose={},visual={}){
      const s=this.getSkeleton(pose),alpha=Math.max(0,Math.min(1,(pose.alpha??1)*this.alpha*(visual.alpha??1)));
      const body=visual.bodyColor||this.bodyColor,limb=visual.limbColor||body,extremity=visual.extremityColor||this.accentColor,glow=visual.glow||0;
      ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap="round";ctx.lineJoin="round";
      if(glow){ctx.shadowColor=extremity;ctx.shadowBlur=glow;}
      const segment=(a,b,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
      segment(s.hip,s.shoulder,18,body);
      segment(s.shoulder,s.armBack.mid,13,limb);segment(s.armBack.mid,s.armBack.end,12,limb);
      segment(s.hip,s.legBack.mid,15,limb);segment(s.legBack.mid,s.legBack.end,14,limb);
      segment(s.shoulder,s.armFront.mid,14,limb);segment(s.armFront.mid,s.armFront.end,13,limb);
      segment(s.hip,s.legFront.mid,16,limb);segment(s.legFront.mid,s.legFront.end,15,limb);
      ctx.fillStyle=body;ctx.beginPath();ctx.arc(s.head.x,s.head.y,18,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=extremity;for(const hand of [s.armBack.end,s.armFront.end]){ctx.beginPath();ctx.arc(hand.x,hand.y,9,0,Math.PI*2);ctx.fill();}
      for(const foot of [s.legBack.end,s.legFront.end]){ctx.save();ctx.translate(foot.x,foot.y);ctx.rotate(this.facing===1?0:Math.PI);ctx.fillRect(-5,-6,24,12);ctx.restore();}
      ctx.restore();
    }
    drawGhost(ctx,pose,visual,offsetX=0,alpha=.16){
      const old=this.x;this.x+=offsetX;this.draw(ctx,pose,{...visual,alpha});this.x=old;
    }
    updateRecoil(dt){this.recoil=mix(this.recoil,0,Math.min(1,dt*8));}
  }
  class CharacterRegistry {
    constructor(){this.factories=new Map();this.defaultId="stickman";}
    register(id,factory){if(typeof factory!=="function")throw new TypeError("El adaptador de personaje debe ser una función.");this.factories.set(id,factory);return this;}
    create(id=this.defaultId,options={}){const factory=this.factories.get(id)||this.factories.get(this.defaultId);if(!factory)throw new Error(`Personaje no registrado: ${id}`);return factory(options);}
  }
  const registry=new CharacterRegistry();
  registry.register("stickman",options=>new StickmanCharacter(options));
  window.QTECharacters={StickmanCharacter,CharacterRegistry,registry,register:(id,factory)=>registry.register(id,factory),create:(id,options)=>registry.create(id,options)};
})();
