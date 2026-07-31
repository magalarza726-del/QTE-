(() => {
  "use strict";
  const BUILTIN_TRACKS=[
    {id:"proc-neon-rush",name:"Neon Rush",bpm:132,root:110,scale:[0,3,5,7,10],wave:"sawtooth",pattern:[0,2,4,3,2,1,3,4]},
    {id:"proc-shadow-grid",name:"Shadow Grid",bpm:104,root:82.41,scale:[0,2,3,7,8],wave:"triangle",pattern:[0,0,3,2,1,4,2,1]},
    {id:"proc-tempo-drive",name:"Tempo Drive",bpm:148,root:123.47,scale:[0,2,5,7,9],wave:"square",pattern:[0,1,2,4,3,2,1,4]},
    {id:"proc-chaos-circuit",name:"Chaos Circuit",bpm:156,root:92.5,scale:[0,1,4,6,10],wave:"sawtooth",pattern:[0,4,1,3,2,4,0,3]},
    {id:"proc-mirror-sky",name:"Mirror Sky",bpm:118,root:130.81,scale:[0,4,7,9,11],wave:"sine",pattern:[0,2,4,3,1,2,3,4]},
    {id:"proc-vengeance-core",name:"Vengeance Core",bpm:126,root:73.42,scale:[0,3,5,6,10],wave:"square",pattern:[0,3,2,4,1,3,4,2]},
    {id:"proc-healer-pulse",name:"Healer Pulse",bpm:112,root:146.83,scale:[0,2,4,7,9],wave:"sine",pattern:[0,2,3,4,2,1,3,2]},
    {id:"proc-assassin-step",name:"Assassin Step",bpm:142,root:98,scale:[0,1,5,7,8],wave:"triangle",pattern:[0,4,2,1,3,4,1,2]},
    {id:"proc-squire-march",name:"Squire March",bpm:120,root:110,scale:[0,2,5,7,10],wave:"square",pattern:[0,0,2,0,3,2,4,3]},
    {id:"proc-quantum-arena",name:"Quantum Arena",bpm:136,root:116.54,scale:[0,3,5,8,10],wave:"sawtooth",pattern:[0,2,1,4,3,1,2,4]}
  ];
  const byId=id=>BUILTIN_TRACKS.find(track=>track.id===id)||null;
  const midiRatio=semitones=>Math.pow(2,semitones/12);

  class ProceduralMusicEngine{
    constructor(){this.ctx=null;this.master=null;this.timer=0;this.track=null;this.step=0;this.nextTime=0;this.volume=.35;}
    ensure(){
      if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.18;this.master.connect(this.ctx.destination);}
      if(this.ctx.state==="suspended")this.ctx.resume();return this.ctx;
    }
    note(freq,time,duration,wave="sine",gain=.12){
      const ctx=this.ensure(),osc=ctx.createOscillator(),amp=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=1100;
      osc.type=wave;osc.frequency.setValueAtTime(freq,time);osc.connect(filter);filter.connect(amp);amp.connect(this.master);
      amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),time+.012);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.start(time);osc.stop(time+duration+.04);
    }
    drum(time,accent=false){
      const ctx=this.ensure(),osc=ctx.createOscillator(),amp=ctx.createGain();osc.type="sine";osc.frequency.setValueAtTime(accent?90:65,time);osc.frequency.exponentialRampToValueAtTime(35,time+.1);osc.connect(amp);amp.connect(this.master);amp.gain.setValueAtTime(accent?.22:.14,time);amp.gain.exponentialRampToValueAtTime(.0001,time+.13);osc.start(time);osc.stop(time+.15);
    }
    schedule(){
      if(!this.track||!this.ctx)return;const secondsPerBeat=60/this.track.bpm,stepDuration=secondsPerBeat/2;
      while(this.nextTime<this.ctx.currentTime+.35){
        const index=this.step%this.track.pattern.length,degree=this.track.pattern[index],semi=this.track.scale[degree%this.track.scale.length],freq=this.track.root*midiRatio(semi+(index%4===3?12:0));
        this.note(freq,this.nextTime,stepDuration*.72,this.track.wave,.09+(index%4===0?.035:0));
        if(index%2===0)this.note(this.track.root*.5,this.nextTime,stepDuration*.88,"sine",.055);
        this.drum(this.nextTime,index%4===0);this.step++;this.nextTime+=stepDuration;
      }
    }
    play(id,volume=.35){this.stop();this.track=byId(id)||BUILTIN_TRACKS[0];this.volume=Math.max(0,Math.min(1,Number(volume)||0));const ctx=this.ensure();this.master.gain.setTargetAtTime(this.volume*.18,ctx.currentTime,.03);this.step=0;this.nextTime=ctx.currentTime+.05;this.schedule();this.timer=window.setInterval(()=>this.schedule(),90);return this.track;}
    setVolume(volume){this.volume=Math.max(0,Math.min(1,Number(volume)||0));if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.volume*.18,this.ctx.currentTime,.03);}
    stop(){if(this.timer)clearInterval(this.timer);this.timer=0;this.track=null;}
  }
  function chooseRandom(items,lastId=null){const valid=(items||[]).filter(Boolean);if(!valid.length)return null;const pool=valid.length>1?valid.filter(item=>item.id!==lastId):valid;return pool[Math.floor(Math.random()*pool.length)]||valid[0];}
  window.QTEMusic={BUILTIN_TRACKS,byId,chooseRandom,engine:new ProceduralMusicEngine()};
})();
