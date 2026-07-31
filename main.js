(() => {
  "use strict";

  const INITIAL = window.QTE_INITIAL_DATA;
  const SYSTEMS = window.QTEGameSystems;
  const EMBLEMS = window.QTEEmblems;
  const ANIMATIONS = window.QTEAnimations;
  const COMBAT_VISUALS = window.QTECombatVisuals;
  const BALANCE = window.QTEBalance;
  const MUSIC = window.QTEMusic;
  if (!INITIAL) throw new Error("No se pudo cargar data.js");
  if (!SYSTEMS) throw new Error("No se pudo cargar game-systems.js");
  if (!EMBLEMS) throw new Error("No se pudo cargar emblem-system.js");
  if (!ANIMATIONS) throw new Error("No se pudo cargar animation/animation-registry.js");
  if (!COMBAT_VISUALS) throw new Error("No se pudo cargar combat/combat-visuals.js");
  if (!BALANCE) throw new Error("No se pudo cargar combat/balance-system.js");
  if (!MUSIC) throw new Error("No se pudo cargar audio/music-system.js");

  const APP_VERSION = "10.1.0";
  const BUILD_ID = "10.1.0-20260730";
  // Se conserva la clave v8 para migrar sin perder datos existentes.
  const STORAGE_KEY = "qte-lab-pages-v8";
  const DB_NAME = "qte-lab-media-v8";
  const DB_STORE = "media";
  const BUTTONS = SYSTEMS.ButtonRegistry.buttons;
  const LABELS = SYSTEMS.ButtonRegistry.labels;
  const MAX_HP = BALANCE.rules.maxHp;
  const DECK_SIZE = 12;
  const HAND_SIZE = 3;
  const MIN_TAP_TIME = 0.3;
  const RAW_POWER_MIN = 1.0;
  const RAW_POWER_MAX = 1 / MIN_TAP_TIME;
  const AI_CONFIG = {
    "Fácil": {accuracyMin:.50, accuracyMax:.70, reactionMin:300, reactionMax:520},
    "Normal": {accuracyMin:.70, accuracyMax:.90, reactionMin:180, reactionMax:340},
    "Difícil": {accuracyMin:.90, accuracyMax:.99, reactionMin:90, reactionMax:190}
  };
  const DEFAULT_SETTINGS = {
    difficulty:"Normal", musicVolume:35,
    backgroundId:null, backgroundType:"", backgroundName:"",
    backgroundOpacity:25, overlayOpacity:68, backgroundBlur:2, safeMode:true,
    musicId:null, musicName:"", musicEnabled:true,
    musicTracks:[], musicRandom:true, selectedMusicId:"proc-neon-rush", lastMusicId:null,
    customAnimations:[],
    layoutMode:"auto",
    playerEmblems:["shadow"], enemyEmblems:["assassin"]
  };

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, digits=2) => Number(value.toFixed(digits));
  const randomId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const shuffle = items => {
    const array = [...items];
    for (let i=array.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [array[i],array[j]]=[array[j],array[i]];
    }
    return array;
  };
  const randomBetween = (min,max) => min + Math.random()*(max-min);


  const LAYOUT_MODES = ["auto","desktop","mobile-portrait","mobile-landscape"];
  const LAYOUT_LABELS = {
    auto:"Automático", desktop:"Escritorio",
    "mobile-portrait":"Móvil vertical", "mobile-landscape":"Móvil horizontal"
  };
  let layoutResizeTimer=0;

  function detectLayoutMode(){
    const width=Math.max(document.documentElement.clientWidth,window.innerWidth||0);
    const height=Math.max(document.documentElement.clientHeight,window.innerHeight||0);
    const coarse=window.matchMedia?.("(pointer: coarse)").matches||false;
    const landscape=width>height;
    if(landscape&&(height<=760||coarse||width<1100))return "mobile-landscape";
    if(!landscape&&(width<=900||coarse))return "mobile-portrait";
    return "desktop";
  }
  function resolveLayoutMode(){
    const preference=LAYOUT_MODES.includes(state.settings.layoutMode)?state.settings.layoutMode:"auto";
    return preference==="auto"?detectLayoutMode():preference;
  }
  function applyLayoutMode(){
    const preference=LAYOUT_MODES.includes(state.settings.layoutMode)?state.settings.layoutMode:"auto";
    const resolved=resolveLayoutMode();
    const root=document.documentElement;
    root.dataset.layout=resolved;
    root.dataset.layoutPreference=preference;
    root.dataset.layoutForced=String(preference!=="auto");
    const select=$("#layoutModeSelect");
    if(select&&select.value!==preference)select.value=preference;
    const badge=$("#layoutModeBadge");
    if(badge)badge.textContent=preference==="auto"?`Auto · ${LAYOUT_LABELS[resolved]}`:LAYOUT_LABELS[resolved];
    root.style.setProperty("--app-viewport-height",`${window.innerHeight}px`);
  }
  function scheduleLayoutRefresh(){
    clearTimeout(layoutResizeTimer);
    layoutResizeTimer=setTimeout(()=>{
      if(state.settings.layoutMode==="auto")applyLayoutMode();
      else document.documentElement.style.setProperty("--app-viewport-height",`${window.innerHeight}px`);
    },100);
  }

  function normalizeAction(value) {
    const button = typeof value === "string"
      ? value
      : String(value?.boton ?? value?.button ?? "");
    return {button, kind:"tap"};
  }
  function serializeAction(action) { return action.button; }
  function migrateCardsToTap(cards) {
    if (!Array.isArray(cards)) return [];
    const migrated = cards.map(card => ({
      ...card,
      secciones: Array.isArray(card.secciones) ? card.secciones.map(section => ({
        ...section,
        botones: Array.isArray(section.botones) ? section.botones.map(value => normalizeAction(value).button) : []
      })) : []
    }));
    return SYSTEMS.CardSchema.normalizeAll(migrated);
  }
  function cardActions(card) { return card.secciones.flatMap(section => section.botones.map(normalizeAction)); }
  function cardTotalButtons(card) { return SYSTEMS.helpers.totalButtons(card); }
  function cardTotalTime(card) { return SYSTEMS.helpers.totalTime(card); }
  function sectionMinimumTime(section) { return Math.max(MIN_TAP_TIME, section.botones.length * MIN_TAP_TIME); }
  function cardMinimumTime(card) { return card.secciones.reduce((sum,s)=>sum+sectionMinimumTime(s),0); }
  function rawPower(card) { return SYSTEMS.FormulaRegistry.calculate("poderBruto", card); }
  function variationCoefficient(card) { return SYSTEMS.FormulaRegistry.calculate("coeficienteVariacion", card); }
  function powerStars(card) {
    const power=rawPower(card);
    if (power<=0) return 0;
    const normalized=(power-RAW_POWER_MIN)/(RAW_POWER_MAX-RAW_POWER_MIN);
    return clamp(Math.round(1+normalized*6),1,7);
  }
  function netPower(correct, realTime, coefficient) { return SYSTEMS.FormulaRegistry.calculate("poderNeto", correct, realTime, coefficient); }
  function accuracy(correct,total) { return SYSTEMS.FormulaRegistry.calculate("precision", correct, total); }
  function isPerfect(result) { return !!result && result.correct===result.total && result.incorrect===0 && result.missed===0; }
  function emblemById(id) { return EMBLEMS.get(id); }
  function emblemBadgeHtml(id, compact=false) {
    const emblem=emblemById(id);
    if(!emblem)return compact?'':'<span class="emblem-badge neutral">Sin emblema</span>';
    return `<span class="emblem-badge ${compact?"compact":""}" style="--emblem-color:${emblem.color}" title="${escapeHtml(emblem.name)}: ${escapeHtml(emblem.description)}"><b>${escapeHtml(emblem.icon)}</b>${compact?"":`<span>${escapeHtml(emblem.name)}</span>`}</span>`;
  }
  function findCardById(id){ return state.cards.find(card=>card.id===id)||null; }
  function validateCard(card, editingIndex=null) {
    const errors=[];
    const name=String(card.nombre||"").trim();
    if (!name) errors.push("La carta necesita un nombre.");
    const duplicate=state.cards.findIndex((c,i)=>i!==editingIndex && c.nombre.trim().toLowerCase()===name.toLowerCase());
    if (duplicate>=0) errors.push("Ya existe otra carta con ese nombre.");
    if (!Array.isArray(card.secciones)||card.secciones.length<1) errors.push("La carta necesita al menos una sección.");
    if (card.secciones.length>5) errors.push("Una carta admite como máximo 5 secciones.");
    card.secciones.forEach((section,index)=>{
      if (!String(section.nombre||"").trim()) errors.push(`La sección ${index+1} necesita un nombre.`);
      const time=Number(section.tiempo);
      if (!(time>0)) errors.push(`La sección ${index+1} necesita un tiempo positivo.`);
      if (!Array.isArray(section.botones)||section.botones.length<1) errors.push(`La sección ${index+1} necesita al menos una acción.`);
      section.botones.map(normalizeAction).forEach((action,aIndex)=>{
        if (!BUTTONS.includes(action.button)) errors.push(`Acción ${aIndex+1} inválida en la sección ${index+1}.`);
      });
      if (time+1e-9<sectionMinimumTime(section)) errors.push(`La sección “${section.nombre||index+1}” necesita al menos ${sectionMinimumTime(section).toFixed(2)} s.`);
    });
    return errors;
  }

  class MediaDB {
    constructor(){ this.db=null; this.urls=new Map(); }
    open(){
      return new Promise((resolve,reject)=>{
        const request=indexedDB.open(DB_NAME,1);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE,{keyPath:"id"});
        };
        request.onsuccess=()=>{this.db=request.result;resolve(this);};
        request.onerror=()=>reject(request.error);
      });
    }
    transaction(mode="readonly"){ return this.db.transaction(DB_STORE,mode).objectStore(DB_STORE); }
    put(blob,meta={}){
      return new Promise((resolve,reject)=>{
        const id=meta.id||randomId("media");
        const record={id,blob,name:meta.name||"archivo",type:blob.type||meta.type||"application/octet-stream",createdAt:Date.now()};
        const request=this.transaction("readwrite").put(record);
        request.onsuccess=()=>resolve(id); request.onerror=()=>reject(request.error);
      });
    }
    get(id){
      if(!id) return Promise.resolve(null);
      return new Promise((resolve,reject)=>{
        const request=this.transaction().get(id);
        request.onsuccess=()=>resolve(request.result||null); request.onerror=()=>reject(request.error);
      });
    }
    getAll(){
      return new Promise((resolve,reject)=>{
        const request=this.transaction().getAll();
        request.onsuccess=()=>resolve(request.result||[]); request.onerror=()=>reject(request.error);
      });
    }
    delete(id){
      if(!id) return Promise.resolve();
      this.revoke(id);
      return new Promise((resolve,reject)=>{
        const request=this.transaction("readwrite").delete(id);
        request.onsuccess=()=>resolve(); request.onerror=()=>reject(request.error);
      });
    }
    clear(){
      this.urls.forEach(url=>URL.revokeObjectURL(url)); this.urls.clear();
      return new Promise((resolve,reject)=>{
        const request=this.transaction("readwrite").clear();
        request.onsuccess=()=>resolve(); request.onerror=()=>reject(request.error);
      });
    }
    async url(id){
      if(!id) return "";
      if(this.urls.has(id)) return this.urls.get(id);
      const record=await this.get(id);
      if(!record) return "";
      const url=URL.createObjectURL(record.blob);
      this.urls.set(id,url);
      return url;
    }
    revoke(id){ const url=this.urls.get(id); if(url){URL.revokeObjectURL(url);this.urls.delete(id);} }
  }

  class QTEEngine {
    constructor(card){
      this.card=clone(card);
      this.currentSectionIndex=0;
      this.currentButtonIndex=0;
      this.correctCount=0;
      this.incorrectCount=0;
      this.missedCount=0;
      this.startedAt=0;
      this.sectionStartedAt=0;
      this.finishedAt=0;
      this.active=false;
      this.finished=false;
      this.finishReason="";
      this.result=null;
    }
    now(){ return performance.now()/1000; }
    get currentSection(){ return this.card.secciones[this.currentSectionIndex]||null; }
    get expectedAction(){
      const section=this.currentSection;
      if(!section) return null;
      const value=section.botones[this.currentButtonIndex];
      return value===undefined ? null : normalizeAction(value);
    }
    get elapsedTime(){ if(!this.startedAt)return 0; return Math.max(0,(this.finished?this.finishedAt:this.now())-this.startedAt); }
    get sectionRemaining(){
      if(!this.currentSection||!this.active)return 0;
      return Math.max(0,Number(this.currentSection.tiempo)-(this.now()-this.sectionStartedAt));
    }
    start(){
      const now=this.now();
      this.currentSectionIndex=0;this.currentButtonIndex=0;this.correctCount=0;this.incorrectCount=0;this.missedCount=0;
      this.startedAt=now;this.sectionStartedAt=now;this.finishedAt=0;this.active=true;this.finished=false;this.finishReason="";this.result=null;
    }
    begin(button){
      if(!this.active||this.finished)return {correct:false,finished:this.finished};
      this.update(); if(this.finished)return {correct:false,finished:true};
      const action=this.expectedAction;
      if(!action){this.finish("sin_secuencia");return {correct:false,finished:true};}
      if(button!==action.button){this.incorrectCount++;return {correct:false,expected:action.button};}
      const changed=this.complete(this.now());
      return {correct:true,actionCompleted:true,sectionChanged:changed,finished:this.finished,expected:action.button};
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
      let changed=false;
      const section=this.currentSection;
      if(section&&this.currentButtonIndex>=section.botones.length){
        changed=true;this.currentSectionIndex++;this.currentButtonIndex=0;
        if(this.currentSectionIndex>=this.card.secciones.length)this.finish("completado",now);
        else this.sectionStartedAt=now;
      }
      return changed;
    }
    finish(reason,now=null){
      if(this.finished)return;
      const at=now??this.now();
      this.active=false;this.finished=true;this.finishReason=reason;this.finishedAt=at;
      const real=Math.max(0,this.finishedAt-this.startedAt);
      const coefficient=variationCoefficient(this.card);
      this.result={
        correct:this.correctCount,incorrect:this.incorrectCount,missed:this.missedCount,total:cardTotalButtons(this.card),
        realTime:real,timeLimit:cardTotalTime(this.card),accuracy:accuracy(this.correctCount,cardTotalButtons(this.card)),
        coefficient,netPower:netPower(this.correctCount,real,coefficient),damage:Math.max(0,netPower(this.correctCount,real,coefficient)),reason
      };
    }
  }

  const mediaDB=new MediaDB();
  const state={
    cards:[],decks:{},playerDeck:[],enemyDeck:[],
    settings:clone(DEFAULT_SETTINGS),
    enchantments:{player:[],enemy:[]},
    battle:null,route:"home"
  };
  const editor={index:null,card:null,activeSection:0,originalImageId:null,pendingImageId:null,saved:false};
  let qteFrame=0;
  let combatRenderer=null;
  let previewRenderer=null;

  function defaultState(){
    const decks=clone(INITIAL.starterDecks);
    return {
      cards:migrateCardsToTap(clone(INITIAL.cards)),decks,
      playerDeck:clone(decks["Inicial Fácil"]||[]),enemyDeck:clone(decks["Inicial Medio"]||[]),
      settings:normalizeAdvancedSettings(clone(DEFAULT_SETTINGS)),
      enchantments:{player:[],enemy:[]}
    };
  }
  function normalizeAdvancedSettings(settings){
    const target=settings||{};
    const tracks=Array.isArray(target.musicTracks)?target.musicTracks.filter(track=>track&&track.id&&track.name).slice(0,20):[];
    if(target.musicId&&!tracks.some(track=>track.id===target.musicId))tracks.push({id:target.musicId,name:target.musicName||"Pista migrada",source:"upload"});
    target.musicTracks=tracks;
    target.musicRandom=target.musicRandom!==false;
    target.selectedMusicId=String(target.selectedMusicId||target.musicId||MUSIC.BUILTIN_TRACKS[0].id);
    target.lastMusicId=target.lastMusicId||null;
    target.customAnimations=Array.isArray(target.customAnimations)?target.customAnimations.slice(0,60).map((preset,index)=>({
      id:String(preset?.id||`custom-${index+1}`),name:String(preset?.name||`Animación ${index+1}`),animation:ANIMATIONS.normalize(preset?.animation||preset)
    })):[];
    return target;
  }

  function loadState(){
    const fallback=defaultState();
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(!stored)Object.assign(state,fallback);
      else {
        state.cards=Array.isArray(stored.cards)?migrateCardsToTap(stored.cards):fallback.cards;
        state.decks=stored.decks&&typeof stored.decks==="object"?stored.decks:fallback.decks;
        state.playerDeck=Array.isArray(stored.playerDeck)?stored.playerDeck:fallback.playerDeck;
        state.enemyDeck=Array.isArray(stored.enemyDeck)?stored.enemyDeck:fallback.enemyDeck;
        state.settings=normalizeAdvancedSettings({...fallback.settings,...stored.settings});
        state.settings.playerEmblems=normalizeEmblemSelection(state.settings.playerEmblems,["shadow"]);
        state.settings.enemyEmblems=normalizeEmblemSelection(state.settings.enemyEmblems,["assassin"]);
        state.enchantments=stored.enchantments&&typeof stored.enchantments==="object"
          ? {player:Array.isArray(stored.enchantments.player)?stored.enchantments.player:[],enemy:Array.isArray(stored.enchantments.enemy)?stored.enchantments.enemy:[]}
          : {player:[],enemy:[]};
      }
    }catch(error){console.warn(error);Object.assign(state,fallback);}
  }
  function saveState(message="Guardado local"){
    normalizeAdvancedSettings(state.settings);
    state.cards.forEach(card=>SYSTEMS.CardSchema.refreshComputed(card));
    const payload={version:APP_VERSION,cards:state.cards,decks:state.decks,playerDeck:state.playerDeck,enemyDeck:state.enemyDeck,settings:state.settings,enchantments:state.enchantments};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    const status=$("#saveStatus");
    status.textContent=message; clearTimeout(saveState.timer); saveState.timer=setTimeout(()=>status.textContent="Guardado local",1300);
    updateHomeStats();
  }

  function toast(message,type="info"){
    const item=document.createElement("div");item.className=`toast ${type}`;item.textContent=message;$("#toastRegion").append(item);
    setTimeout(()=>item.remove(),3400);
  }
  function confirmAction(message){ return window.confirm(message); }
  function normalizeEmblemSelection(values,fallback=["shadow"]){
    const valid=[...new Set((Array.isArray(values)?values:[]).filter(id=>emblemById(id)))].slice(0,4);
    return valid.length?valid:[...fallback];
  }
  function cardByName(name){ return state.cards.find(card=>card.nombre===name)||null; }
  function sanitizeDeck(deck){ return Array.from({length:DECK_SIZE},(_,i)=>cardByName(deck[i])?deck[i]:(state.cards[i%state.cards.length]?.nombre||"")); }

  function go(route){
    const valid=["home","cards","emblems","decks","battle","media","data"].includes(route)?route:"home";
    state.route=valid;
    $$(".page").forEach(page=>page.classList.toggle("active",page.dataset.page===valid));
    $$(".nav-button").forEach(button=>button.classList.toggle("active",button.dataset.route===valid));
    if(location.hash!==`#${valid}`)history.replaceState(null,"",`#${valid}`);
    if(valid==="cards")renderCards();
    if(valid==="emblems")renderEmblems();
    if(valid==="decks")renderDecks();
    if(valid==="media")applyMediaSettings();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function updateHomeStats(){
    $("#homeCardCount").textContent=state.cards.length;
    $("#homeDeckCount").textContent=Object.keys(state.decks).length;
  }

  async function setImageContainer(container,id,emptyText="Sin imagen"){
    container.innerHTML="";
    if(!id){const span=document.createElement("span");span.textContent=emptyText;container.append(span);return;}
    const url=await mediaDB.url(id);
    if(!url){const span=document.createElement("span");span.textContent="Archivo no disponible";container.append(span);return;}
    const img=document.createElement("img");img.src=url;img.alt="";container.append(img);
  }

  function cardTileHtml(card,index,context="library"){
    const stars=powerStars(card);
    const button=context==="battle"?"Elegir":"Editar";
    const emblem=card.emblemId?emblemBadgeHtml(card.emblemId,true):"";
    return `<article class="${context==="battle"?"battle-card":"card-tile"} ${card.emblemId?"enchanted":""}" data-card-index="${index}">
      ${emblem}
      <button type="button" data-action="${context==="battle"?"select-battle-card":"edit-card"}" data-index="${index}">
        <div class="card-art" data-media-id="${escapeHtml(card.imageId||"")}"><span>${card.imageId?"Cargando…":"Sin imagen"}</span></div>
        <div class="card-body"><div class="stars">${"★".repeat(stars)}${"☆".repeat(7-stars)}</div><h3>${escapeHtml(card.nombre)}</h3>
          ${card.emblemId?emblemBadgeHtml(card.emblemId):""}
          <div class="card-meta expanded"><span>PB<strong>${rawPower(card).toFixed(3)}</strong></span><span>CV<strong>${variationCoefficient(card).toFixed(3)}</strong></span><span>Botones<strong>${cardTotalButtons(card)}</strong></span><span>Tiempo<strong>${cardTotalTime(card).toFixed(2)} s</strong></span><span>Secciones<strong>${card.secciones.length}</strong></span><span>Animación<strong>${escapeHtml(ANIMATIONS.labelFor(card.animation))}</strong></span></div>
          ${context==="battle"?`<span class="secondary" style="width:100%">${button}</span>`:""}
        </div>
      </button>
      ${context==="library"?`<div class="card-actions"><button data-action="edit-card" data-index="${index}">Editar</button><button data-action="delete-card" data-index="${index}" class="danger-text">Eliminar</button></div>`:""}
    </article>`;
  }

  async function hydrateCardImages(root=document){
    const elements=$$(".card-art[data-media-id]",root);
    await Promise.all(elements.map(async element=>{
      const id=element.dataset.mediaId;
      if(!id)return;
      const url=await mediaDB.url(id); if(!url){element.innerHTML="<span>Archivo no disponible</span>";return;}
      element.innerHTML="";const img=document.createElement("img");img.src=url;img.alt="";element.append(img);
    }));
  }

  function renderCards(){
    const query=$("#cardSearch").value.trim().toLowerCase();
    const star=$("#starFilter").value;
    const image=$("#imageFilter").value;
    const matches=state.cards.map((card,index)=>({card,index})).filter(({card})=>{
      if(query&&!card.nombre.toLowerCase().includes(query))return false;
      if(star!=="all"&&powerStars(card)!==Number(star))return false;
      if(image==="with"&&!card.imageId)return false;
      if(image==="without"&&card.imageId)return false;
      return true;
    });
    $("#cardsGrid").innerHTML=matches.map(({card,index})=>cardTileHtml(card,index)).join("");
    $("#cardsEmpty").classList.toggle("hidden",matches.length>0);
    hydrateCardImages($("#cardsGrid"));
  }

  function openEditor(index=null){
    editor.index=index;
    editor.card=index===null?SYSTEMS.CardSchema.normalize({id:SYSTEMS.CardSchema.newCardId("nueva-carta"),nombre:"Nueva carta",secciones:[{nombre:"Inicio",tiempo:1.2,botones:["A","B","X","Y"]}],imageId:null,estadisticas:SYSTEMS.CardSchema.defaultStats()}):clone(state.cards[index]);
    editor.activeSection=0;editor.originalImageId=editor.card.imageId||null;editor.pendingImageId=null;editor.saved=false;
    $("#editorTitle").textContent=index===null?"Nueva carta":`Editar · ${editor.card.nombre}`;
    $("#editorCardName").value=editor.card.nombre;
    $("#editorError").classList.add("hidden");
    setImageContainer($("#editorArtPreview"),editor.card.imageId,"Sin imagen");
    renderEditorSections(); updateEditorSummary(); renderEditorStatistics(); renderEditorAnimation(); setEditorTab("mechanics");
    $("#cardEditorDialog").showModal();
  }
  function closeEditor(){ $("#cardEditorDialog").close(); }
  function renderEditorSections(){
    const container=$("#editorSections");
    container.innerHTML=editor.card.secciones.map((section,index)=>{
      const actions=section.botones.map(normalizeAction);
      return `<article class="section-editor ${index===editor.activeSection?"active":""}" data-section-index="${index}">
        <div class="section-head">
          <label><span>Nombre</span><input data-field="section-name" data-index="${index}" value="${escapeHtml(section.nombre)}"></label>
          <label><span>Tiempo (s)</span><input data-field="section-time" data-index="${index}" type="number" min="0.1" step="0.01" value="${Number(section.tiempo).toFixed(2)}"></label>
          <button type="button" class="ghost" data-action="activate-section" data-index="${index}">${index===editor.activeSection?"Activa":"Activar"}</button>
          <button type="button" class="ghost danger-text" data-action="remove-section" data-index="${index}">Eliminar</button>
        </div>
        <div class="section-actions">${actions.length?actions.map((action,aIndex)=>`<span class="action-pill">${LABELS[action.button]||action.button}<button type="button" data-action="remove-action" data-index="${index}" data-action-index="${aIndex}">×</button></span>`).join(""):"<span class='muted'>Sin acciones todavía.</span>"}</div>
        <div class="section-footer"><small>Mínimo humano: ${sectionMinimumTime(section).toFixed(2)} s</small><div><button type="button" class="ghost" data-action="adjust-section" data-index="${index}">Ajustar al mínimo</button> <button type="button" class="ghost" data-action="clear-section" data-index="${index}">Limpiar</button></div></div>
      </article>`;
    }).join("");
    $("#addSectionButton").disabled=editor.card.secciones.length>=5;
  }
  function updateEditorSummary(){
    editor.card.nombre=$("#editorCardName").value;
    $("#summaryActions").textContent=cardTotalButtons(editor.card);
    $("#summaryTime").textContent=`${cardTotalTime(editor.card).toFixed(2)} s`;
    $("#summaryMinimum").textContent=`${cardMinimumTime(editor.card).toFixed(2)} s`;
    $("#summaryRawPower").textContent=rawPower(editor.card).toFixed(3);
    const stars=powerStars(editor.card);$("#summaryStars").textContent=stars?"★".repeat(stars):"—";
    $("#summaryCoefficient").textContent=variationCoefficient(editor.card).toFixed(4);
    SYSTEMS.CardSchema.refreshComputed(editor.card);
  }
  function renderEditorStatistics(){
    const stats=SYSTEMS.CardSchema.defaultStats(editor.card?.estadisticas);
    const rows=[
      ["Usos",stats.usos],["Victorias",stats.victorias],["Derrotas",stats.derrotas],
      ["Daño promedio",stats.dano_promedio.toFixed(3)],["Tiempo medio",`${stats.tiempo_medio.toFixed(3)} s`],
      ["Precisión media",`${stats.precision_media.toFixed(2)}%`],["Mayor Poder Neto",stats.mejor_poder_neto.toFixed(4)],
      ["Mayor racha perfecta",stats.mayor_racha_perfecta]
    ];
    $("#editorStatisticsList").innerHTML=rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  }
  function animationDraftFromUI(){
    return ANIMATIONS.normalizeSingle({
      type:$("#animationTypeSelect").value,
      speed:Number($("#animationSpeed").value),distance:Number($("#animationDistance").value),
      impacts:Number($("#animationImpacts").value),duration:Number($("#animationDuration").value),
      jumpHeight:Number($("#animationJumpHeight").value),effectSize:Number($("#animationEffectSize").value),
      trailLength:Number($("#animationTrailLength").value),cameraShake:Number($("#animationCameraShake").value),
      sound:$("#animationSound").value
    });
  }
  function renderCustomAnimationOptions(){
    const select=$("#customAnimationSelect"),current=select.value;
    select.innerHTML='<option value="">Sin preset</option>'+state.settings.customAnimations.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
    select.value=state.settings.customAnimations.some(item=>item.id===current)?current:"";
  }
  function renderAnimationSequence(){
    const config=ANIMATIONS.normalize(editor.card.animation,editor.index??0),panel=$("#animationSequencePanel"),list=$("#animationSequenceList");
    panel.classList.toggle("hidden",config.mode!=="sequence");
    if(config.mode!=="sequence"){list.innerHTML="";return;}
    list.innerHTML=config.sequence.map((step,index)=>`<article class="animation-sequence-step" data-animation-step="${index}">
      <span class="sequence-step-number">${index+1}</span>
      <label><span>Técnica</span><select data-step-field="type">${ANIMATIONS.TYPES.map(([id,label])=>`<option value="${id}" ${id===step.animation.type?"selected":""}>${escapeHtml(label)}</option>`).join("")}</select></label>
      <label><span>Velocidad</span><input data-step-field="speed" type="number" min=".25" max="3" step=".05" value="${step.animation.speed}"></label>
      <label><span>Duración</span><input data-step-field="duration" type="number" min=".2" max="6" step=".05" value="${step.animation.duration}"></label>
      <label><span>Impactos</span><input data-step-field="impacts" type="number" min="1" max="12" step="1" value="${step.animation.impacts}"></label>
      <label><span>Pausa</span><input data-step-field="pauseAfter" type="number" min="0" max="2" step=".05" value="${step.pauseAfter}"></label>
      <div class="sequence-step-actions"><button type="button" class="ghost" data-sequence-action="up" title="Subir">↑</button><button type="button" class="ghost" data-sequence-action="down" title="Bajar">↓</button><button type="button" class="ghost danger-text" data-sequence-action="delete">Eliminar</button></div>
    </article>`).join("");
  }
  function updateAnimationDurationLabel(){
    const scale=COMBAT_VISUALS.COMBAT_DURATION_SCALE||2;
    $("#animationTotalDuration").textContent=`Combate: ${ANIMATIONS.totalDuration(editor.card.animation,{scale}).toFixed(2)} s`;
    $("#animationPreviewTitle").textContent=ANIMATIONS.labelFor(editor.card.animation);
  }
  function renderEditorAnimation(){
    editor.card.animation=ANIMATIONS.normalize(editor.card.animation,editor.index??0);
    const config=editor.card.animation,draft=config.mode==="sequence"?config.sequence[0].animation:config;
    const typeSelect=$("#animationTypeSelect");typeSelect.innerHTML=ANIMATIONS.TYPES.map(([id,label])=>`<option value="${id}">${escapeHtml(label)}</option>`).join("");typeSelect.value=draft.type;
    $("#animationModeSelect").value=config.mode;$("#animationName").value=config.name||"";
    const emblemSelect=$("#animationPreviewEmblem");emblemSelect.innerHTML=EMBLEMS.all().map(emblem=>`<option value="${emblem.id}">${escapeHtml(emblem.name)}</option>`).join("");if(!emblemSelect.value)emblemSelect.value="shadow";
    const fields={animationSpeed:"speed",animationDistance:"distance",animationImpacts:"impacts",animationDuration:"duration",animationJumpHeight:"jumpHeight",animationEffectSize:"effectSize",animationTrailLength:"trailLength",animationCameraShake:"cameraShake",animationSound:"sound"};
    Object.entries(fields).forEach(([id,key])=>{$(`#${id}`).value=draft[key];});
    $("#animationPreviewAccuracyOutput").textContent=`${$("#animationPreviewAccuracy").value}%`;
    renderCustomAnimationOptions();renderAnimationSequence();updateAnimationDurationLabel();
    previewRenderer=COMBAT_VISUALS.getRenderer($("#animationPreviewCanvas"),{preview:true});previewRenderer.activeRuntime.player={emblemId:emblemSelect.value,emblem:EMBLEMS.get(emblemSelect.value)};previewRenderer.activeRuntime.enemy={emblemId:"squire",emblem:EMBLEMS.get("squire")};requestAnimationFrame(()=>previewRenderer.idleFrame());
  }
  function syncEditorAnimationFromUI(){
    if(!editor.card)return;
    const mode=$("#animationModeSelect").value,name=$("#animationName").value.trim(),draft=animationDraftFromUI(),current=ANIMATIONS.normalize(editor.card.animation,editor.index??0);
    if(mode==="sequence"){
      const sequence=current.mode==="sequence"?current.sequence:[{id:randomId("step"),animation:ANIMATIONS.normalizeSingle(current),pauseAfter:.08}];
      editor.card.animation=ANIMATIONS.normalize({mode:"sequence",name:name||current.name||"Secuencia personalizada",sequence});
    }else editor.card.animation=ANIMATIONS.normalize({...draft,mode:"single",name});
    renderAnimationSequence();updateAnimationDurationLabel();
  }
  function addAnimationStep(){
    syncEditorAnimationFromUI();let config=ANIMATIONS.normalize(editor.card.animation);if(config.mode!=="sequence")config=ANIMATIONS.normalize({mode:"sequence",name:$("#animationName").value.trim()||"Secuencia personalizada",sequence:[]});
    if(config.sequence.length>=16){toast("La secuencia admite hasta 16 técnicas.","error");return;}
    config.sequence.push({id:randomId("step"),animation:animationDraftFromUI(),pauseAfter:.08});editor.card.animation=ANIMATIONS.normalize(config);renderAnimationSequence();updateAnimationDurationLabel();
  }
  function editAnimationStep(index,field,value){
    const config=ANIMATIONS.normalize(editor.card.animation);if(config.mode!=="sequence"||!config.sequence[index])return;
    if(field==="pauseAfter")config.sequence[index].pauseAfter=clamp(Number(value),0,2);else config.sequence[index].animation=ANIMATIONS.normalizeSingle({...config.sequence[index].animation,[field]:field==="type"?value:Number(value)});
    editor.card.animation=ANIMATIONS.normalize(config);updateAnimationDurationLabel();
  }
  function sequenceAction(index,action){
    const config=ANIMATIONS.normalize(editor.card.animation);if(config.mode!=="sequence")return;
    if(action==="delete"&&config.sequence.length>1)config.sequence.splice(index,1);
    if(action==="up"&&index>0)[config.sequence[index-1],config.sequence[index]]=[config.sequence[index],config.sequence[index-1]];
    if(action==="down"&&index<config.sequence.length-1)[config.sequence[index+1],config.sequence[index]]=[config.sequence[index],config.sequence[index+1]];
    editor.card.animation=ANIMATIONS.normalize(config);renderAnimationSequence();updateAnimationDurationLabel();
  }
  function saveCustomAnimation(){
    syncEditorAnimationFromUI();const name=$("#animationName").value.trim()||ANIMATIONS.labelFor(editor.card.animation);const preset={id:randomId("custom-animation"),name,animation:clone(editor.card.animation)};
    state.settings.customAnimations.push(preset);state.settings.customAnimations=state.settings.customAnimations.slice(-60);saveState("Animación guardada");renderCustomAnimationOptions();$("#customAnimationSelect").value=preset.id;toast(`Animación “${name}” guardada.`);
  }
  function loadCustomAnimation(){
    const preset=state.settings.customAnimations.find(item=>item.id===$("#customAnimationSelect").value);if(!preset){toast("Selecciona una animación personalizada.","error");return;}editor.card.animation=clone(preset.animation);renderEditorAnimation();toast(`Animación “${preset.name}” cargada.`);
  }
  function deleteCustomAnimation(){
    const id=$("#customAnimationSelect").value,preset=state.settings.customAnimations.find(item=>item.id===id);if(!preset)return;if(!confirmAction(`¿Eliminar la animación “${preset.name}”?`))return;state.settings.customAnimations=state.settings.customAnimations.filter(item=>item.id!==id);saveState("Animación eliminada");renderCustomAnimationOptions();
  }
  async function previewEditorAnimation(){
    syncEditorAnimationFromUI();const accuracy=Number($("#animationPreviewAccuracy").value);$("#animationPreviewAccuracyOutput").textContent=`${accuracy}%`;await COMBAT_VISUALS.preview($("#animationPreviewCanvas"),editor.card.animation,$("#animationPreviewEmblem").value,accuracy);
  }

  function setEditorTab(tab){
    const target=["mechanics","animation","statistics"].includes(tab)?tab:"mechanics";
    $$('[data-editor-tab]').forEach(button=>button.classList.toggle("active",button.dataset.editorTab===target));
    $("#editorMechanicsTab").classList.toggle("active",target==="mechanics");
    $("#editorAnimationTab").classList.toggle("active",target==="animation");
    $("#editorStatisticsTab").classList.toggle("active",target==="statistics");
    if(target==="animation")requestAnimationFrame(()=>previewRenderer?.idleFrame?.());
  }
  function addEditorAction(button){
    const section=editor.card.secciones[editor.activeSection]; if(!section)return;
    section.botones.push(button);
    renderEditorSections();updateEditorSummary();
  }
  async function saveEditor(){
    syncEditorAnimationFromUI();
    editor.card.nombre=$("#editorCardName").value.trim();
    SYSTEMS.CardSchema.refreshComputed(editor.card);
    const errors=validateCard(editor.card,editor.index);
    if(errors.length){const box=$("#editorError");box.innerHTML=errors.map(e=>`• ${escapeHtml(e)}`).join("<br>");box.classList.remove("hidden");return;}
    const oldName=editor.index===null?null:state.cards[editor.index].nombre;
    if(editor.index===null)state.cards.push(clone(editor.card));else state.cards[editor.index]=clone(editor.card);
    if(oldName&&oldName!==editor.card.nombre){
      Object.keys(state.decks).forEach(name=>state.decks[name]=state.decks[name].map(item=>item===oldName?editor.card.nombre:item));
      state.playerDeck=state.playerDeck.map(item=>item===oldName?editor.card.nombre:item);
      state.enemyDeck=state.enemyDeck.map(item=>item===oldName?editor.card.nombre:item);
    }
    if(editor.originalImageId&&editor.originalImageId!==editor.card.imageId)await mediaDB.delete(editor.originalImageId);
    editor.saved=true;saveState("Carta guardada");closeEditor();renderCards();renderDecks();toast("Carta guardada correctamente.");
  }

  function renderEmblems(){
    const renderSide=(side)=>{
      const selected=side==="player"?state.settings.playerEmblems:state.settings.enemyEmblems;
      const container=$(side==="player"?"#playerEmblemGrid":"#enemyEmblemGrid");
      container.innerHTML=EMBLEMS.all().map(emblem=>{
        const active=selected.includes(emblem.id);
        return `<button type="button" class="emblem-option ${active?"selected":""}" data-emblem-side="${side}" data-emblem-id="${emblem.id}" style="--emblem-color:${emblem.color}" title="${escapeHtml(emblem.description)}">
          <span class="emblem-option-icon">${escapeHtml(emblem.icon)}</span><span><strong>${escapeHtml(emblem.name)}</strong><small>${escapeHtml(emblem.description)}</small></span>
        </button>`;
      }).join("");
      $(side==="player"?"#playerEmblemCount":"#enemyEmblemCount").textContent=`${selected.length} / 4`;
    };
    renderSide("player");renderSide("enemy");
  }
  function toggleEmblem(side,id){
    const key=side==="player"?"playerEmblems":"enemyEmblems";
    const selected=[...state.settings[key]];
    const index=selected.indexOf(id);
    if(index>=0){
      if(selected.length===1){toast("Cada jugador debe conservar al menos un emblema.","error");return;}
      selected.splice(index,1);
    }else{
      if(selected.length>=4){toast("Solo se pueden equipar hasta 4 emblemas.","error");return;}
      selected.push(id);
    }
    state.settings[key]=selected;
    rerollEnchantments(false);
    saveState("Emblemas actualizados");renderEmblems();renderDecks();
  }
  function rerollEnchantments(persist=true){
    state.enchantments={
      player:EMBLEMS.distribute(DECK_SIZE,state.settings.playerEmblems),
      enemy:EMBLEMS.distribute(DECK_SIZE,state.settings.enemyEmblems)
    };
    if(persist)saveState("Encantamientos sorteados");
    if(state.route==="decks")renderDecks();
    return state.enchantments;
  }
  function ensureEnchantments(){
    if(!Array.isArray(state.enchantments.player)||state.enchantments.player.length!==DECK_SIZE||!Array.isArray(state.enchantments.enemy)||state.enchantments.enemy.length!==DECK_SIZE)rerollEnchantments(false);
  }
  function renderDeckEmblemSummary(){
    ensureEnchantments();
    const describe=side=>{
      const ids=side==="player"?state.settings.playerEmblems:state.settings.enemyEmblems;
      return ids.map(id=>emblemBadgeHtml(id)).join("");
    };
    $("#deckEmblemSummary").innerHTML=`<span class="emblem-summary-side"><b>Jugador:</b>${describe("player")}</span><span class="emblem-summary-side"><b>Rival:</b>${describe("enemy")}</span>`;
  }

  function renderDeckPresetOptions(){
    const names=Object.keys(state.decks).sort((a,b)=>a.localeCompare(b,"es"));
    for(const id of ["#playerPresetSelect","#enemyPresetSelect"]){
      const select=$(id);const current=select.value;select.innerHTML=names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      if(names.includes(current))select.value=current;
    }
  }
  function renderDeckSlots(side){
    ensureEnchantments();
    const deck=side==="player"?state.playerDeck:state.enemyDeck;
    const assignments=state.enchantments[side]||[];
    const container=$(side==="player"?"#playerDeckSlots":"#enemyDeckSlots");
    const options=state.cards.map(card=>`<option value="${escapeHtml(card.nombre)}">${escapeHtml(card.nombre)} · PB ${rawPower(card).toFixed(2)} · CV ${variationCoefficient(card).toFixed(2)}</option>`).join("");
    container.innerHTML=Array.from({length:DECK_SIZE},(_,index)=>{
      const selected=deck[index]||"";
      const card=cardByName(selected);
      const emblemId=assignments[index];
      return `<div class="deck-slot detailed ${emblemId?"enchanted":""}" style="--emblem-color:${emblemById(emblemId)?.color||"#667"}">
        <span class="slot-number">${index+1}</span>${emblemBadgeHtml(emblemId,true)}
        <select data-deck-side="${side}" data-slot="${index}"><option value="">Selecciona una carta</option>${options}</select>
        ${card?`<div class="deck-slot-details">${emblemBadgeHtml(emblemId)}<span>PB <b>${rawPower(card).toFixed(3)}</b></span><span>CV <b>${variationCoefficient(card).toFixed(3)}</b></span><span>Botones <b>${cardTotalButtons(card)}</b></span><span>Tiempo <b>${cardTotalTime(card).toFixed(2)} s</b></span><span>Secciones <b>${card.secciones.length}</b></span></div>`:`<small class="muted">Posición encantada: selecciona una carta.</small>`}
      </div>`;
    }).join("");
    $$(`select[data-deck-side="${side}"]`,container).forEach((select,index)=>select.value=deck[index]||"");
    const count=deck.filter(name=>cardByName(name)).length;
    $(side==="player"?"#playerDeckCount":"#enemyDeckCount").textContent=`${count} / ${DECK_SIZE}`;
  }
  function allMusicTracks(){
    return [
      ...MUSIC.BUILTIN_TRACKS.map(track=>({...track,source:"procedural"})),
      ...state.settings.musicTracks.map(track=>({...track,source:"upload"}))
    ];
  }
  function renderMusicOptions(){
    normalizeAdvancedSettings(state.settings);const tracks=allMusicTracks(),select=$("#musicSelect"),library=$("#musicLibrarySelect");
    const options=tracks.map(track=>`<option value="${escapeHtml(track.id)}">${track.source==="procedural"?"⚙":"♪"} ${escapeHtml(track.name)}</option>`).join("");
    select.innerHTML=`<option value="">Sin música</option><option value="__random__">Aleatoria · diferente por combate</option>${options}`;
    select.value=!state.settings.musicEnabled?"":state.settings.musicRandom?"__random__":(tracks.some(track=>track.id===state.settings.selectedMusicId)?state.settings.selectedMusicId:tracks[0]?.id||"");
    if(library){library.innerHTML=options;library.value=tracks.some(track=>track.id===state.settings.selectedMusicId)?state.settings.selectedMusicId:tracks[0]?.id||"";}
    $("#musicVolume").value=state.settings.musicVolume;$("#musicVolumeOutput").textContent=`${state.settings.musicVolume}%`;
    const randomToggle=$("#musicRandomToggle");if(randomToggle)randomToggle.checked=!!state.settings.musicRandom;
    const count=$("#musicTrackCount");if(count)count.textContent=`${tracks.length} pistas`;
    const list=$("#musicTrackList");if(list)list.innerHTML=tracks.map(track=>`<div class="music-track-item ${track.id===state.settings.lastMusicId?"last-played":""}" data-music-id="${escapeHtml(track.id)}"><span>${track.source==="procedural"?"⚙":"♪"}</span><div><strong>${escapeHtml(track.name)}</strong><small>${track.source==="procedural"?"Procedural integrada":"Audio local"}${track.id===state.settings.lastMusicId?" · última reproducida":""}</small></div>${track.source==="upload"?'<button type="button" class="ghost danger-text" data-remove-music="'+escapeHtml(track.id)+'">Eliminar</button>':""}</div>`).join("");
    const current=tracks.find(track=>track.id===state.settings.selectedMusicId);const fileName=$("#musicFileName");if(fileName)fileName.textContent=state.settings.musicRandom?`${tracks.length} pistas disponibles · selección aleatoria activa`:(current?`Selección manual: ${current.name}`:"Sin música");
  }
  function renderDecks(){
    state.playerDeck=sanitizeDeck(state.playerDeck);state.enemyDeck=sanitizeDeck(state.enemyDeck);
    renderDeckPresetOptions();renderDeckSlots("player");renderDeckSlots("enemy");renderMusicOptions();renderDeckEmblemSummary();
    $("#difficultySelect").value=state.settings.difficulty;
  }
  function loadPreset(side){
    const select=$(side==="player"?"#playerPresetSelect":"#enemyPresetSelect");
    const deck=clone(state.decks[select.value]||[]);
    if(side==="player")state.playerDeck=sanitizeDeck(deck);else state.enemyDeck=sanitizeDeck(deck);
    saveState();renderDeckSlots(side);toast(`Deck “${select.value}” cargado.`);
  }
  function randomDeck(side){
    if(state.cards.length<DECK_SIZE){toast("Se necesitan al menos 12 cartas.","error");return;}
    const names=shuffle(state.cards.map(c=>c.nombre)).slice(0,DECK_SIZE);
    if(side==="player")state.playerDeck=names;else state.enemyDeck=names;
    saveState();renderDeckSlots(side);
  }
  function saveCustomDeck(side){
    const input=$(side==="player"?"#playerDeckName":"#enemyDeckName");
    const name=input.value.trim();const deck=side==="player"?state.playerDeck:state.enemyDeck;
    if(!name){toast("Escribe un nombre para el deck.","error");return;}
    if(deck.filter(n=>cardByName(n)).length!==DECK_SIZE){toast("El deck necesita 12 cartas válidas.","error");return;}
    state.decks[name]=clone(deck);input.value="";saveState("Deck guardado");renderDeckPresetOptions();toast(`Deck “${name}” guardado.`);
  }

  async function applyMediaSettings(){
    if(state.settings.safeMode){
      state.settings.backgroundOpacity=Math.min(35,Number(state.settings.backgroundOpacity));
      state.settings.overlayOpacity=Math.max(55,Number(state.settings.overlayOpacity));
    }
    document.documentElement.style.setProperty("--battle-media-opacity",String(Number(state.settings.backgroundOpacity)/100));
    document.documentElement.style.setProperty("--battle-overlay-opacity",String(Number(state.settings.overlayOpacity)/100));
    document.documentElement.style.setProperty("--battle-media-blur",`${Number(state.settings.backgroundBlur)}px`);
    $("#safeModeToggle").checked=!!state.settings.safeMode;
    $("#backgroundOpacity").value=state.settings.backgroundOpacity;$("#backgroundOpacityOutput").textContent=`${state.settings.backgroundOpacity}%`;
    $("#overlayOpacity").value=state.settings.overlayOpacity;$("#overlayOpacityOutput").textContent=`${state.settings.overlayOpacity}%`;
    $("#backgroundBlur").value=state.settings.backgroundBlur;$("#backgroundBlurOutput").textContent=`${state.settings.backgroundBlur} px`;
    $("#safeModeNotice").classList.toggle("hidden",!state.settings.safeMode);
    $("#backgroundFileName").textContent=state.settings.backgroundId?`${state.settings.backgroundName} · ${state.settings.backgroundType.startsWith("video/")?"Video":"Imagen"}`:"Sin archivo cargado.";
    const url=await mediaDB.url(state.settings.backgroundId);
    const isVideo=state.settings.backgroundType.startsWith("video/");
    for(const prefix of ["battleBackground","previewBackground"]){
      const img=$(`#${prefix}Image`),video=$(`#${prefix}Video`);
      img.classList.add("hidden");video.classList.add("hidden");video.pause();
      if(url&&isVideo){video.src=url;video.classList.remove("hidden");video.play().catch(()=>{});}
      else if(url){img.src=url;img.classList.remove("hidden");}
    }
    renderMusicOptions();
  }
  async function attachBackground(file){
    if(!file)return;
    if(!(file.type.startsWith("image/")||file.type.startsWith("video/"))){toast("Selecciona una imagen o un video compatible.","error");return;}
    if(file.type.startsWith("video/")&&file.size>250*1024*1024&&!confirmAction("El video supera 250 MB y el respaldo será muy pesado. ¿Continuar?"))return;
    const old=state.settings.backgroundId;
    const id=await mediaDB.put(file,{name:file.name});
    state.settings.backgroundId=id;state.settings.backgroundType=file.type;state.settings.backgroundName=file.name;
    if(old)await mediaDB.delete(old);
    saveState("Fondo guardado");await applyMediaSettings();toast("Fondo de batalla actualizado.");
  }
  async function attachMusic(files){
    const incoming=[...(files||[])].filter(file=>file?.type?.startsWith("audio/"));if(!incoming.length){toast("Selecciona uno o varios archivos de audio.","error");return;}
    const available=Math.max(0,20-state.settings.musicTracks.length);if(!available){toast("La biblioteca local admite hasta 20 pistas propias.","error");return;}
    for(const file of incoming.slice(0,available)){const id=await mediaDB.put(file,{name:file.name});state.settings.musicTracks.push({id,name:file.name,source:"upload"});state.settings.selectedMusicId=id;}
    state.settings.musicEnabled=true;saveState("Biblioteca musical guardada");renderMusicOptions();toast(`${Math.min(incoming.length,available)} pista(s) añadida(s).`);
  }
  async function removeMusicTrack(id){
    const track=state.settings.musicTracks.find(item=>item.id===id);if(!track)return;await mediaDB.delete(id);state.settings.musicTracks=state.settings.musicTracks.filter(item=>item.id!==id);if(state.settings.selectedMusicId===id)state.settings.selectedMusicId=MUSIC.BUILTIN_TRACKS[0].id;if(state.settings.lastMusicId===id)state.settings.lastMusicId=null;saveState("Pista eliminada");renderMusicOptions();
  }

  function makeBattleDeck(names, assignments=[]){
    const cards=names.map((name,index)=>{
      const card=cardByName(name);
      if(!card)return null;
      return {...clone(card),deckSlot:index,emblemId:assignments[index]||null};
    }).filter(Boolean);
    return {draw:shuffle(cards),hand:[],discard:[]};
  }
  function drawToHand(deck){
    while(deck.hand.length<HAND_SIZE){
      if(!deck.draw.length){if(!deck.discard.length)break;deck.draw=shuffle(deck.discard);deck.discard=[];}
      deck.hand.push(deck.draw.pop());
    }
  }
  function updateBattleHealth(){
    const battle=state.battle;const player=battle?.playerHp??MAX_HP;const enemy=battle?.enemyHp??MAX_HP;
    $("#playerHealthFill").style.width=`${clamp(player/MAX_HP*100,0,100)}%`;$("#enemyHealthFill").style.width=`${clamp(enemy/MAX_HP*100,0,100)}%`;
    $("#playerHealthText").textContent=`${player.toFixed(1)} / ${MAX_HP}`;$("#enemyHealthText").textContent=`${enemy.toFixed(1)} / ${MAX_HP}`;
  }
  function setBattleView(view){
    for(const id of ["battleIdle","battleSelection","battleQte","battleAnimation","battleResult"])$(`#${id}`).classList.toggle("hidden",id!==view);
  }
  async function playBattleMusic(){
    stopBattleMusic();if(!state.settings.musicEnabled)return null;const tracks=allMusicTracks();if(!tracks.length)return null;
    const chosen=state.settings.musicRandom?MUSIC.chooseRandom(tracks,state.settings.lastMusicId):(tracks.find(track=>track.id===state.settings.selectedMusicId)||tracks[0]);if(!chosen)return null;
    state.settings.lastMusicId=chosen.id;state.settings.selectedMusicId=chosen.id;localStorage.setItem(STORAGE_KEY,JSON.stringify({version:APP_VERSION,cards:state.cards,decks:state.decks,playerDeck:state.playerDeck,enemyDeck:state.enemyDeck,settings:state.settings,enchantments:state.enchantments}));
    const volume=Number(state.settings.musicVolume)/100;
    if(chosen.source==="procedural"){MUSIC.engine.play(chosen.id,volume);}else{const audio=$("#battleMusic"),url=await mediaDB.url(chosen.id);if(url){audio.src=url;audio.volume=volume;audio.play().catch(()=>toast("El navegador requiere una interacción para iniciar el audio."));}}
    renderMusicOptions();return chosen;
  }
  function stopBattleMusic(){const audio=$("#battleMusic");audio.pause();audio.currentTime=0;audio.removeAttribute("src");MUSIC.engine.stop();}
  function executionRuntime(card,side){
    const battle=state.battle;
    return EMBLEMS.prepareCard(card,card.emblemId,{
      side,hp:side==="player"?battle.playerHp:battle.enemyHp,maxHp:MAX_HP,buttons:BUTTONS
    });
  }
  function setActiveCardUI(card,runtime){
    const emblem=runtime.emblem;
    $("#activeCardName").textContent=card.nombre;
    $("#activeRawPower").textContent=rawPower(card).toFixed(3);
    $("#activeStars").textContent=powerStars(runtime.card);
    $("#liveCoefficient").textContent=variationCoefficient(runtime.card).toFixed(4);
    const badge=$("#activeEmblemBadge");
    badge.innerHTML=emblem?`${escapeHtml(emblem.icon)} ${escapeHtml(emblem.name)}`:"Sin emblema";
    badge.title=emblem?.description||"";
    badge.style.setProperty("--emblem-color",emblem?.color||"#728099");
    badge.classList.toggle("active",!!emblem);
    setImageContainer($("#activeCardArt"),card.imageId,"Sin arte");
  }
  async function startBattle(){
    combatRenderer?.stop();
    const playerNames=state.playerDeck.filter(name=>cardByName(name));const enemyNames=state.enemyDeck.filter(name=>cardByName(name));
    if(playerNames.length!==DECK_SIZE||enemyNames.length!==DECK_SIZE){toast("Ambos decks deben tener exactamente 12 cartas válidas.","error");go("decks");return;}
    state.settings.playerEmblems=normalizeEmblemSelection(state.settings.playerEmblems,["shadow"]);
    state.settings.enemyEmblems=normalizeEmblemSelection(state.settings.enemyEmblems,["assassin"]);
    rerollEnchantments(true);
    state.battle={
      playerHp:MAX_HP,enemyHp:MAX_HP,turn:1,phase:"select",
      playerDeck:makeBattleDeck(playerNames,state.enchantments.player),enemyDeck:makeBattleDeck(enemyNames,state.enchantments.enemy),
      playerChosenCard:null,enemyChosenCard:null,playerCard:null,enemyCard:null,currentCard:null,currentRuntime:null,engine:null,
      playerExecutions:[],enemyExecutions:[],playerUsedIds:[],enemyUsedIds:[],extraUsed:false,extraPlayerCard:null,extraEnemyCard:null,
      playerResult:null,enemyResult:null,gameOver:false,matchStatsRecorded:false,mirrorTriggered:false,visualizedPlayerCount:0
    };
    go("battle");await applyMediaSettings();await playBattleMusic();updateBattleHealth();beginBattleTurn();
  }
  function renderBattleHand(cards,mode="primary"){
    $("#battleHand").innerHTML=cards.map(({card,index})=>cardTileHtml(card,index,"battle")).join("");
    $("#selectionTurnText").textContent=mode==="shadow-extra"?"Clan Sombra · elige una carta adicional":`Turno ${state.battle.turn}`;
    hydrateCardImages($("#battleHand"));
  }
  function renderBattleManifest(){
    const container=$("#battleManifestCards");if(!container)return;
    const details=$("#battleEnchantmentManifest");if(details)details.open=resolveLayoutMode()!=="mobile-landscape";
    container.innerHTML=state.playerDeck.map((name,index)=>{
      const emblemId=state.enchantments.player[index];
      return `<div class="battle-manifest-item" style="--emblem-color:${emblemById(emblemId)?.color||"#728099"}">${emblemBadgeHtml(emblemId,true)}<span>${escapeHtml(name)}</span>${emblemBadgeHtml(emblemId)}</div>`;
    }).join("");
  }
  function beginBattleTurn(){
    const battle=state.battle;if(!battle)return;
    combatRenderer?.stop();
    cancelAnimationFrame(qteFrame);
    battle.phase="select";battle.playerChosenCard=null;battle.enemyChosenCard=null;battle.playerCard=null;battle.enemyCard=null;
    battle.currentCard=null;battle.currentRuntime=null;battle.engine=null;battle.playerExecutions=[];battle.enemyExecutions=[];battle.visualizedPlayerCount=0;battle.extraUsed=false;battle.extraPlayerCard=null;battle.extraEnemyCard=null;battle.mirrorTriggered=false;
    drawToHand(battle.playerDeck);drawToHand(battle.enemyDeck);
    $("#battleTurnLabel").textContent=`TURNO ${battle.turn}`;$("#battlePhaseLabel").textContent="SELECCIÓN";
    renderBattleManifest();renderBattleHand(battle.playerDeck.hand.map((card,index)=>({card,index})),"primary");
    setBattleView("battleSelection");setControllerEnabled(false);
  }
  async function beginPlayerQte(card,isExtra=false){
    const battle=state.battle;
    const runtime=executionRuntime(card,"player");
    if(isExtra){runtime.shadowExtra=true;runtime.outgoingMultiplier*=Number(runtime.extraCardMultiplier||.65);}
    battle.currentCard=card;battle.currentRuntime=runtime;battle.engine=new QTEEngine(runtime.card);battle.engine.start();
    battle.phase=isExtra?"qte-extra":"qte";
    $("#battlePhaseLabel").textContent=isExtra?"QTE ADICIONAL · SOMBRA":"QTE DEL JUGADOR";
    setActiveCardUI(card,runtime);
    setBattleView("battleQte");setControllerEnabled(true);renderQte();qteLoop();
  }
  async function selectBattleCard(index){
    const battle=state.battle;if(!battle)return;
    if(battle.phase==="shadow-select"){
      const card=battle.playerDeck.hand[index];
      if(!card||card===battle.playerChosenCard)return;
      battle.extraPlayerCard=card;
      await beginPlayerQte(card,true);
      return;
    }
    if(battle.phase!=="select")return;
    battle.playerChosenCard=battle.playerDeck.hand[index];
    battle.enemyChosenCard=battle.enemyDeck.hand[Math.floor(Math.random()*battle.enemyDeck.hand.length)];
    if(!battle.playerChosenCard||!battle.enemyChosenCard)return;
    const mirror=Boolean(battle.playerChosenCard.emblemId==="mirror"||battle.enemyChosenCard.emblemId==="mirror");
    battle.mirrorTriggered=mirror;
    battle.playerCard=mirror?battle.enemyChosenCard:battle.playerChosenCard;
    battle.enemyCard=mirror?battle.playerChosenCard:battle.enemyChosenCard;
    if(mirror)toast("Clan Espejo: las cartas elegidas se intercambiaron.");
    await beginPlayerQte(battle.playerCard,false);
  }
  function renderQte(){
    const battle=state.battle;const engine=battle?.engine;if(!engine)return;
    const runtime=battle.currentRuntime;const section=engine.currentSection;
    if(!section)return;
    const chaos=runtime?.chaosChangedSections?.includes(engine.currentSectionIndex);
    $("#qteSectionName").textContent=`SECCIÓN ${engine.currentSectionIndex+1} · ${section.nombre}${chaos?" · CONTROLES ALTERADOS":""}`;
    $("#qteTimer").textContent=engine.sectionRemaining.toFixed(2);
    $("#liveTimeRemaining").textContent=`${engine.sectionRemaining.toFixed(2)} s`;
    $("#liveCorrect").textContent=engine.correctCount;
    $("#liveIncorrect").textContent=engine.incorrectCount;
    $("#liveAccuracy").textContent=`${accuracy(engine.correctCount,Math.max(1,engine.correctCount+engine.incorrectCount+engine.missedCount)).toFixed(1)}%`;
    $("#liveNetPower").textContent=netPower(engine.correctCount,Math.max(engine.elapsedTime,.001),variationCoefficient(engine.card)).toFixed(4);
    const hidden=runtime?.hideSequenceAfter!=null&&engine.elapsedTime>=runtime.hideSequenceAfter;
    $("#qteSequence").classList.toggle("sequence-hidden",hidden);
    $("#qteSequence").innerHTML=hidden
      ? `<div class="memory-sequence"><strong>Secuencia oculta</strong><small>Clan Sombra: continúa de memoria.</small></div>`
      : section.botones.map((value,index)=>{
          const action=normalizeAction(value);let cls=index<engine.currentButtonIndex?"done":index===engine.currentButtonIndex?"current":"";
          return `<span class="qte-chip ${cls}">${LABELS[action.button]||action.button}</span>`;
        }).join("");
  }
  function qteLoop(){
    const battle=state.battle;const engine=battle?.engine;if(!battle||!engine||!["qte","qte-extra"].includes(battle.phase))return;
    engine.update();renderQte();
    if(engine.finished){completePlayerExecution();return;}
    qteFrame=requestAnimationFrame(qteLoop);
  }
  function setControllerEnabled(enabled){$$('[data-qte]').forEach(button=>button.disabled=!enabled);}
  function flashController(buttonName,correct){
    const button=$(`[data-qte="${buttonName}"]`);if(!button)return;
    button.classList.remove("correct","wrong");void button.offsetWidth;button.classList.add(correct?"correct":"wrong");setTimeout(()=>button.classList.remove("correct","wrong"),360);
  }
  function controllerDown(buttonName,element){
    const battle=state.battle;if(!battle||!["qte","qte-extra"].includes(battle.phase)||!battle.engine)return;
    element.classList.add("pressed");const result=battle.engine.begin(buttonName);flashController(buttonName,!!result.correct);renderQte();
  }
  function controllerUp(_buttonName,element){element.classList.remove("pressed");}
  function updateAnimationHud(execution,side){
    const emblem=execution.runtime?.emblem;
    $("#animationCardName").textContent=execution.card?.nombre||"—";
    $("#animationEmblemName").textContent=emblem?.name||"Sin emblema";
    $("#animationEmblemName").style.color=emblem?.color||"";
    $("#animationAccuracy").textContent=`${Number(execution.result?.accuracy||0).toFixed(1)}%`;
    $("#animationNetPower").textContent=Number(execution.result?.netPower||0).toFixed(4);
    $("#animationTechniqueLabel").textContent=`${side==="player"?"JUGADOR":"RIVAL"} · ${ANIMATIONS.labelFor(execution.runtime?.card?.animation||execution.card?.animation)}`;
  }
  async function playExecutionVisual(execution,side){
    const battle=state.battle;if(!battle||!execution)return;
    battle.phase="animation";$("#battlePhaseLabel").textContent=side==="player"?"TÉCNICA DEL JUGADOR":"CONTRAATAQUE RIVAL";
    updateAnimationHud(execution,side);setBattleView("battleAnimation");
    combatRenderer=combatRenderer||COMBAT_VISUALS.getRenderer($("#combatAnimationCanvas"));
    await combatRenderer.playExecution(execution,side,{onStep:(step,index,total)=>{$("#animationTechniqueLabel").textContent=`${side==="player"?"JUGADOR":"RIVAL"} · ${index+1}/${total} · ${ANIMATIONS.labels[step.animation.type]||step.animation.type}`;}});
    if(side==="player")battle.visualizedPlayerCount=(battle.visualizedPlayerCount||0)+1;
  }
  async function completePlayerExecution(){
    const battle=state.battle;if(!battle?.engine?.result)return;
    cancelAnimationFrame(qteFrame);setControllerEnabled(false);
    const execution={card:battle.currentCard,runtime:battle.currentRuntime,result:battle.engine.result};
    battle.playerExecutions.push(execution);
    if(!battle.playerUsedIds.includes(execution.card.id))battle.playerUsedIds.push(execution.card.id);
    const canShadow=execution.runtime.extraCardOnPerfect&&isPerfect(execution.result)&&!battle.extraUsed;
    const options=battle.playerDeck.hand.map((card,index)=>({card,index})).filter(item=>item.card!==battle.playerChosenCard);
    if(canShadow&&options.length){
      await playExecutionVisual(execution,"player");
      battle.extraUsed=true;battle.phase="shadow-select";$("#battlePhaseLabel").textContent="BONO CLAN SOMBRA";
      renderBattleHand(options,"shadow-extra");setBattleView("battleSelection");return;
    }
    await finishBattleTurn();
  }
  function simulateAI(card,runtime,difficulty){
    const config=AI_CONFIG[difficulty]||AI_CONFIG.Normal;let correct=0,incorrect=0,missed=0,totalTime=0;
    for(const section of runtime.card.secciones){
      let elapsed=0;const actions=section.botones.map(normalizeAction);
      for(let i=0;i<actions.length;i++){
        let completed=false;
        while(elapsed<Number(section.tiempo)&&!completed){
          elapsed+=randomBetween(config.reactionMin,config.reactionMax)/1000;
          if(elapsed>=Number(section.tiempo))break;
          const target=randomBetween(config.accuracyMin,config.accuracyMax);
          if(Math.random()<=target){correct++;completed=true;}else incorrect++;
        }
        if(!completed){missed+=actions.length-i;elapsed=Number(section.tiempo);break;}
      }
      totalTime+=Math.min(elapsed,Number(section.tiempo));
    }
    const coefficient=variationCoefficient(runtime.card);const power=netPower(correct,Math.max(totalTime,.001),coefficient);
    return {correct,incorrect,missed,total:cardTotalButtons(runtime.card),realTime:totalTime,timeLimit:cardTotalTime(runtime.card),accuracy:accuracy(correct,cardTotalButtons(runtime.card)),coefficient,netPower:power,damage:Math.max(0,power),reason:missed?"tiempo_agotado":"completado"};
  }
  function makeAIExecution(card,isExtra=false){
    const runtime=executionRuntime(card,"enemy");
    if(isExtra){runtime.shadowExtra=true;runtime.outgoingMultiplier*=Number(runtime.extraCardMultiplier||.65);}
    return {card,runtime,result:simulateAI(card,runtime,state.settings.difficulty)};
  }
  function executionBaseDamage(execution){return BALANCE.executionBaseDamage(execution);}
  function perfectHypotheticalDamage(execution){
    const card=execution.runtime.card,time=Math.max(execution.result.realTime,cardMinimumTime(card),.001);
    const raw=netPower(cardTotalButtons(card),time,variationCoefficient(card))*Number(execution.runtime.outgoingMultiplier||1);
    return Math.min(BALANCE.maxDamagePerCard(),Math.max(0,raw));
  }
  function sideSelfDamage(executions){return BALANCE.sideSelfDamage(executions,perfectHypotheticalDamage);}
  function sideIncomingMultiplier(executions){return BALANCE.incomingMultiplier(executions);}
  function allocateEffectiveDamage(executions,incomingMultiplier,targetHp){return BALANCE.allocateDamage(executions,incomingMultiplier,targetHp);}
  function sideHealing(executions,damageAllocation){return BALANCE.healing(executions,damageAllocation);}
  function discardCard(deck,card){const index=deck.hand.indexOf(card);if(index>=0)deck.discard.push(...deck.hand.splice(index,1));}
  function recordExecutionStats(execution,effectiveDamage,side){
    const source=findCardById(execution.card.id);if(!source)return;
    SYSTEMS.StatsManager.recordExecution(source,execution.result,effectiveDamage);
    const used=side==="player"?state.battle.playerUsedIds:state.battle.enemyUsedIds;
    if(!used.includes(source.id))used.push(source.id);
  }
  function finalizeMatchStats(){
    const battle=state.battle;if(!battle||battle.matchStatsRecorded||!battle.gameOver)return;
    battle.matchStatsRecorded=true;
    const playerCards=battle.playerUsedIds.map(findCardById).filter(Boolean);const enemyCards=battle.enemyUsedIds.map(findCardById).filter(Boolean);
    if(battle.enemyHp<=0&&battle.playerHp>0){SYSTEMS.StatsManager.recordMatch(playerCards,"victoria");SYSTEMS.StatsManager.recordMatch(enemyCards,"derrota");}
    else if(battle.playerHp<=0&&battle.enemyHp>0){SYSTEMS.StatsManager.recordMatch(playerCards,"derrota");SYSTEMS.StatsManager.recordMatch(enemyCards,"victoria");}
    saveState("Estadísticas actualizadas");
  }
  async function finishBattleTurn(){
    const battle=state.battle;if(!battle||!battle.playerExecutions.length||battle.resolving)return;
    battle.resolving=true;cancelAnimationFrame(qteFrame);setControllerEnabled(false);
    try{
      const enemyPrimary=makeAIExecution(battle.enemyCard);battle.enemyExecutions=[enemyPrimary];if(!battle.enemyUsedIds.includes(enemyPrimary.card.id))battle.enemyUsedIds.push(enemyPrimary.card.id);
      const enemyShadowOptions=battle.enemyDeck.hand.filter(card=>card!==battle.enemyChosenCard);
      if(enemyPrimary.runtime.extraCardOnPerfect&&isPerfect(enemyPrimary.result)&&enemyShadowOptions.length){
        battle.extraEnemyCard=enemyShadowOptions[Math.floor(Math.random()*enemyShadowOptions.length)];
        const extra=makeAIExecution(battle.extraEnemyCard,true);battle.enemyExecutions.push(extra);if(!battle.enemyUsedIds.includes(extra.card.id))battle.enemyUsedIds.push(extra.card.id);
      }
      const playerIncoming=sideIncomingMultiplier(battle.playerExecutions),enemyIncoming=sideIncomingMultiplier(battle.enemyExecutions);
      const playerDamage=allocateEffectiveDamage(battle.playerExecutions,enemyIncoming,battle.enemyHp),enemyDamage=allocateEffectiveDamage(battle.enemyExecutions,playerIncoming,battle.playerHp);
      const playerSelf=sideSelfDamage(battle.playerExecutions);
      const enemySelf=sideSelfDamage(battle.enemyExecutions);
      const playerHeal=sideHealing(battle.playerExecutions,playerDamage);
      const enemyHeal=sideHealing(battle.enemyExecutions,enemyDamage);

      for(const execution of battle.playerExecutions.slice(battle.visualizedPlayerCount||0))await playExecutionVisual(execution,"player");
      for(const execution of battle.enemyExecutions)await playExecutionVisual(execution,"enemy");

      battle.enemyHp=clamp(battle.enemyHp-playerDamage.effectiveTotal-enemySelf+enemyHeal,0,MAX_HP);
      battle.playerHp=clamp(battle.playerHp-enemyDamage.effectiveTotal-playerSelf+playerHeal,0,MAX_HP);
      battle.playerExecutions.forEach((execution,index)=>recordExecutionStats(execution,playerDamage.perExecution[index],"player"));
      battle.enemyExecutions.forEach((execution,index)=>recordExecutionStats(execution,enemyDamage.perExecution[index],"enemy"));
      updateBattleHealth();battle.phase="result";
      let headline=playerDamage.effectiveTotal>enemyDamage.effectiveTotal?"¡Ventaja del jugador!":playerDamage.effectiveTotal<enemyDamage.effectiveTotal?"El rival golpeó más fuerte":"Turno equilibrado";
      if(battle.playerHp<=0||battle.enemyHp<=0){battle.gameOver=true;headline=battle.playerHp<=0&&battle.enemyHp<=0?"Empate total":battle.enemyHp<=0?"¡Victoria del jugador!":"Victoria del rival";stopBattleMusic();}
      $("#battlePhaseLabel").textContent=battle.gameOver?"COMBATE FINALIZADO":"RESULTADO";$("#resultHeadline").textContent=headline;
      const playerAccuracy=battle.playerExecutions.reduce((sum,e)=>sum+e.result.accuracy,0)/battle.playerExecutions.length;
      const enemyAccuracy=battle.enemyExecutions.reduce((sum,e)=>sum+e.result.accuracy,0)/battle.enemyExecutions.length;
      $("#resultMetrics").innerHTML=`
        <article><strong>${playerDamage.effectiveTotal.toFixed(2)}</strong><small>Daño efectivo jugador</small></article><article><strong>${enemyDamage.effectiveTotal.toFixed(2)}</strong><small>Daño efectivo rival</small></article>
        <article><strong>${playerAccuracy.toFixed(1)}%</strong><small>Precisión jugador</small></article><article><strong>${enemyAccuracy.toFixed(1)}%</strong><small>Precisión rival</small></article>
        <article><strong>${playerSelf.toFixed(2)}</strong><small>Autodaño Asesino</small></article><article><strong>${enemySelf.toFixed(2)}</strong><small>Autodaño rival</small></article>
        <article><strong>${playerHeal.toFixed(2)}</strong><small>Curación efectiva</small></article><article><strong>${enemyHeal.toFixed(2)}</strong><small>Curación rival</small></article>
        <article><strong>${battle.playerExecutions.length}</strong><small>Cartas ejecutadas</small></article><article><strong>${battle.enemyExecutions.length}</strong><small>Cartas del rival</small></article>`;
      $("#continueBattleButton").textContent=battle.gameOver?"Nueva batalla":"Siguiente turno";setBattleView("battleResult");
      discardCard(battle.playerDeck,battle.playerChosenCard);discardCard(battle.enemyDeck,battle.enemyChosenCard);
      if(battle.extraPlayerCard)discardCard(battle.playerDeck,battle.extraPlayerCard);if(battle.extraEnemyCard)discardCard(battle.enemyDeck,battle.extraEnemyCard);
      finalizeMatchStats();saveState("Turno registrado");
    }finally{battle.resolving=false;}
  }
  function continueBattle(){
    const battle=state.battle;if(!battle)return;
    if(battle.gameOver){startBattle();return;}battle.turn++;beginBattleTurn();
  }

  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
  function dataUrlToBlob(dataUrl){const [head,data]=dataUrl.split(",");const type=(head.match(/data:(.*?);/)||[])[1]||"application/octet-stream";const binary=atob(data);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type});}
  async function exportBackup(){
    toast("Preparando respaldo…");
    const records=await mediaDB.getAll();const media=[];
    for(const record of records)media.push({id:record.id,name:record.name,type:record.type,createdAt:record.createdAt,dataUrl:await blobToDataUrl(record.blob)});
    const payload={app:"QTE Lab",version:APP_VERSION,exportedAt:new Date().toISOString(),state:{cards:state.cards,decks:state.decks,playerDeck:state.playerDeck,enemyDeck:state.enemyDeck,settings:state.settings,enchantments:state.enchantments},media};
    const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`QTE_Lab_respaldo_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast("Respaldo descargado.");
  }
  async function importBackup(file){
    if(!file)return;
    try{
      const payload=JSON.parse(await file.text());
      if(payload.app!=="QTE Lab"||!payload.state||!Array.isArray(payload.state.cards))throw new Error("Formato de respaldo inválido.");
      if(!confirmAction("Se reemplazarán los datos actuales. ¿Continuar?"))return;
      await mediaDB.clear();
      for(const item of payload.media||[])await mediaDB.put(dataUrlToBlob(item.dataUrl),{id:item.id,name:item.name,type:item.type});
      state.cards=migrateCardsToTap(payload.state.cards);state.decks=payload.state.decks||{};state.playerDeck=payload.state.playerDeck||[];state.enemyDeck=payload.state.enemyDeck||[];state.settings=normalizeAdvancedSettings({...defaultState().settings,...payload.state.settings});
      state.settings.playerEmblems=normalizeEmblemSelection(state.settings.playerEmblems,["shadow"]);state.settings.enemyEmblems=normalizeEmblemSelection(state.settings.enemyEmblems,["assassin"]);
      state.enchantments=payload.state.enchantments||{player:[],enemy:[]};ensureEnchantments();
      saveState("Respaldo importado");location.reload();
    }catch(error){console.error(error);toast(error.message||"No se pudo importar el respaldo.","error");}
  }

  function bindEvents(){
    $("#brandHome").addEventListener("click",()=>go("home"));
    $("#mainNav").addEventListener("click",event=>{const button=event.target.closest("[data-route]");if(button)go(button.dataset.route);});
    $$('[data-go]').forEach(button=>button.addEventListener("click",()=>go(button.dataset.go)));
    window.addEventListener("hashchange",()=>go(location.hash.slice(1)));
    $("#layoutModeSelect").addEventListener("change",event=>{
      const value=LAYOUT_MODES.includes(event.target.value)?event.target.value:"auto";
      state.settings.layoutMode=value;applyLayoutMode();saveState("Diseño actualizado");
    });
    window.addEventListener("resize",scheduleLayoutRefresh,{passive:true});
    window.addEventListener("orientationchange",scheduleLayoutRefresh,{passive:true});

    $("#page-emblems").addEventListener("click",event=>{const button=event.target.closest("[data-emblem-id]");if(button)toggleEmblem(button.dataset.emblemSide,button.dataset.emblemId);});
    $("#continueToDecksButton").addEventListener("click",()=>{rerollEnchantments(true);go("decks");});
    $("#backToEmblemsButton").addEventListener("click",()=>go("emblems"));
    $("#rerollEnchantmentsButton").addEventListener("click",()=>{rerollEnchantments(true);toast("Encantamientos redistribuidos.");});

    $("#cardSearch").addEventListener("input",renderCards);$("#starFilter").addEventListener("change",renderCards);$("#imageFilter").addEventListener("change",renderCards);
    $("#newCardButton").addEventListener("click",()=>openEditor());
    $("#cardsGrid").addEventListener("click",async event=>{
      const button=event.target.closest("[data-action]");if(!button)return;const index=Number(button.dataset.index);
      if(button.dataset.action==="edit-card")openEditor(index);
      if(button.dataset.action==="delete-card"){
        const card=state.cards[index];if(!card)return;
        if(state.cards.length<=DECK_SIZE){toast("Debe permanecer un mínimo de 12 cartas.","error");return;}
        if(!confirmAction(`¿Eliminar “${card.nombre}”?`))return;
        if(card.imageId)await mediaDB.delete(card.imageId);state.cards.splice(index,1);
        Object.keys(state.decks).forEach(name=>state.decks[name]=state.decks[name].filter(item=>item!==card.nombre));
        state.playerDeck=state.playerDeck.filter(item=>item!==card.nombre);state.enemyDeck=state.enemyDeck.filter(item=>item!==card.nombre);
        saveState("Carta eliminada");renderCards();renderDecks();
      }
    });
    $("#resetCardsButton").addEventListener("click",async()=>{
      if(!confirmAction("Se restaurarán las 100 cartas iniciales. Las imágenes asignadas a cartas se eliminarán."))return;
      const ids=state.cards.map(c=>c.imageId).filter(Boolean);for(const id of ids)await mediaDB.delete(id);
      state.cards=migrateCardsToTap(clone(INITIAL.cards));state.decks={...clone(INITIAL.starterDecks),...state.decks};state.playerDeck=clone(INITIAL.starterDecks["Inicial Fácil"]);state.enemyDeck=clone(INITIAL.starterDecks["Inicial Medio"]);rerollEnchantments(false);saveState();renderCards();renderDecks();toast("Cartas iniciales restauradas.");
    });

    // El formulario usa botones controlados para evitar que la validación HTML cierre el diálogo antes de tiempo.
    $$('[value="cancel"]',$("#cardEditorDialog")).forEach(button=>{button.type="button";button.addEventListener("click",closeEditor);});
    $("#cardEditorForm").addEventListener("submit",event=>{event.preventDefault();saveEditor();});
    $(".editor-tabs").addEventListener("click",event=>{const button=event.target.closest("[data-editor-tab]");if(button){renderEditorStatistics();if(button.dataset.editorTab==="animation")renderEditorAnimation();setEditorTab(button.dataset.editorTab);}});
    $("#cardEditorDialog").addEventListener("close",async()=>{if(!editor.saved&&editor.pendingImageId)await mediaDB.delete(editor.pendingImageId);});
    $("#editorCardName").addEventListener("input",updateEditorSummary);
    $("#editorAnimationTab").addEventListener("input",event=>{if(event.target.id==="animationPreviewAccuracy")$("#animationPreviewAccuracyOutput").textContent=`${event.target.value}%`;else if(!event.target.dataset.stepField)syncEditorAnimationFromUI();});
    $("#editorAnimationTab").addEventListener("change",event=>{if(event.target.id!=="animationPreviewEmblem"&&event.target.id!=="animationPreviewAccuracy"&&!event.target.dataset.stepField)syncEditorAnimationFromUI();});
    $("#animationModeSelect").addEventListener("change",()=>{syncEditorAnimationFromUI();renderEditorAnimation();});
    $("#animationSequenceList").addEventListener("input",event=>{const row=event.target.closest("[data-animation-step]");if(row&&event.target.dataset.stepField)editAnimationStep(Number(row.dataset.animationStep),event.target.dataset.stepField,event.target.value);});
    $("#animationSequenceList").addEventListener("change",event=>{const row=event.target.closest("[data-animation-step]");if(row&&event.target.dataset.stepField)editAnimationStep(Number(row.dataset.animationStep),event.target.dataset.stepField,event.target.value);});
    $("#animationSequenceList").addEventListener("click",event=>{const button=event.target.closest("[data-sequence-action]"),row=event.target.closest("[data-animation-step]");if(button&&row)sequenceAction(Number(row.dataset.animationStep),button.dataset.sequenceAction);});
    $("#addAnimationStepButton").addEventListener("click",addAnimationStep);
    $("#saveCustomAnimationButton").addEventListener("click",saveCustomAnimation);$("#loadCustomAnimationButton").addEventListener("click",loadCustomAnimation);$("#deleteCustomAnimationButton").addEventListener("click",deleteCustomAnimation);
    $("#previewAnimationButton").addEventListener("click",previewEditorAnimation);
    $("#addSectionButton").addEventListener("click",()=>{if(editor.card.secciones.length>=5)return;editor.card.secciones.push({nombre:`Sección ${editor.card.secciones.length+1}`,tiempo:1.2,botones:["A"]});editor.activeSection=editor.card.secciones.length-1;renderEditorSections();updateEditorSummary();});
    $("#editorSections").addEventListener("input",event=>{
      const field=event.target.dataset.field,index=Number(event.target.dataset.index);if(!field||!editor.card.secciones[index])return;
      if(field==="section-name")editor.card.secciones[index].nombre=event.target.value;
      if(field==="section-time")editor.card.secciones[index].tiempo=Number(event.target.value);
      updateEditorSummary();
    });
    $("#editorSections").addEventListener("click",event=>{
      const button=event.target.closest("[data-action]");if(!button)return;const index=Number(button.dataset.index);const section=editor.card.secciones[index];
      if(button.dataset.action==="activate-section"){editor.activeSection=index;renderEditorSections();}
      if(button.dataset.action==="remove-section"&&editor.card.secciones.length>1){editor.card.secciones.splice(index,1);editor.activeSection=clamp(editor.activeSection,0,editor.card.secciones.length-1);renderEditorSections();updateEditorSummary();}
      if(button.dataset.action==="remove-action"){section.botones.splice(Number(button.dataset.actionIndex),1);renderEditorSections();updateEditorSummary();}
      if(button.dataset.action==="adjust-section"){section.tiempo=round(sectionMinimumTime(section),2);renderEditorSections();updateEditorSummary();}
      if(button.dataset.action==="clear-section"){section.botones=[];renderEditorSections();updateEditorSummary();}
    });
    $("#editorImageInput").addEventListener("change",async event=>{
      const file=event.target.files[0];event.target.value="";if(!file)return;
      if(!file.type.startsWith("image/")){toast("Selecciona una imagen.","error");return;}
      if(editor.pendingImageId)await mediaDB.delete(editor.pendingImageId);
      editor.pendingImageId=await mediaDB.put(file,{name:file.name});editor.card.imageId=editor.pendingImageId;await setImageContainer($("#editorArtPreview"),editor.card.imageId);updateEditorSummary();
    });
    $("#editorRemoveImage").addEventListener("click",async()=>{if(editor.pendingImageId){await mediaDB.delete(editor.pendingImageId);editor.pendingImageId=null;}editor.card.imageId=null;await setImageContainer($("#editorArtPreview"),null,"Sin imagen");});

    $("#loadPlayerPreset").addEventListener("click",()=>loadPreset("player"));$("#loadEnemyPreset").addEventListener("click",()=>loadPreset("enemy"));
    $("#randomPlayerDeck").addEventListener("click",()=>randomDeck("player"));$("#randomEnemyDeck").addEventListener("click",()=>randomDeck("enemy"));
    $("#savePlayerDeck").addEventListener("click",()=>saveCustomDeck("player"));$("#saveEnemyDeck").addEventListener("click",()=>saveCustomDeck("enemy"));
    $("#page-decks").addEventListener("change",event=>{
      const select=event.target.closest("select[data-deck-side]");if(!select)return;const side=select.dataset.deckSide,index=Number(select.dataset.slot);
      if(side==="player")state.playerDeck[index]=select.value;else state.enemyDeck[index]=select.value;saveState();renderDeckSlots(side);
    });
    $("#difficultySelect").addEventListener("change",event=>{state.settings.difficulty=event.target.value;saveState();});
    $("#musicSelect").addEventListener("change",event=>{const value=event.target.value;state.settings.musicEnabled=!!value;state.settings.musicRandom=value==="__random__";if(value&&value!=="__random__")state.settings.selectedMusicId=value;saveState();renderMusicOptions();});
    $("#musicVolume").addEventListener("input",event=>{state.settings.musicVolume=Number(event.target.value);$("#musicVolumeOutput").textContent=`${state.settings.musicVolume}%`;$("#battleMusic").volume=state.settings.musicVolume/100;MUSIC.engine.setVolume(state.settings.musicVolume/100);saveState();});
    $("#launchBattleButton").addEventListener("click",startBattle);$("#battleGoDecks").addEventListener("click",()=>go("decks"));$("#continueBattleButton").addEventListener("click",continueBattle);
    $("#battleHand").addEventListener("click",event=>{const button=event.target.closest('[data-action="select-battle-card"]');if(button)selectBattleCard(Number(button.dataset.index));});
    $$('[data-qte]').forEach(button=>{
      button.addEventListener("pointerdown",event=>{event.preventDefault();try{button.setPointerCapture?.(event.pointerId);}catch(_error){}controllerDown(button.dataset.qte,button);});
      button.addEventListener("pointerup",event=>{event.preventDefault();controllerUp(button.dataset.qte,button);});
      button.addEventListener("pointercancel",()=>controllerUp(button.dataset.qte,button));
      button.addEventListener("contextmenu",event=>event.preventDefault());
    });

    $("#safeModeToggle").addEventListener("change",event=>{state.settings.safeMode=event.target.checked;applyMediaSettings();saveState();});
    $("#backgroundOpacity").addEventListener("input",event=>{state.settings.backgroundOpacity=Number(event.target.value);applyMediaSettings();saveState();});
    $("#overlayOpacity").addEventListener("input",event=>{state.settings.overlayOpacity=Number(event.target.value);applyMediaSettings();saveState();});
    $("#backgroundBlur").addEventListener("input",event=>{state.settings.backgroundBlur=Number(event.target.value);applyMediaSettings();saveState();});
    $("#backgroundImageInput").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";attachBackground(file);});
    $("#backgroundVideoInput").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";attachBackground(file);});
    $("#removeBackgroundButton").addEventListener("click",async()=>{if(state.settings.backgroundId)await mediaDB.delete(state.settings.backgroundId);state.settings.backgroundId=null;state.settings.backgroundType="";state.settings.backgroundName="";saveState();applyMediaSettings();});
    $("#musicInput").addEventListener("change",event=>{const files=[...event.target.files];event.target.value="";attachMusic(files);});
    $("#musicRandomToggle").addEventListener("change",event=>{state.settings.musicRandom=event.target.checked;state.settings.musicEnabled=true;saveState();renderMusicOptions();});
    $("#musicLibrarySelect").addEventListener("change",event=>{state.settings.selectedMusicId=event.target.value;state.settings.musicRandom=false;state.settings.musicEnabled=true;saveState();renderMusicOptions();});
    $("#musicTrackList").addEventListener("click",event=>{const remove=event.target.closest("[data-remove-music]");if(remove)removeMusicTrack(remove.dataset.removeMusic);else{const row=event.target.closest("[data-music-id]");if(row){state.settings.selectedMusicId=row.dataset.musicId;state.settings.musicRandom=false;state.settings.musicEnabled=true;saveState();renderMusicOptions();}}});
    $("#removeMusicButton").addEventListener("click",async()=>{const id=$("#musicLibrarySelect").value;if(state.settings.musicTracks.some(track=>track.id===id))await removeMusicTrack(id);else toast("Las 10 pistas procedurales integradas no se eliminan.");});

    $("#exportBackupButton").addEventListener("click",exportBackup);$("#importBackupInput").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";importBackup(file);});
    $("#resetEverythingButton").addEventListener("click",async()=>{if(!confirmAction("Se borrarán cartas, decks, multimedia y ajustes locales. ¿Continuar?"))return;localStorage.removeItem(STORAGE_KEY);await mediaDB.clear();location.reload();});
    $("#clearMediaButton").addEventListener("click",async()=>{if(!confirmAction("Se borrarán todas las imágenes, el fondo y el audio local."))return;await mediaDB.clear();state.cards.forEach(card=>card.imageId=null);state.settings.backgroundId=null;state.settings.backgroundType="";state.settings.backgroundName="";state.settings.musicId=null;state.settings.musicName="";state.settings.musicTracks=[];state.settings.selectedMusicId=MUSIC.BUILTIN_TRACKS[0].id;state.settings.lastMusicId=null;state.settings.musicEnabled=true;saveState();renderCards();applyMediaSettings();toast("Multimedia local eliminada. Las 10 pistas procedurales permanecen disponibles.");});
  }

  function buildEditorButtonPad(){
    $("#editorButtonPad").innerHTML=BUTTONS.map(button=>`<button type="button" data-editor-button="${button}">${LABELS[button]}</button>`).join("");
    $("#editorButtonPad").addEventListener("click",event=>{const button=event.target.closest("[data-editor-button]");if(button)addEditorAction(button.dataset.editorButton);});
  }

  async function init(){
    await mediaDB.open();loadState();state.playerDeck=sanitizeDeck(state.playerDeck);state.enemyDeck=sanitizeDeck(state.enemyDeck);ensureEnchantments();
    applyLayoutMode();buildEditorButtonPad();bindEvents();combatRenderer=COMBAT_VISUALS.getRenderer($("#combatAnimationCanvas"));updateHomeStats();renderCards();renderEmblems();renderDecks();await applyMediaSettings();updateBattleHealth();setBattleView("battleIdle");setControllerEnabled(false);
    go(location.hash.slice(1)||"home");
  }

  init().catch(error=>{console.error(error);document.body.innerHTML=`<main style="padding:40px;color:white"><h1>No se pudo iniciar QTE Lab</h1><p>${escapeHtml(error.message)}</p></main>`;});

  window.QTECore={rawPower,variationCoefficient,powerStars,sectionMinimumTime,validateCard,QTEEngine,FormulaRegistry:SYSTEMS.FormulaRegistry,Emblems:EMBLEMS.registry,Animations:ANIMATIONS.registry,CombatVisuals:COMBAT_VISUALS,Balance:BALANCE,Music:MUSIC};
})();
