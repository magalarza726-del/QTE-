(() => {
  "use strict";
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  class CameraController {
    constructor(){this.reset();}
    reset(){this.x=0;this.y=0;this.zoom=1;this.targetX=0;this.targetY=0;this.targetZoom=1;this.shakeTime=0;this.shakeDuration=0;this.shakeStrength=0;this.zoomTime=0;this.zoomDuration=0;this.zoomAmount=0;}
    follow(x=0,y=0,zoom=1){this.targetX=x;this.targetY=y;this.targetZoom=zoom;}
    shake(strength=.5,duration=.22){this.shakeStrength=Math.max(this.shakeStrength,strength);this.shakeDuration=Math.max(this.shakeDuration,duration);this.shakeTime=this.shakeDuration;}
    punchZoom(amount=.08,duration=.22){this.zoomAmount=Math.max(this.zoomAmount,amount);this.zoomDuration=Math.max(this.zoomDuration,duration);this.zoomTime=this.zoomDuration;}
    update(dt){
      const smooth=1-Math.pow(.001,dt);
      this.x+=(this.targetX-this.x)*smooth;this.y+=(this.targetY-this.y)*smooth;this.zoom+=(this.targetZoom-this.zoom)*smooth;
      if(this.shakeTime>0)this.shakeTime=Math.max(0,this.shakeTime-dt);else this.shakeStrength=0;
      if(this.zoomTime>0)this.zoomTime=Math.max(0,this.zoomTime-dt);else this.zoomAmount=0;
    }
    apply(ctx,width,height){
      let sx=0,sy=0,punch=0;
      if(this.shakeTime>0){const ratio=this.shakeTime/Math.max(.001,this.shakeDuration);sx=(Math.random()-.5)*2*this.shakeStrength*14*ratio;sy=(Math.random()-.5)*2*this.shakeStrength*10*ratio;}
      if(this.zoomTime>0){const ratio=this.zoomTime/Math.max(.001,this.zoomDuration);punch=this.zoomAmount*Math.sin(Math.PI*clamp(ratio,0,1));}
      const zoom=this.zoom+punch;
      ctx.translate(width/2+sx,height/2+sy);ctx.scale(zoom,zoom);ctx.translate(-width/2-this.x,-height/2-this.y);
    }
  }
  window.QTECamera={CameraController};
})();
