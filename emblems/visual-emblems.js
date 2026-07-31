(() => {
  "use strict";
  class VisualEmblem {
    constructor({id,color,glow=8}){this.id=id;this.color=color;this.glow=glow;}
    colorAt(_time,_runtime){return this.color;}
    drawBefore(_ctx,_character,_pose,_runtime,_time,_intensity){}
    drawAfter(_ctx,_character,_pose,_runtime,_time,_intensity){}
    emitPassive(_effects,_anchor,_runtime,_time,_intensity){}
  }
  class ShadowVisual extends VisualEmblem {
    constructor(){super({id:"shadow",color:"#4a236f",glow:12});}
    drawBefore(ctx,ch,pose,runtime,time,intensity){for(let i=3;i>=1;i--)ch.drawGhost(ctx,pose,{bodyColor:"#21102e",limbColor:"#36164d",extremityColor:this.color,glow:6},-i*12*ch.facing,.08*i*intensity);}
  }
  class AssassinVisual extends VisualEmblem {constructor(){super({id:"assassin",color:"#ff1744",glow:18});}}
  class HealerVisual extends VisualEmblem {
    constructor(){super({id:"healer",color:"#36e27a",glow:14});}
    emitPassive(effects,anchor,runtime,time,intensity){if(Math.random()<.18*intensity)effects.particles.emit({x:anchor.x+(Math.random()-.5)*30,y:anchor.y+25,count:1,color:this.color,speed:25,life:.8,size:3,gravity:-25,spread:1.4,direction:-Math.PI/2});}
  }
  class TempoVisual extends VisualEmblem {constructor(){super({id:"tempo",color:"#2196ff",glow:16});}}
  class SquireVisual extends VisualEmblem {
    constructor(){super({id:"squire",color:"#9aa4ad",glow:10});}
    drawBefore(ctx,ch,pose,runtime,time,intensity){const a=ch.anchors(pose).torso;ctx.save();ctx.globalAlpha=.14+.12*Math.sin(time*7)**2;ctx.strokeStyle="#c8d2dc";ctx.lineWidth=4;ctx.shadowColor="#dce8f3";ctx.shadowBlur=14;ctx.beginPath();ctx.ellipse(a.x,a.y,54,82,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  class ChaosVisual extends VisualEmblem {
    constructor(){super({id:"chaos",color:"#ff9d22",glow:18});}
    colorAt(time){return `hsl(${(time*190)%360} 94% 58%)`;}
    emitPassive(effects,anchor,runtime,time,intensity){if(Math.random()<.28*intensity)effects.particles.emit({x:anchor.x+(Math.random()-.5)*50,y:anchor.y+(Math.random()-.5)*70,count:1,color:`hsl(${Math.random()*360} 95% 60%)`,speed:65,life:.35,size:3,gravity:0,shape:"square"});}
  }
  class VengeanceVisual extends VisualEmblem {
    constructor(){super({id:"vengeance",color:"#8b0000",glow:16});}
    drawBefore(ctx,ch,pose,runtime,time,intensity){if(!runtime?.vengeanceActive)return;const a=ch.anchors(pose).torso,pulse=.65+.35*Math.sin(time*9);ctx.save();ctx.globalAlpha=.16*pulse*intensity;ctx.fillStyle="#d10b16";ctx.shadowColor="#ff1e2f";ctx.shadowBlur=26;ctx.beginPath();ctx.arc(a.x,a.y,62+8*pulse,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  class MirrorVisual extends VisualEmblem {
    constructor(){super({id:"mirror",color:"#eef5ff",glow:20});}
    drawAfter(ctx,ch,pose,runtime,time,intensity){const a=ch.anchors(pose).torso;ctx.save();ctx.globalAlpha=.18*intensity;ctx.strokeStyle="#ffffff";ctx.lineWidth=2;ctx.shadowColor="#d7e8ff";ctx.shadowBlur=20;ctx.beginPath();ctx.arc(a.x,a.y,48+4*Math.sin(time*5),0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  class VisualEmblemRegistry {
    constructor(){this.items=new Map();}
    register(item){this.items.set(item.id,item);return item;}
    get(id){return this.items.get(id)||null;}
    visual(id,time=0,runtime=null){const item=this.get(id);return item?{item,extremityColor:item.colorAt(time,runtime),glow:item.glow}:{item:null,extremityColor:"#47dfff",glow:8};}
  }
  const registry=new VisualEmblemRegistry();
  [ShadowVisual,AssassinVisual,HealerVisual,TempoVisual,SquireVisual,ChaosVisual,VengeanceVisual,MirrorVisual].forEach(C=>registry.register(new C()));
  window.QTEVisualEmblems={VisualEmblem,registry,get:id=>registry.get(id)};
})();
