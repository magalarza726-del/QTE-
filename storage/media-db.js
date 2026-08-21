(() => {
  "use strict";

  class MediaDB {
    constructor({dbName="qte-lab-media",storeName="media",version=1}={}){
      this.dbName=dbName;
      this.storeName=storeName;
      this.version=version;
      this.db=null;
      this.urls=new Map();
    }
    open(){
      if(this.db)return Promise.resolve(this);
      return new Promise((resolve,reject)=>{
        const request=indexedDB.open(this.dbName,this.version);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(this.storeName))db.createObjectStore(this.storeName,{keyPath:"id"});
        };
        request.onsuccess=()=>{
          this.db=request.result;
          this.db.onversionchange=()=>{this.close();};
          resolve(this);
        };
        request.onerror=()=>reject(request.error||new Error("No se pudo abrir IndexedDB."));
        request.onblocked=()=>reject(new Error("IndexedDB está bloqueado por otra pestaña. Cierra otras instancias de QTE Lab e inténtalo de nuevo."));
      });
    }
    close(){
      this.urls.forEach(url=>URL.revokeObjectURL(url));
      this.urls.clear();
      this.db?.close?.();
      this.db=null;
    }
    store(mode="readonly"){
      if(!this.db)throw new Error("La base multimedia no está abierta.");
      return this.db.transaction(this.storeName,mode).objectStore(this.storeName);
    }
    put(blob,meta={}){
      if(!(blob instanceof Blob))return Promise.reject(new TypeError("MediaDB.put requiere un Blob."));
      return new Promise((resolve,reject)=>{
        const id=meta.id||window.QTEUtils?.randomId?.("media")||`media-${Date.now()}`;
        const record={id,blob,name:meta.name||"archivo",type:blob.type||meta.type||"application/octet-stream",createdAt:Number(meta.createdAt||Date.now())};
        const request=this.store("readwrite").put(record);
        request.onsuccess=()=>resolve(id);
        request.onerror=()=>reject(request.error||new Error("No se pudo guardar el archivo multimedia."));
      });
    }
    get(id){
      if(!id)return Promise.resolve(null);
      return new Promise((resolve,reject)=>{
        const request=this.store().get(id);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error||new Error("No se pudo leer el archivo multimedia."));
      });
    }
    getAll(){
      return new Promise((resolve,reject)=>{
        const request=this.store().getAll();
        request.onsuccess=()=>resolve(request.result||[]);
        request.onerror=()=>reject(request.error||new Error("No se pudo leer la biblioteca multimedia."));
      });
    }
    delete(id){
      if(!id)return Promise.resolve();
      this.revoke(id);
      return new Promise((resolve,reject)=>{
        const request=this.store("readwrite").delete(id);
        request.onsuccess=()=>resolve();
        request.onerror=()=>reject(request.error||new Error("No se pudo eliminar el archivo multimedia."));
      });
    }
    deleteMany(ids=[]){
      const unique=[...new Set(ids.filter(Boolean))];
      if(!unique.length)return Promise.resolve();
      unique.forEach(id=>this.revoke(id));
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(this.storeName,"readwrite");
        const store=tx.objectStore(this.storeName);
        unique.forEach(id=>store.delete(id));
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("No se pudieron eliminar algunos archivos multimedia."));
        tx.onabort=()=>reject(tx.error||new Error("La eliminación multimedia fue cancelada."));
      });
    }
    clear(){
      this.urls.forEach(url=>URL.revokeObjectURL(url));
      this.urls.clear();
      return new Promise((resolve,reject)=>{
        const request=this.store("readwrite").clear();
        request.onsuccess=()=>resolve();
        request.onerror=()=>reject(request.error||new Error("No se pudo limpiar la biblioteca multimedia."));
      });
    }
    replaceAll(records=[]){
      const normalized=(records||[]).map(record=>({
        id:String(record.id),
        blob:record.blob,
        name:record.name||"archivo",
        type:record.type||record.blob?.type||"application/octet-stream",
        createdAt:Number(record.createdAt||Date.now())
      }));
      if(normalized.some(record=>!record.id||!(record.blob instanceof Blob)))return Promise.reject(new Error("El respaldo contiene multimedia inválida."));
      this.urls.forEach(url=>URL.revokeObjectURL(url));
      this.urls.clear();
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(this.storeName,"readwrite");
        const store=tx.objectStore(this.storeName);
        store.clear();
        normalized.forEach(record=>store.put(record));
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error("No se pudo restaurar la biblioteca multimedia."));
        tx.onabort=()=>reject(tx.error||new Error("La restauración multimedia fue cancelada."));
      });
    }
    async url(id){
      if(!id)return "";
      if(this.urls.has(id))return this.urls.get(id);
      const record=await this.get(id);
      if(!record)return "";
      const url=URL.createObjectURL(record.blob);
      this.urls.set(id,url);
      return url;
    }
    revoke(id){
      const url=this.urls.get(id);
      if(url){URL.revokeObjectURL(url);this.urls.delete(id);}
    }
  }

  window.QTEStorage={...(window.QTEStorage||{}),MediaDB};
})();
