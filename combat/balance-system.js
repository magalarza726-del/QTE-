(() => {
  "use strict";

  const rules=Object.freeze({
    maxHp:20,
    maxDamagePerCardRate:.38,
    maxDamagePerTurnRate:.58,
    maxSelfDamagePerTurnRate:.25,
    maxHealingPerTurnRate:.15,
    shadowExtraMultiplier:.65
  });
  const maxDamagePerCard=()=>rules.maxHp*rules.maxDamagePerCardRate;
  const maxDamagePerTurn=()=>rules.maxHp*rules.maxDamagePerTurnRate;
  const maxSelfDamagePerTurn=()=>rules.maxHp*rules.maxSelfDamagePerTurnRate;
  const maxHealingPerTurn=()=>rules.maxHp*rules.maxHealingPerTurnRate;

  function executionBaseDamage(execution){
    const raw=Math.max(0,Number(execution?.result?.netPower||0)*Number(execution?.runtime?.outgoingMultiplier||1));
    return Math.min(maxDamagePerCard(),raw);
  }
  function selfDamage(execution,perfectDamage){
    if(!execution?.runtime?.selfDamagePerError)return 0;
    const rate=Number(execution.runtime.selfDamageRatePerError||.08);
    const cap=rules.maxHp*Number(execution.runtime.selfDamageCapRate||rules.maxSelfDamagePerTurnRate);
    return Math.min(cap,Math.max(0,Number(perfectDamage||0))*rate*Math.max(0,Number(execution?.result?.incorrect||0)));
  }
  function sideSelfDamage(executions,perfectDamageFor){
    return Math.min(maxSelfDamagePerTurn(),(executions||[]).reduce((sum,execution)=>sum+selfDamage(execution,perfectDamageFor(execution)),0));
  }
  function incomingMultiplier(executions){
    return (executions||[]).reduce((value,execution)=>Math.min(value,Number(execution?.runtime?.incomingMultiplier||1)),1);
  }
  function allocateDamage(executions,incoming,targetHp){
    const projected=(executions||[]).map(execution=>Math.min(maxDamagePerCard(),executionBaseDamage(execution)*Number(incoming||1)));
    const uncapped=projected.reduce((sum,value)=>sum+value,0);
    const total=Math.min(maxDamagePerTurn(),uncapped);
    const effectiveTotal=Math.min(Math.max(0,Number(targetHp||0)),total);
    return {projected,total,effectiveTotal,uncapped,perExecution:projected.map(value=>uncapped>0?effectiveTotal*(value/uncapped):0)};
  }
  function healing(executions,damageAllocation){
    const requested=(executions||[]).reduce((sum,execution,index)=>sum+Number(damageAllocation?.perExecution?.[index]||0)*Number(execution?.runtime?.healingRate||0),0);
    const runtimeCap=(executions||[]).reduce((cap,execution)=>Math.max(cap,rules.maxHp*Number(execution?.runtime?.healingCapRate||0)),0);
    return Math.min(requested,runtimeCap||maxHealingPerTurn(),maxHealingPerTurn());
  }

  window.QTEBalance={rules,maxDamagePerCard,maxDamagePerTurn,maxSelfDamagePerTurn,maxHealingPerTurn,executionBaseDamage,selfDamage,sideSelfDamage,incomingMultiplier,allocateDamage,healing};
})();
