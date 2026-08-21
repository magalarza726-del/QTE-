(() => {
  "use strict";

  const SYSTEMS=window.QTEGameSystems;
  if(!SYSTEMS)throw new Error("combat/qte-engine.js necesita game-systems.js");
  const normalizeAction=value=>({button:typeof value==="string"?value:String(value?.button??value?.boton??""),kind:"tap"});
  const totalButtons=SYSTEMS.helpers.totalButtons;
  const totalTime=SYSTEMS.helpers.totalTime;
  const coefficient=card=>SYSTEMS.FormulaRegistry.calculate("coeficienteVariacion",card);
  const precision=(correct,total)=>SYSTEMS.FormulaRegistry.calculate("precision",correct,total);
  const netPower=(correct,time,coef)=>SYSTEMS.FormulaRegistry.calculate("poderNeto",correct,time,coef);

  class QTEEngine {
    constructor(card,{clock=null}={}){
      this.card=window.QTEUtils?.clone?.(card)??JSON.parse(JSON.stringify(card));
      this.clock=typeof clock==="function"?clock:()=>performance.now()/1000;
      this.reset();
    }
    reset(){
      this.currentSectionIndex=0;this.currentButtonIndex=0;this.correctCount=0;this.incorrectCount=0;this.missedCount=0;
      this.startedAt=null;this.sectionStartedAt=null;this.finishedAt=null;this.active=false;this.finished=false;this.finishReason="";this.result=null;
    }
    now(){return this.clock();}
    get currentSection(){return this.card.secciones[this.currentSectionIndex]||null;}
    get expectedAction(){
      const section=this.currentSection;if(!section)return null;
      const value=section.botones[this.currentButtonIndex];
      return value===undefined?null:normalizeAction(value);
    }
    get elapsedTime(){if(this.startedAt==null)return 0;return Math.max(0,(this.finished?this.finishedAt:this.now())-this.startedAt);}
    get sectionRemaining(){if(!this.currentSection||!this.active)return 0;return Math.max(0,Number(this.currentSection.tiempo)-(this.now()-this.sectionStartedAt));}
    start(){
      this.reset();
      const now=this.now();
      this.startedAt=now;this.sectionStartedAt=now;this.active=true;
      return this;
    }
    begin(button){
      if(!this.active||this.finished)return {correct:false,finished:this.finished};
      this.update();if(this.finished)return {correct:false,finished:true};
      const action=this.expectedAction;
      if(!action){this.finish("sin_secuencia");return {correct:false,finished:true};}
      if(button!==action.button){this.incorrectCount++;return {correct:false,expected:action.button,finished:false};}
      const sectionChanged=this.complete(this.now());
      return {correct:true,actionCompleted:true,sectionChanged,finished:this.finished,expected:action.button};
    }
    update(){
      if(!this.active||this.finished)return this.finished;
      const now=this.now();
      while(this.active&&!this.finished){
        const section=this.currentSection;
        if(!section){this.finish("completado",now);break;}
        const deadline=this.sectionStartedAt+Number(section.tiempo);
        if(now<deadline)break;
        this.missedCount+=Math.max(0,section.botones.length-this.currentButtonIndex);
        this.currentSectionIndex++;this.currentButtonIndex=0;
        if(this.currentSectionIndex>=this.card.secciones.length){this.finish("tiempo_agotado",now);break;}
        this.sectionStartedAt=deadline;
      }
      return this.finished;
    }
    complete(now){
      this.correctCount++;this.currentButtonIndex++;
      let changed=false;const section=this.currentSection;
      if(section&&this.currentButtonIndex>=section.botones.length){
        changed=true;this.currentSectionIndex++;this.currentButtonIndex=0;
        if(this.currentSectionIndex>=this.card.secciones.length)this.finish("completado",now);
        else this.sectionStartedAt=now;
      }
      return changed;
    }
    finish(reason,now=null){
      if(this.finished)return this.result;
      const at=now??this.now();
      this.active=false;this.finished=true;this.finishReason=reason;this.finishedAt=at;
      const real=Math.max(0,this.finishedAt-this.startedAt),coef=coefficient(this.card),total=totalButtons(this.card),power=netPower(this.correctCount,real,coef);
      this.result={
        correct:this.correctCount,incorrect:this.incorrectCount,missed:this.missedCount,total,
        realTime:real,timeLimit:totalTime(this.card),accuracy:precision(this.correctCount,total),
        coefficient:coef,netPower:power,damage:Math.max(0,power),reason
      };
      return this.result;
    }
  }

  window.QTEQTEEngine={QTEEngine};
})();
