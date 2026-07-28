(() => {
  "use strict";

  const INITIAL = window.QTE_INITIAL_DATA;
  if (!INITIAL) throw new Error("No se pudo cargar data.js");

  const APP_VERSION = "8.0.0";
  const STORAGE_KEY = "qte-lab-pages-v8";
  const DB_NAME = "qte-lab-media-v8";
  const DB_STORE = "media";
  const BUTTONS = ["UP", "DOWN", "LEFT", "RIGHT", "A", "B", "X", "Y", "L1", "R1", "L2", "R2"];
  const LABELS = {UP:"↑",DOWN:"↓",LEFT:"←",RIGHT:"→",A:"A",B:"B",X:"X",Y:"Y",L1:"L1",R1:"R1",L2:"L2",R2:"R2"};
  const MAX_HP = 20;
  const DECK_SIZE = 12;
  const HAND_SIZE = 3;
  const MIN_TAP_TIME = 0.3;
  const HOLD_MIN = 1.5;
  const HOLD_MAX = 3.0;
  const HOLD_BONUS = 0.05;
  const RAW_POWER_MIN = 1.0;
  const RAW_POWER_MAX = (1 / MIN_TAP_TIME) + HOLD_BONUS;
  const AI_CONFIG = {
    "Fácil": {accuracyMin:.50, accuracyMax:.70, reactionMin:300, reactionMax:520},
    "Normal": {accuracyMin:.70, accuracyMax:.90, reactionMin:180, reactionMax:340},
    "Difícil": {accuracyMin:.90, accuracyMax:.99, reactionMin:90, reactionMax:190}
  };
  const DEFAULT_SETTINGS = {
    difficulty:"Normal", musicVolume:35,
    backgroundId:null, backgroundType:"", backgroundName:"",
    backgroundOpacity:25, overlayOpacity:68, backgroundBlur:2, safeMode:true,
    musicId:null, musicName:"", musicEnabled:true
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

  function normalizeAction(value) {
    if (typeof value === "string") return {button:value, kind:"tap", holdDuration:0};
    return {
      button:String(value.boton ?? value.button ?? ""),
      kind:String(value.tipo ?? value.kind ?? "tap").toLowerCase(),
      holdDuration:Number(value.duracion ?? value.holdDuration ?? value.hold_duration ?? 0)
    };
  }
  function serializeAction(action) {
    return action.kind === "hold"
      ? {boton:action.button, tipo:"hold", duracion:round(Number(action.holdDuration),3)}
      : action.button;
  }
  function cardActions(card) {
    return card.secciones.flatMap(section => section.botones.map(normalizeAction));
  }
  function cardTotalButtons(card) { return card.secciones.reduce((sum,s)=>sum+s.botones.length,0); }
  function cardTotalTime(card) { return card.secciones.reduce((sum,s)=>sum+Number(s.tiempo||0),0); }
  function sectionMinimumTime(section) {
    const actions=section.botones.map(normalizeAction);
    const taps=actions.filter(a=>a.kind!=="hold").length;
    const holds=actions.filter(a=>a.kind==="hold").reduce((sum,a)=>sum+Number(a.holdDuration||0),0);
    return Math.max(MIN_TAP_TIME,taps*MIN_TAP_TIME+holds);
  }
  function cardMinimumTime(card) { return card.secciones.reduce((sum,s)=>sum+sectionMinimumTime(s),0); }
  function hasHold(card) { return cardActions(card).some(a=>a.kind==="hold"); }
  function rawPower(card) {
    const total=cardTotalTime(card);
    return total>0 ? cardTotalButtons(card)/total + (hasHold(card)?HOLD_BONUS:0) : 0;
  }
  function variationCoefficient(card) {
    const buttons=cardActions(card).map(a=>a.button);
    if (!buttons.length) return 0;
    const counts={}; buttons.forEach(b=>counts[b]=(counts[b]||0)+1);
    const sumSquares=Object.values(counts).reduce((sum,n)=>sum+n*n,0);
    return Math.sqrt((buttons.length*buttons.length)/sumSquares)/10;
  }
  function powerStars(card) {
    const power=rawPower(card);
    if (power<=0) return 0;
    const normalized=(power-RAW_POWER_MIN)/(RAW_POWER_MAX-RAW_POWER_MIN);
    return clamp(Math.round(1+normalized*6),1,7);
  }
  function netPower(correct, realTime, coefficient) {
    return realTime>0 ? (correct/realTime)*(1+coefficient) : 0;
  }
  function accuracy(correct,total) { return total>0 ? clamp(correct/total*100,0,100) : 0; }

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
        if (!["tap","hold"].includes(action.kind)) errors.push(`Tipo de acción inválido en la sección ${index+1}.`);
        if (action.kind==="hold" && (action.holdDuration<HOLD_MIN || action.holdDuration>HOLD_MAX)) errors.push(`Los HOLD deben durar entre ${HOLD_MIN} y ${HOLD_MAX} s.`);
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
      this.holdingButton=null;
      this.holdStartedAt=0;
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
    get holdProgress(){
      const action=this.expectedAction;
      if(!action||action.kind!=="hold"||this.holdingButton!==action.button)return 0;
      return clamp((this.now()-this.holdStartedAt)/Math.max(action.holdDuration,.001),0,1);
    }
    start(){
      const now=this.now();
      this.currentSectionIndex=0;this.currentButtonIndex=0;this.correctCount=0;this.incorrectCount=0;this.missedCount=0;
      this.startedAt=now;this.sectionStartedAt=now;this.finishedAt=0;this.active=true;this.finished=false;this.finishReason="";this.holdingButton=null;this.result=null;
    }
    begin(button){
      if(!this.active||this.finished)return {correct:false,finished:this.finished};
      this.update(); if(this.finished)return {correct:false,finished:true};
      const action=this.expectedAction;
      if(!action){this.finish("sin_secuencia");return {correct:false,finished:true};}
      if(button!==action.button){this.incorrectCount++;return {correct:false,expected:action.button};}
      if(action.kind==="hold"){
        if(this.holdingButton!==button){this.holdingButton=button;this.holdStartedAt=this.now();}
        return {correct:true,holdStarted:true,expected:action.button};
      }
      const changed=this.complete(this.now());
      return {correct:true,actionCompleted:true,sectionChanged:changed,finished:this.finished,expected:action.button};
    }
    end(button){
      const action=this.expectedAction;
      if(!this.active||this.finished)return {correct:false,finished:this.finished};
      if(this.holdingButton!==button||!action||action.kind!=="hold")return {correct:true};
      const now=this.now();
      if(now-this.holdStartedAt+1e-9>=action.holdDuration){
        const changed=this.complete(this.holdStartedAt+action.holdDuration);
        return {correct:true,actionCompleted:true,sectionChanged:changed,finished:this.finished};
      }
      this.holdingButton=null;this.holdStartedAt=0;this.incorrectCount++;
      return {correct:false,holdFailed:true};
    }
    update(){
      if(!this.active||this.finished)return this.finished;
      const now=this.now();
      const action=this.expectedAction;
      if(action&&action.kind==="hold"&&this.holdingButton===action.button&&now-this.holdStartedAt>=action.holdDuration){
        const completion=this.holdStartedAt+action.holdDuration;
        const deadline=this.sectionStartedAt+Number(this.currentSection?.tiempo||0);
        if(completion<=deadline+1e-9)this.complete(completion);
      }
      while(this.active&&!this.finished){
        const section=this.currentSection;
        if(!section){this.finish("completado",now);break;}
        const deadline=this.sectionStartedAt+Number(section.tiempo);
        if(now<deadline)break;
        this.missedCount+=Math.max(0,section.botones.length-this.currentButtonIndex);
        this.holdingButton=null;this.holdStartedAt=0;this.currentSectionIndex++;this.currentButtonIndex=0;
        if(this.currentSectionIndex>=this.card.secciones.length){this.finish("tiempo_agotado",now);break;}
        this.sectionStartedAt=deadline;
      }
      return this.finished;
    }
    complete(now){
      this.correctCount++;this.currentButtonIndex++;this.holdingButton=null;this.holdStartedAt=0;
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
      this.active=false;this.finished=true;this.finishReason=reason;this.finishedAt=at;this.holdingButton=null;
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
    battle:null,route:"home"
  };
  const editor={index:null,card:null,activeSection:0,originalImageId:null,pendingImageId:null,saved:false};
  let qteFrame=0;

  function defaultState(){
    const decks=clone(INITIAL.starterDecks);
    return {
      cards:clone(INITIAL.cards),decks,
      playerDeck:clone(decks["Inicial Fácil"]||[]),enemyDeck:clone(decks["Inicial Medio"]||[]),
      settings:clone(DEFAULT_SETTINGS)
    };
  }
  function loadState(){
    const fallback=defaultState();
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(!stored||stored.version!==APP_VERSION)Object.assign(state,fallback);
      else {
        state.cards=Array.isArray(stored.cards)?stored.cards:fallback.cards;
        state.decks=stored.decks&&typeof stored.decks==="object"?stored.decks:fallback.decks;
        state.playerDeck=Array.isArray(stored.playerDeck)?stored.playerDeck:fallback.playerDeck;
        state.enemyDeck=Array.isArray(stored.enemyDeck)?stored.enemyDeck:fallback.enemyDeck;
        state.settings={...fallback.settings,...stored.settings};
      }
    }catch(error){console.warn(error);Object.assign(state,fallback);}
  }
  function saveState(message="Guardado local"){
    const payload={version:APP_VERSION,cards:state.cards,decks:state.decks,playerDeck:state.playerDeck,enemyDeck:state.enemyDeck,settings:state.settings};
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
  function cardByName(name){ return state.cards.find(card=>card.nombre===name)||null; }
  function sanitizeDeck(deck){ return Array.from({length:DECK_SIZE},(_,i)=>cardByName(deck[i])?deck[i]:(state.cards[i%state.cards.length]?.nombre||"")); }

  function go(route){
    const valid=["home","cards","decks","battle","media","data"].includes(route)?route:"home";
    state.route=valid;
    $$(".page").forEach(page=>page.classList.toggle("active",page.dataset.page===valid));
    $$(".nav-button").forEach(button=>button.classList.toggle("active",button.dataset.route===valid));
    if(location.hash!==`#${valid}`)history.replaceState(null,"",`#${valid}`);
    if(valid==="cards")renderCards();
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
    return `<article class="${context==="battle"?"battle-card":"card-tile"}" data-card-index="${index}">
      <button type="button" data-action="${context==="battle"?"select-battle-card":"edit-card"}" data-index="${index}">
        <div class="card-art" data-media-id="${escapeHtml(card.imageId||"")}"><span>${card.imageId?"Cargando…":"Sin imagen"}</span></div>
        <div class="card-body"><div class="stars">${"★".repeat(stars)}${"☆".repeat(7-stars)}</div><h3>${escapeHtml(card.nombre)}</h3>
          <div class="card-meta"><span>PB<strong>${rawPower(card).toFixed(3)}</strong></span><span>Acciones<strong>${cardTotalButtons(card)}</strong></span><span>Secciones<strong>${card.secciones.length}</strong></span></div>
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
    editor.card=index===null?{nombre:"Nueva carta",secciones:[{nombre:"Inicio",tiempo:1.2,botones:["A","B","X","Y"]}],coeficiente:0,imageId:null}:clone(state.cards[index]);
    editor.activeSection=0;editor.originalImageId=editor.card.imageId||null;editor.pendingImageId=null;editor.saved=false;
    $("#editorTitle").textContent=index===null?"Nueva carta":`Editar · ${editor.card.nombre}`;
    $("#editorCardName").value=editor.card.nombre;
    $("#editorError").classList.add("hidden");
    setImageContainer($("#editorArtPreview"),editor.card.imageId,"Sin imagen");
    renderEditorSections(); updateEditorSummary();
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
        <div class="section-actions">${actions.length?actions.map((action,aIndex)=>`<span class="action-pill">${LABELS[action.button]||action.button}${action.kind==="hold"?`<small>HOLD ${action.holdDuration.toFixed(1)}s</small>`:""}<button type="button" data-action="remove-action" data-index="${index}" data-action-index="${aIndex}">×</button></span>`).join(""):"<span class='muted'>Sin acciones todavía.</span>"}</div>
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
  }
  function addEditorAction(button){
    const section=editor.card.secciones[editor.activeSection]; if(!section)return;
    const kind=$("#editorActionType").value;
    const holdDuration=clamp(Number($("#editorHoldDuration").value)||1.8,HOLD_MIN,HOLD_MAX);
    section.botones.push(kind==="hold"?{boton:button,tipo:"hold",duracion:holdDuration}:button);
    renderEditorSections();updateEditorSummary();
  }
  async function saveEditor(){
    editor.card.nombre=$("#editorCardName").value.trim();
    editor.card.coeficiente=round(variationCoefficient(editor.card),8);
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

  function renderDeckPresetOptions(){
    const names=Object.keys(state.decks).sort((a,b)=>a.localeCompare(b,"es"));
    for(const id of ["#playerPresetSelect","#enemyPresetSelect"]){
      const select=$(id);const current=select.value;select.innerHTML=names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      if(names.includes(current))select.value=current;
    }
  }
  function renderDeckSlots(side){
    const deck=side==="player"?state.playerDeck:state.enemyDeck;
    const container=$(side==="player"?"#playerDeckSlots":"#enemyDeckSlots");
    const options=state.cards.map(card=>`<option value="${escapeHtml(card.nombre)}">${escapeHtml(card.nombre)} · ${powerStars(card)}★</option>`).join("");
    container.innerHTML=Array.from({length:DECK_SIZE},(_,index)=>{
      const selected=deck[index]||"";
      const card=cardByName(selected);
      return `<div class="deck-slot"><span class="slot-number">${index+1}</span><select data-deck-side="${side}" data-slot="${index}"><option value="">Selecciona una carta</option>${options}</select><span class="slot-stars">${card?"★".repeat(powerStars(card)):"—"}</span></div>`;
    }).join("");
    $$(`select[data-deck-side="${side}"]`,container).forEach((select,index)=>select.value=deck[index]||"");
    const count=deck.filter(name=>cardByName(name)).length;
    $(side==="player"?"#playerDeckCount":"#enemyDeckCount").textContent=`${count} / ${DECK_SIZE}`;
  }
  function renderMusicOptions(){
    const select=$("#musicSelect");const current=(state.settings.musicEnabled&&state.settings.musicId)?state.settings.musicId:"";
    select.innerHTML=`<option value="">Sin música</option>${state.settings.musicId?`<option value="${escapeHtml(state.settings.musicId)}">${escapeHtml(state.settings.musicName||"Pista personalizada")}</option>`:""}`;
    select.value=current;
    $("#musicVolume").value=state.settings.musicVolume;$("#musicVolumeOutput").textContent=`${state.settings.musicVolume}%`;
    $("#musicFileName").textContent=state.settings.musicId?state.settings.musicName:"Sin audio cargado.";
  }
  function renderDecks(){
    state.playerDeck=sanitizeDeck(state.playerDeck);state.enemyDeck=sanitizeDeck(state.enemyDeck);
    renderDeckPresetOptions();renderDeckSlots("player");renderDeckSlots("enemy");renderMusicOptions();
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
  async function attachMusic(file){
    if(!file)return;if(!file.type.startsWith("audio/")){toast("Selecciona un archivo de audio.","error");return;}
    const old=state.settings.musicId;const id=await mediaDB.put(file,{name:file.name});
    state.settings.musicId=id;state.settings.musicName=file.name;state.settings.musicEnabled=true;if(old)await mediaDB.delete(old);
    saveState("Música guardada");renderMusicOptions();toast("Música de combate actualizada.");
  }

  function makeBattleDeck(names){return {draw:shuffle(names.map(name=>clone(cardByName(name))).filter(Boolean)),hand:[],discard:[]};}
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
    for(const id of ["battleIdle","battleSelection","battleQte","battleResult"])$(`#${id}`).classList.toggle("hidden",id!==view);
  }
  async function playBattleMusic(){
    const audio=$("#battleMusic");audio.pause();audio.removeAttribute("src");
    if(!state.settings.musicId||!state.settings.musicEnabled)return;
    const url=await mediaDB.url(state.settings.musicId);if(!url)return;
    audio.src=url;audio.volume=Number(state.settings.musicVolume)/100;audio.play().catch(()=>toast("El navegador requiere una interacción para iniciar el audio."));
  }
  function stopBattleMusic(){const audio=$("#battleMusic");audio.pause();audio.currentTime=0;}
  async function startBattle(){
    const playerNames=state.playerDeck.filter(name=>cardByName(name));const enemyNames=state.enemyDeck.filter(name=>cardByName(name));
    if(playerNames.length!==DECK_SIZE||enemyNames.length!==DECK_SIZE){toast("Ambos decks deben tener exactamente 12 cartas válidas.","error");go("decks");return;}
    state.battle={playerHp:MAX_HP,enemyHp:MAX_HP,turn:1,phase:"select",playerDeck:makeBattleDeck(playerNames),enemyDeck:makeBattleDeck(enemyNames),playerCard:null,enemyCard:null,engine:null,playerResult:null,enemyResult:null,gameOver:false};
    go("battle");await applyMediaSettings();await playBattleMusic();updateBattleHealth();beginBattleTurn();
  }
  function beginBattleTurn(){
    const battle=state.battle;if(!battle)return;
    cancelAnimationFrame(qteFrame);battle.phase="select";battle.playerCard=null;battle.enemyCard=null;battle.engine=null;
    drawToHand(battle.playerDeck);drawToHand(battle.enemyDeck);
    $("#battleTurnLabel").textContent=`TURNO ${battle.turn}`;$("#battlePhaseLabel").textContent="SELECCIÓN";$("#selectionTurnText").textContent=`Turno ${battle.turn}`;
    $("#battleHand").innerHTML=battle.playerDeck.hand.map((card,index)=>cardTileHtml(card,index,"battle")).join("");
    setBattleView("battleSelection");hydrateCardImages($("#battleHand"));setControllerEnabled(false);
  }
  async function selectBattleCard(index){
    const battle=state.battle;if(!battle||battle.phase!=="select")return;
    battle.playerCard=battle.playerDeck.hand[index];battle.enemyCard=battle.enemyDeck.hand[Math.floor(Math.random()*battle.enemyDeck.hand.length)];
    if(!battle.playerCard||!battle.enemyCard)return;
    battle.phase="qte";battle.engine=new QTEEngine(battle.playerCard);battle.engine.start();
    $("#battlePhaseLabel").textContent="QTE DEL JUGADOR";$("#activeCardName").textContent=battle.playerCard.nombre;$("#activeRawPower").textContent=rawPower(battle.playerCard).toFixed(3);$("#activeStars").textContent=powerStars(battle.playerCard);
    await setImageContainer($("#activeCardArt"),battle.playerCard.imageId,"Sin arte");
    setBattleView("battleQte");setControllerEnabled(true);renderQte();qteLoop();
  }
  function renderQte(){
    const engine=state.battle?.engine;if(!engine)return;
    const section=engine.currentSection;
    if(!section)return;
    $("#qteSectionName").textContent=`SECCIÓN ${engine.currentSectionIndex+1} · ${section.nombre}`;
    $("#qteTimer").textContent=engine.sectionRemaining.toFixed(2);
    $("#qteSequence").innerHTML=section.botones.map((value,index)=>{
      const action=normalizeAction(value);let cls=index<engine.currentButtonIndex?"done":index===engine.currentButtonIndex?"current":"";
      return `<span class="qte-chip ${cls}">${LABELS[action.button]||action.button}${action.kind==="hold"?`<small>HOLD ${action.holdDuration.toFixed(1)}s</small>`:""}</span>`;
    }).join("");
    const expected=engine.expectedAction;const holding=expected?.kind==="hold"&&engine.holdingButton===expected.button;
    $("#holdProgressWrap").classList.toggle("hidden",!holding);
    if(holding){$("#holdProgressLabel").textContent=`MANTÉN ${LABELS[expected.button]} · ${expected.holdDuration.toFixed(1)} s`;$("#holdProgressFill").style.width=`${engine.holdProgress*100}%`;}
  }
  function qteLoop(){
    const battle=state.battle;const engine=battle?.engine;if(!battle||!engine||battle.phase!=="qte")return;
    engine.update();renderQte();
    if(engine.finished){battle.playerResult=engine.result;finishBattleTurn();return;}
    qteFrame=requestAnimationFrame(qteLoop);
  }
  function setControllerEnabled(enabled){$$('[data-qte]').forEach(button=>button.disabled=!enabled);}
  function flashController(buttonName,correct){
    const button=$(`[data-qte="${buttonName}"]`);if(!button)return;
    button.classList.remove("correct","wrong");void button.offsetWidth;button.classList.add(correct?"correct":"wrong");setTimeout(()=>button.classList.remove("correct","wrong"),360);
  }
  function controllerDown(buttonName,element){
    const battle=state.battle;if(!battle||battle.phase!=="qte"||!battle.engine)return;
    element.classList.add("pressed");const result=battle.engine.begin(buttonName);flashController(buttonName,!!result.correct);renderQte();
  }
  function controllerUp(buttonName,element){
    element.classList.remove("pressed");const battle=state.battle;if(!battle||battle.phase!=="qte"||!battle.engine)return;
    const result=battle.engine.end(buttonName);if(result.holdFailed)flashController(buttonName,false);renderQte();
  }
  function simulateAI(card,difficulty){
    const config=AI_CONFIG[difficulty]||AI_CONFIG.Normal;let correct=0,incorrect=0,missed=0,totalTime=0;
    for(const section of card.secciones){
      let elapsed=0;const actions=section.botones.map(normalizeAction);
      for(let i=0;i<actions.length;i++){
        const action=actions[i];let completed=false;
        while(elapsed<Number(section.tiempo)&&!completed){
          const reaction=randomBetween(config.reactionMin,config.reactionMax)/1000;elapsed+=reaction;
          if(elapsed>=Number(section.tiempo))break;
          const target=randomBetween(config.accuracyMin,config.accuracyMax);
          if(Math.random()<=target){
            const extra=action.kind==="hold"?action.holdDuration:0;
            if(elapsed+extra<=Number(section.tiempo)+1e-9){elapsed+=extra;correct++;completed=true;}else break;
          }else incorrect++;
        }
        if(!completed){missed+=actions.length-i;elapsed=Number(section.tiempo);break;}
      }
      totalTime+=Math.min(elapsed,Number(section.tiempo));
    }
    const coefficient=variationCoefficient(card);const power=netPower(correct,Math.max(totalTime,.001),coefficient);
    return {correct,incorrect,missed,total:cardTotalButtons(card),realTime:totalTime,timeLimit:cardTotalTime(card),accuracy:accuracy(correct,cardTotalButtons(card)),coefficient,netPower:power,damage:Math.max(0,power),reason:missed?"tiempo_agotado":"completado"};
  }
  function finishBattleTurn(){
    const battle=state.battle;if(!battle||!battle.playerResult)return;
    cancelAnimationFrame(qteFrame);setControllerEnabled(false);battle.phase="result";
    battle.enemyResult=simulateAI(battle.enemyCard,state.settings.difficulty);
    battle.enemyHp=Math.max(0,battle.enemyHp-battle.playerResult.damage);battle.playerHp=Math.max(0,battle.playerHp-battle.enemyResult.damage);updateBattleHealth();
    const p=battle.playerResult,e=battle.enemyResult;
    let headline=p.damage>e.damage?"¡Ventaja del jugador!":p.damage<e.damage?"El rival golpeó más fuerte":"Turno equilibrado";
    if(battle.playerHp<=0||battle.enemyHp<=0){battle.gameOver=true;headline=battle.playerHp<=0&&battle.enemyHp<=0?"Empate total":battle.enemyHp<=0?"¡Victoria del jugador!":"Victoria del rival";stopBattleMusic();}
    $("#battlePhaseLabel").textContent=battle.gameOver?"COMBATE FINALIZADO":"RESULTADO";$("#resultHeadline").textContent=headline;
    $("#resultMetrics").innerHTML=`
      <article><strong>${p.damage.toFixed(2)}</strong><small>Daño jugador</small></article><article><strong>${e.damage.toFixed(2)}</strong><small>Daño rival</small></article>
      <article><strong>${p.accuracy.toFixed(1)}%</strong><small>Precisión jugador</small></article><article><strong>${e.accuracy.toFixed(1)}%</strong><small>Precisión rival</small></article>
      <article><strong>${p.correct}/${p.total}</strong><small>Correctos jugador</small></article><article><strong>${e.correct}/${e.total}</strong><small>Correctos rival</small></article>
      <article><strong>${p.realTime.toFixed(2)} s</strong><small>Tiempo jugador</small></article><article><strong>${e.realTime.toFixed(2)} s</strong><small>Tiempo rival</small></article>`;
    $("#continueBattleButton").textContent=battle.gameOver?"Nueva batalla":"Siguiente turno";setBattleView("battleResult");
    const pIndex=battle.playerDeck.hand.indexOf(battle.playerCard);if(pIndex>=0)battle.playerDeck.discard.push(...battle.playerDeck.hand.splice(pIndex,1));
    const eIndex=battle.enemyDeck.hand.indexOf(battle.enemyCard);if(eIndex>=0)battle.enemyDeck.discard.push(...battle.enemyDeck.hand.splice(eIndex,1));
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
    const payload={app:"QTE Lab",version:APP_VERSION,exportedAt:new Date().toISOString(),state:{cards:state.cards,decks:state.decks,playerDeck:state.playerDeck,enemyDeck:state.enemyDeck,settings:state.settings},media};
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
      state.cards=payload.state.cards;state.decks=payload.state.decks||{};state.playerDeck=payload.state.playerDeck||[];state.enemyDeck=payload.state.enemyDeck||[];state.settings={...defaultState().settings,...payload.state.settings};
      saveState("Respaldo importado");location.reload();
    }catch(error){console.error(error);toast(error.message||"No se pudo importar el respaldo.","error");}
  }

  function bindEvents(){
    $("#brandHome").addEventListener("click",()=>go("home"));
    $("#mainNav").addEventListener("click",event=>{const button=event.target.closest("[data-route]");if(button)go(button.dataset.route);});
    $$('[data-go]').forEach(button=>button.addEventListener("click",()=>go(button.dataset.go)));
    window.addEventListener("hashchange",()=>go(location.hash.slice(1)));

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
      state.cards=clone(INITIAL.cards);state.decks={...clone(INITIAL.starterDecks),...state.decks};state.playerDeck=clone(INITIAL.starterDecks["Inicial Fácil"]);state.enemyDeck=clone(INITIAL.starterDecks["Inicial Medio"]);saveState();renderCards();renderDecks();toast("Cartas iniciales restauradas.");
    });

    // El formulario usa botones controlados para evitar que la validación HTML cierre el diálogo antes de tiempo.
    $$('[value="cancel"]',$("#cardEditorDialog")).forEach(button=>{button.type="button";button.addEventListener("click",closeEditor);});
    $("#cardEditorForm").addEventListener("submit",event=>{event.preventDefault();saveEditor();});
    $("#cardEditorDialog").addEventListener("close",async()=>{if(!editor.saved&&editor.pendingImageId)await mediaDB.delete(editor.pendingImageId);});
    $("#editorCardName").addEventListener("input",updateEditorSummary);
    $("#editorActionType").addEventListener("change",()=>$("#editorHoldDurationLabel").classList.toggle("hidden",$("#editorActionType").value!=="hold"));
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
    $("#musicSelect").addEventListener("change",event=>{state.settings.musicEnabled=!!event.target.value;saveState();});
    $("#musicVolume").addEventListener("input",event=>{state.settings.musicVolume=Number(event.target.value);$("#musicVolumeOutput").textContent=`${state.settings.musicVolume}%`;$("#battleMusic").volume=state.settings.musicVolume/100;saveState();});
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
    $("#musicInput").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";attachMusic(file);});
    $("#removeMusicButton").addEventListener("click",async()=>{if(state.settings.musicId)await mediaDB.delete(state.settings.musicId);state.settings.musicId=null;state.settings.musicName="";state.settings.musicEnabled=false;saveState();renderMusicOptions();stopBattleMusic();});

    $("#exportBackupButton").addEventListener("click",exportBackup);$("#importBackupInput").addEventListener("change",event=>{const file=event.target.files[0];event.target.value="";importBackup(file);});
    $("#resetEverythingButton").addEventListener("click",async()=>{if(!confirmAction("Se borrarán cartas, decks, multimedia y ajustes locales. ¿Continuar?"))return;localStorage.removeItem(STORAGE_KEY);await mediaDB.clear();location.reload();});
    $("#clearMediaButton").addEventListener("click",async()=>{if(!confirmAction("Se borrarán todas las imágenes, el fondo y el audio local."))return;await mediaDB.clear();state.cards.forEach(card=>card.imageId=null);state.settings.backgroundId=null;state.settings.backgroundType="";state.settings.backgroundName="";state.settings.musicId=null;state.settings.musicName="";state.settings.musicEnabled=false;saveState();renderCards();applyMediaSettings();toast("Multimedia local eliminada.");});
  }

  function buildEditorButtonPad(){
    $("#editorButtonPad").innerHTML=BUTTONS.map(button=>`<button type="button" data-editor-button="${button}">${LABELS[button]}</button>`).join("");
    $("#editorButtonPad").addEventListener("click",event=>{const button=event.target.closest("[data-editor-button]");if(button)addEditorAction(button.dataset.editorButton);});
  }

  async function init(){
    await mediaDB.open();loadState();state.playerDeck=sanitizeDeck(state.playerDeck);state.enemyDeck=sanitizeDeck(state.enemyDeck);
    buildEditorButtonPad();bindEvents();updateHomeStats();renderCards();renderDecks();await applyMediaSettings();updateBattleHealth();setBattleView("battleIdle");setControllerEnabled(false);
    go(location.hash.slice(1)||"home");
  }

  init().catch(error=>{console.error(error);document.body.innerHTML=`<main style="padding:40px;color:white"><h1>No se pudo iniciar QTE Lab</h1><p>${escapeHtml(error.message)}</p></main>`;});

  window.QTECore={rawPower,variationCoefficient,powerStars,sectionMinimumTime,validateCard,QTEEngine};
})();
