(() => {
  "use strict";
  const {ParticlePool}=window.QTEParticles;
  const TIERS=[
    {max:19.999,color:"#ff2b2b",name:"Rojo",particles:.35,brightness:.55,trail:.32,impact:.45,duration:1.22},
    {max:39.999,color:"#ff8a1f",name:"Naranja",particles:.55,brightness:.7,trail:.48,impact:.65,duration:1.12},
    {max:59.999,color:"#ffd629",name:"Amarillo",particles:.8,brightness:.85,trail:.62,impact:.82,duration:1.04},
    {max:79.999,color:"#43e36d",name:"Verde",particles:1,brightness:1,trail:.8,impact:1,duration:1},
    {max:89.999,color:"#22e2cc",name:"Turquesa",particles:1.35,brightness:1.18,trail:1.05,impact:1.25,duration:.94},
    {max:100,color:"#69dfff",name:"Celeste",particles:1.8,brightness:1.42,trail:1.35,impact:1.55,duration:.86}
  ];
  const profileFor=accuracy=>TIERS.find(t=>Number(accuracy)<=t.max)||TIERS[TIERS.length-1];

  class TrailPool {
    constructor(capacity=100){this.items=Array.from({length:capacity},()=>({active:false,x:0,y:0,life:0,maxLife:1,size:8,color:"#fff"}));this.cursor=0;}
    add(x,y,{life=.45,size=10,color="#fff"}={}){const item=this.items[this.cursor];this.cursor=(this.cursor+1)%this.items.length;Object.assign(item,{active:true,x,y,life,maxLife:life,size,color});}
    update(dt){for(const t of this.items){if(!t.active)continue;t.life-=dt;if(t.life<=0)t.active=false;}}
    draw(ctx){for(const t of this.items){if(!t.active)continue;const a=t.life/t.maxLife;ctx.save();ctx.globalAlpha=a*a*.62;ctx.fillStyle=t.color;ctx.shadowColor=t.color;ctx.shadowBlur=t.size*1.6;ctx.beginPath();ctx.arc(t.x,t.y,t.size*(.45+.55*a),0,Math.PI*2);ctx.fill();ctx.restore();}}
    clear(){for(const t of this.items)t.active=false;}
  }

  class SoundSynth {
    constructor(){this.context=null;}
    ensure(){if(!this.context)this.context=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==="suspended")this.context.resume();return this.context;}
    play(type="impact",strength=1){if(type==="none")return;try{const ctx=this.ensure(),now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);const map={impact:[110,"square"],energy:[480,"sine"],slash:[260,"sawtooth"],blast:[70,"triangle"]};const [freq,wave]=map[type]||map.impact;osc.type=wave;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.38),now+.16);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.min(.18,.05+.07*strength),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.2);osc.start(now);osc.stop(now+.22);}catch(_error){}}
  }

  class EffectSystem {
    constructor(){this.particles=new ParticlePool(280);this.trails=new TrailPool(130);this.flashes=[];this.sound=new SoundSynth();}
    clear(){this.particles.clear();this.trails.clear();this.flashes.length=0;}
    addTrail(anchor,profile,config,color=profile.color){if(!anchor||config.trailLength<=0)return;this.trails.add(anchor.x,anchor.y,{life:.18+config.trailLength*.42,size:(7+config.effectSize*5)*profile.trail,color});}
    impact({x,y,profile,config,camera,direction=1,emblemColor=null}){
      const strength=profile.impact*config.effectSize;
      this.flashes.push({x,y,life:.16,maxLife:.16,size:28+42*strength,color:profile.color});
      this.particles.emit({x,y,count:Math.round((8+14*config.effectSize)*profile.particles),color:profile.color,speed:130+110*strength,life:.35+.25*profile.brightness,size:2.5+2*config.effectSize,gravity:65,spread:Math.PI*1.45,direction:direction>0?Math.PI:0,shape:"spark"});
      if(emblemColor&&emblemColor!==profile.color)this.particles.emit({x,y,count:Math.round(5*profile.particles),color:emblemColor,speed:90,life:.45,size:3,gravity:10,shape:"circle"});
      camera?.shake(config.cameraShake*profile.impact,.16+.08*profile.impact);camera?.punchZoom(.025+.055*config.cameraShake*profile.impact,.22);
      this.sound.play(config.sound,profile.impact);
    }
    update(dt){this.particles.update(dt);this.trails.update(dt);for(const f of this.flashes)f.life-=dt;this.flashes=this.flashes.filter(f=>f.life>0);}
    draw(ctx){this.trails.draw(ctx);this.particles.draw(ctx);for(const f of this.flashes){const a=f.life/f.maxLife;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=a;const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.size);g.addColorStop(0,"#fff");g.addColorStop(.22,f.color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,f.size,0,Math.PI*2);ctx.fill();ctx.restore();}}
  }
  window.QTEEffects={EffectSystem,profileFor,TIERS};
})();
