(() => {
  "use strict";
  class ParticlePool {
    constructor(capacity=240){
      this.items=Array.from({length:capacity},()=>({active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:1,size:2,color:"#fff",gravity:0,drag:.98,shape:"circle",rotation:0,spin:0,alpha:1}));
      this.cursor=0;
    }
    acquire(){
      for(let i=0;i<this.items.length;i++){
        const index=(this.cursor+i)%this.items.length;
        if(!this.items[index].active){this.cursor=(index+1)%this.items.length;return this.items[index];}
      }
      const item=this.items[this.cursor];this.cursor=(this.cursor+1)%this.items.length;return item;
    }
    emit({x=0,y=0,count=8,color="#fff",speed=150,life=.55,size=3,gravity=80,spread=Math.PI*2,direction=0,shape="circle",alpha=1}={}){
      const n=Math.max(0,Math.floor(count));
      for(let i=0;i<n;i++){
        const p=this.acquire(),angle=direction+(Math.random()-.5)*spread,velocity=speed*(.45+Math.random()*.75);
        Object.assign(p,{active:true,x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life:life*(.7+Math.random()*.6),maxLife:life,size:size*(.6+Math.random()*.8),color,gravity,drag:.965+Math.random()*.025,shape,rotation:Math.random()*Math.PI*2,spin:(Math.random()-.5)*8,alpha});
      }
    }
    update(dt){
      for(const p of this.items){if(!p.active)continue;p.life-=dt;if(p.life<=0){p.active=false;continue;}p.vy+=p.gravity*dt;p.vx*=Math.pow(p.drag,dt*60);p.vy*=Math.pow(p.drag,dt*60);p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;}
    }
    draw(ctx){
      for(const p of this.items){if(!p.active)continue;const a=Math.max(0,p.life/p.maxLife)*p.alpha;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.rotation);if(p.shape==="spark"){ctx.fillRect(-p.size*1.8,-p.size*.35,p.size*3.6,p.size*.7);}else if(p.shape==="square"){ctx.fillRect(-p.size,-p.size,p.size*2,p.size*2);}else{ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();}ctx.restore();}
    }
    clear(){for(const p of this.items)p.active=false;}
  }
  window.QTEParticles={ParticlePool};
})();
