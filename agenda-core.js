/* Offering-level agenda rules, shared by the browser and local verification. */
globalThis.AnneAgendaCore = (() => {
  const recommendedIds=['THR2305','THR1872','THR2621','LRN2511','LRN1144','THR2240','LRN2287','THR1871','THR2308','THR2299','LRN1504','THR2337'];
  function create(data){
    const offerings=data.sessions.flatMap(s=>s.offerings.flatMap((o,i)=>/^2026-10-2[5-8]$/.test(o.dateISO)&&Number.isFinite(o.start)&&Number.isFinite(o.end)&&o.start>=0&&o.end<=1440&&o.end>o.start?[{s,o,i,key:s.id+'@'+o.dateISO+'@'+o.start+'-'+o.end}]:[]));
    const byKey=new Map(offerings.map(r=>[r.key,r]));
    if(byKey.size!==offerings.length)throw Error('Offering identities must be unique.');
    const overlap=(a,b)=>a.o.dateISO===b.o.dateISO&&a.o.start<b.o.end&&b.o.start<a.o.end;
    const sorted=keys=>[...keys].map(k=>byKey.get(k)).filter(Boolean).sort((a,b)=>a.o.dateISO.localeCompare(b.o.dateISO)||a.o.start-b.o.start||a.s.rank-b.s.rank);
    const conflicts=keys=>{const rows=sorted(keys),pairs=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(overlap(rows[i],rows[j]))pairs.push([rows[i],rows[j]]);return pairs;};
    const competing=key=>{const r=byKey.get(key);return r?sorted(offerings.filter(x=>x.key!==key&&overlap(r,x)).map(x=>x.key)):[];};
    const baseline=recommendedIds.map(id=>{const r=offerings.find(r=>r.s.id===id);if(!r)throw Error('Recommended offering missing: '+id);return r.key;});
    if(conflicts(baseline).length)throw Error('Recommended agenda must have no overlaps.');
    function validateAnswers(value){
      if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Discovery answers must be an object.');
      const result={};for(const [k,v] of Object.entries(value)){if(!/^(?:[0-9]|1[0-4])$/.test(k)||typeof v!=='string'||v.length>100000)throw Error('Invalid discovery answer. No saved data changed.');result[k]=v;}
      return result;
    }
    function validateSelected(value){if(!Array.isArray(value)||value.length>offerings.length||value.some(k=>typeof k!=='string'||!byKey.has(k))||new Set(value).size!==value.length)throw Error('The plan includes an unknown, duplicate or unscheduled offering. No saved data changed.');return [...value];}
    function readPlan(value){
      if(!value||value.schema!=='anne-ai-world-plan'||value.version!==1||value.attendee!=='Anne Weber'||value.event!=='Oracle AI World 2026')throw Error('Choose an Anne Weber Oracle AI World 2026 plan JSON export.');
      const selected=validateSelected(value.selected),answers=validateAnswers(value.answers);
      if(typeof value.notes!=='string'||value.notes.length>200000)throw Error('Invalid agenda notes. No saved data changed.');
      return {selected,answers,notes:value.notes};
    }
    return {offerings,byKey,baseline,overlap,sorted,conflicts,competing,readPlan,validateSelected,validateAnswers};
  }
  return {create};
})();
