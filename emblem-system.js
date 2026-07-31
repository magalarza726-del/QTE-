(() => {
  "use strict";

  const clone = value => JSON.parse(JSON.stringify(value));
  const shuffle = items => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  class BaseEmblem {
    constructor({id, name, icon, color, description}) {
      this.id = id;
      this.name = name;
      this.icon = icon;
      this.color = color;
      this.description = description;
    }
    createRuntime(_context) { return {}; }
  }

  class ShadowEmblem extends BaseEmblem {
    constructor(){ super({id:"shadow",name:"Clan Sombra",icon:"◒",color:"#4a236f",description:"La secuencia desaparece tras comenzar. Un QTE perfecto permite ejecutar otra carta."}); }
    createRuntime(){ return {hideSequenceAfter:.75, extraCardOnPerfect:true}; }
  }

  class AssassinEmblem extends BaseEmblem {
    constructor(){ super({id:"assassin",name:"Clan Asesino",icon:"✦",color:"#ff1744",description:"Duplica el daño. Cada error causa al usuario el daño perfecto hipotético de la carta."}); }
    createRuntime(){ return {outgoingMultiplier:2, selfDamagePerError:true}; }
  }

  class HealerEmblem extends BaseEmblem {
    constructor(){ super({id:"healer",name:"Clan Curandero",icon:"✚",color:"#36e27a",description:"Recupera el 20 % del daño efectivo realmente infligido."}); }
    createRuntime(){ return {healingRate:.20}; }
  }

  class TempoEmblem extends BaseEmblem {
    constructor(){ super({id:"tempo",name:"Clan Tempo",icon:"◷",color:"#2196ff",description:"Duplica el tiempo disponible y reduce el daño total un 30 %."}); }
    createRuntime(){ return {timeMultiplier:2, outgoingMultiplier:.70}; }
  }

  class SquireEmblem extends BaseEmblem {
    constructor(){ super({id:"squire",name:"Clan Escudero",icon:"⬡",color:"#9aa4ad",description:"Reduce automáticamente un 15 % del daño recibido durante el intercambio."}); }
    createRuntime(){ return {incomingMultiplier:.85}; }
  }

  class ChaosEmblem extends BaseEmblem {
    constructor(){ super({id:"chaos",name:"Clan Caos",icon:"⤨",color:"#ff9d22",description:"Altera los controles de dos secciones en cada ejecución y triplica el daño."}); }
    createRuntime(context){
      const card = clone(context.card);
      const buttons = context.buttons || [];
      const sectionCount = card.secciones.length;
      const changedSections = shuffle(Array.from({length:sectionCount}, (_, index) => index)).slice(0, Math.min(2, sectionCount));
      const maps = {};
      for (const sectionIndex of changedSections) {
        const logical = [...new Set(card.secciones[sectionIndex].botones)];
        const candidates = shuffle(buttons);
        maps[sectionIndex] = {};
        logical.forEach((button, index) => {
          let mapped = candidates[index % candidates.length] || button;
          if (mapped === button && candidates.length > 1) mapped = candidates[(index + 1) % candidates.length];
          maps[sectionIndex][button] = mapped;
        });
        card.secciones[sectionIndex].botones = card.secciones[sectionIndex].botones.map(button => maps[sectionIndex][button] || button);
      }
      return {card, outgoingMultiplier:3, chaosMaps:maps, chaosChangedSections:changedSections};
    }
  }

  class VengeanceEmblem extends BaseEmblem {
    constructor(){ super({id:"vengeance",name:"Clan Venganza",icon:"⚔",color:"#8b0000",description:"Con menos del 35 % de vida, la carta obtiene un 25 % de daño adicional."}); }
    createRuntime(context){
      const active = Number(context.hp || 0) / Math.max(1, Number(context.maxHp || 1)) < .35;
      return {vengeanceActive:active, outgoingMultiplier:active ? 1.25 : 1};
    }
  }

  class MirrorEmblem extends BaseEmblem {
    constructor(){ super({id:"mirror",name:"Clan Espejo",icon:"◇",color:"#eef5ff",description:"Las cartas elegidas se intercambian: cada jugador ejecuta la carta del rival."}); }
    createRuntime(){ return {mirror:true}; }
  }

  class EmblemRegistry {
    constructor(){ this.items = new Map(); }
    register(emblem){
      if (!(emblem instanceof BaseEmblem)) throw new TypeError("El emblema debe extender BaseEmblem.");
      this.items.set(emblem.id, emblem);
      return emblem;
    }
    get(id){ return this.items.get(id) || null; }
    all(){ return [...this.items.values()]; }
    createRuntime(id, context={}){
      const emblem = this.get(id);
      const base = {
        emblemId:id || null,
        emblem,
        card:clone(context.card),
        timeMultiplier:1,
        outgoingMultiplier:1,
        incomingMultiplier:1,
        healingRate:0,
        hideSequenceAfter:null,
        extraCardOnPerfect:false,
        selfDamagePerError:false,
        mirror:false,
        chaosMaps:null,
        chaosChangedSections:[],
        vengeanceActive:false
      };
      if (!emblem) return base;
      return {...base, ...emblem.createRuntime({...context, card:base.card})};
    }
  }

  const registry = new EmblemRegistry();
  [ShadowEmblem, AssassinEmblem, HealerEmblem, TempoEmblem, SquireEmblem, ChaosEmblem, VengeanceEmblem, MirrorEmblem]
    .forEach(EmblemClass => registry.register(new EmblemClass()));

  function distribute(deckLength, emblemIds){
    const selected = [...new Set((emblemIds || []).filter(id => registry.get(id)))].slice(0, 4);
    if (selected.length < 1) throw new Error("Cada jugador debe seleccionar entre 1 y 4 emblemas.");
    const perEmblem = Math.floor(deckLength / selected.length);
    const assignments = Array(deckLength).fill(null);
    const slots = shuffle(Array.from({length:deckLength}, (_, index) => index));
    let cursor = 0;
    selected.forEach((emblemId, emblemIndex) => {
      const amount = emblemIndex === selected.length - 1 ? deckLength - cursor : perEmblem;
      for (let i = 0; i < amount; i++) assignments[slots[cursor++]] = emblemId;
    });
    return assignments;
  }

  function prepareCard(card, emblemId, context={}){
    const runtime = registry.createRuntime(emblemId, {...context, card});
    if (runtime.timeMultiplier !== 1) {
      runtime.card.secciones = runtime.card.secciones.map(section => ({...section, tiempo:Number(section.tiempo || 0) * runtime.timeMultiplier}));
    }
    runtime.card.emblemId = emblemId || null;
    return runtime;
  }

  window.QTEEmblems = {
    BaseEmblem,
    registry,
    all:() => registry.all(),
    get:id => registry.get(id),
    distribute,
    prepareCard
  };
})();
