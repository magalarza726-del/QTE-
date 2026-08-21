(() => {
  "use strict";

  class JsonStore {
    constructor(key){this.key=String(key);}
    read(){
      const raw=localStorage.getItem(this.key);
      if(raw==null)return null;
      return JSON.parse(raw);
    }
    write(value){
      const text=JSON.stringify(value);
      localStorage.setItem(this.key,text);
      return text.length;
    }
    remove(){localStorage.removeItem(this.key);}
  }

  function describeStorageError(error){
    if(error?.name==="QuotaExceededError")return "El navegador se quedó sin espacio para guardar el estado local.";
    if(error?.name==="SecurityError")return "El navegador bloqueó el almacenamiento local para este sitio.";
    return error?.message||"No se pudo guardar el estado local.";
  }

  window.QTEStorage={...(window.QTEStorage||{}),JsonStore,describeStorageError};
})();
