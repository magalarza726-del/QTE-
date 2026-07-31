(() => {
  "use strict";
  // v10.1.1: no hay pistas procedurales integradas. La música procede de archivos importados.
  const BUILTIN_TRACKS=[];
  function chooseRandom(items,lastId=null){
    const valid=(items||[]).filter(Boolean);
    if(!valid.length)return null;
    const pool=valid.length>1?valid.filter(item=>item.id!==lastId):valid;
    return pool[Math.floor(Math.random()*pool.length)]||valid[0];
  }
  const engine={play(){return null;},setVolume(){},stop(){}};
  window.QTEMusic={BUILTIN_TRACKS,byId:()=>null,chooseRandom,engine};
})();
