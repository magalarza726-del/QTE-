(() => {
  "use strict";

  const clone = value => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  };
  const clamp = (value, min=0, max=1) => Math.min(max, Math.max(min, Number(value)));
  const round = (value, digits=2) => Number(Number(value).toFixed(digits));
  const randomId = prefix => `${String(prefix || "id")}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const shuffle = items => {
    const array = [...(items || [])];
    for (let i=array.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [array[i],array[j]]=[array[j],array[i]];
    }
    return array;
  };
  const randomBetween = (min,max) => Number(min) + Math.random()*(Number(max)-Number(min));
  const safeNumber = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  window.QTEUtils=Object.freeze({clone,clamp,round,randomId,escapeHtml,shuffle,randomBetween,safeNumber});
})();
