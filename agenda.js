/* Adapted from the existing add/remove, alternatives and starting-plan pattern.
   Anne keeps her original content and discovery storage; choices identify actual offerings. */
(() => {
  'use strict';
  const model=AnneAgendaCore.create(data),KEY='anne-ai-world-agenda-v1',ANSWER_KEY='anne-ai-world-discovery-v1';
  let selected=new Set(model.baseline),notes='',activeAgendaDay='',compareKey=null,pendingAction=null,storageAvailable=true;
  let stored=null;
  try{stored=localStorage.getItem(KEY);if(stored!==null){const p=JSON.parse(stored);if(p.version!==1||typeof p.notes!=='string')throw Error('Invalid saved plan');selected=new Set(model.validateSelected(p.selected));notes=p.notes;}}
  catch{storageAvailable=false;if(stored!==null){selected=new Set();$('agendaNotice').textContent='The saved agenda could not be read. Its stored value has been left untouched. Import a backup or explicitly reset to the suggested agenda.';}}
  const selectedRows=()=>model.sorted(selected);
  const overlapsSelected=r=>selectedRows().filter(x=>x.key!==r.key&&model.overlap(r,x));
  const countLabel=n=>n+' selected '+(n===1?'offering':'offerings');
  function store(){try{localStorage.setItem(KEY,JSON.stringify({version:1,selected:[...selected],notes}));storageAvailable=true;}catch{storageAvailable=false;}
    $('agendaSaveStatus').textContent=storageAvailable?'Agenda selections and agenda notes save in this browser only. Export a plan JSON for transfer or backup.':'Browser storage is unavailable. Export a plan JSON now to keep your selections and notes.';
  }
  function announce(message){$('agendaNotice').textContent=message;$('status').textContent=message;}
  const addButton=r=>`<button class="agenda-add" data-agenda-toggle="${esc(r.key)}" aria-pressed="${selected.has(r.key)}" aria-label="${selected.has(r.key)?'Remove from':'Add to'} agenda: ${esc(r.s.id)} · ${esc(r.o.date)} · ${esc(r.o.time)}">${selected.has(r.key)?'Selected · Remove from agenda':'Add to agenda'}</button>`;
  function compareButton(r){const n=model.competing(r.key).length+1;return n>1?`<button data-agenda-compare="${esc(r.key)}">${n} choices overlapping this time · compare all fit tiers</button>`:'';}
  function selectedHint(r){const cs=overlapsSelected(r);return cs.length?`<span class="agenda-conflict-label">${selected.has(r.key)?'Scheduling conflict':'Overlaps your agenda'} · ${cs.map(x=>esc(x.s.id)+' ('+esc(x.o.time)+')').join('; ')}</span>`:'';}

  const originalSlots=slots,originalCard=card,originalRender=render,originalOpen=openSession;
  slots=function(s){
    const rows=model.offerings.filter(r=>r.s.index===s.index);
    if(!rows.length)return originalSlots(s);
    return `<div class="table-wrap"><table class="slots agenda-slots"><thead><tr><th>Day · 2026</th><th>Published time</th><th>Location</th><th>My agenda · each offering</th></tr></thead><tbody>${s.offerings.map((o,i)=>{const r=rows.find(r=>r.i===i);return `<tr><td>${esc(o.date)}</td><td>${esc(o.time)}</td><td>${esc(o.location)}</td><td>${r?addButton(r)+`<span class="small">${selectedHint(r)}</span>`:'Unscheduled interest only · no timed selection'}</td></tr>`;}).join('')}</tbody></table></div>`;
  };
  card=function(s,o,key){
    let html=originalCard(s,o,key);const row=o?model.offerings.find(r=>r.s.index===s.index&&r.o===o):null,rows=model.offerings.filter(r=>r.s.index===s.index),inAgenda=rows.filter(r=>selected.has(r.key));
    if(row?selected.has(row.key):inAgenda.length)html=html.replace('class="session"','class="session agenda-selected"');
    const r=row||(rows.length===1?rows[0]:null);
    const actions=r?addButton(r)+compareButton(r)+selectedHint(r):`<span class="small muted">Choose an individual time in the expanded details.</span>`;
    const indicator=inAgenda.length?`<span class="agenda-selected-tag">${row?selected.has(row.key)?'In My agenda':'Another offering selected':inAgenda.length+' offering'+(inAgenda.length===1?'':'s')+' in My agenda'}</span>`:'';
    return html.replace('</div></summary>',`<span class="agenda-summary-actions">${indicator}${actions}</span></div></summary>`);
  };
  openSession=function(i){$('detailDialog').dataset.agendaSession=String(i);originalOpen(i);};
  function renderAgenda(){
    const rows=selectedRows(),pairs=model.conflicts(selected);
    $('agendaNavCount').textContent=rows.length;
    $('agendaStats').innerHTML=`<strong>${rows.length}</strong><span>selected offerings · ${new Set(rows.map(r=>r.s.id)).size} unique sessions · ${pairs.length} ${pairs.length===1?'conflict':'conflicts'} · All times PDT</span>`;
    $('myAgendaDays').innerHTML=eventDays.map(([d,label])=>`<button data-agenda-day="${d}" aria-pressed="${activeAgendaDay===d}">${label}<small>${countLabel(rows.filter(r=>!d||r.o.dateISO===d).length)}</small></button>`).join('');
    $('agendaConflicts').innerHTML=pairs.map(([a,b])=>`<div class="agenda-warning"><strong>Scheduling conflict — Anne to choose</strong><p>${esc(a.s.title)} · ${esc(a.o.time)}<br>${esc(b.s.title)} · ${esc(b.o.time)} · ${esc(a.o.date)}</p><div class="actions"><button data-agenda-compare="${esc(a.key)}">Compare these choices and alternatives</button><button data-agenda-toggle="${esc(a.key)}">Remove ${esc(a.s.id)}</button><button data-agenda-toggle="${esc(b.key)}">Remove ${esc(b.s.id)}</button></div></div>`).join('');
    $('myAgendaList').innerHTML=eventDays.filter(([d])=>d&&(!activeAgendaDay||activeAgendaDay===d)).map(([d,label])=>{
      const daily=rows.filter(r=>r.o.dateISO===d);let previous=null;
      return `<h3 class="group-title">${label} · 2026 · PDT</h3>`+(daily.length?daily.map(r=>{let gap='';if(previous){const minutes=r.o.start-previous.o.end;if(minutes>=0)gap=minutes<15?`<div class="agenda-warning small">Tight transition: ${minutes} minutes between ${esc(previous.s.id)} and ${esc(r.s.id)}. Allow at least 15 minutes as a planning buffer; walking time is unverified.</div>`:`<p class="agenda-gap">${minutes} minutes unallocated between sessions · protect time for transitions, breaks and conversations.</p>`;}previous=r;return gap+card(r.s,r.o,'agenda-'+r.key);}).join(''):`<div class="agenda-day-empty">No sessions selected for this day. Browse the full shortlist to add an offering.${d==='2026-10-25'?' Sunday attendance, orientation and optional paid training remain your decision.':''}</div>`);
    }).join('');
  }
  render=function(){originalRender();renderAgenda();};
  function refresh(){
    const focus=document.activeElement,selector=focus?.dataset?.agendaToggle?'[data-agenda-toggle="'+CSS.escape(focus.dataset.agendaToggle)+'"]':null;
    const scope=focus?.closest('dialog')?.id;
    render();
    if($('detailDialog').open&&$('detailDialog').dataset.agendaSession)openSession($('detailDialog').dataset.agendaSession);
    if($('agendaCompareDialog').open)renderComparison();
    if(selector){const parent=scope?$(scope):document;const target=Array.from(parent.querySelectorAll(selector)).find(e=>e.getClientRects().length);target?.focus({preventScroll:true});}
  }
  function applySelection(keys,message){selected=new Set(keys);store();refresh();announce(message);}
  function renderComparison(){
    const target=model.byKey.get(compareKey);if(!target)return;
    const rows=[target,...model.competing(compareKey)];
    $('agendaCompareTitle').textContent=rows.length+' choices overlapping this time';
    $('agendaCompareIntro').textContent=target.o.date+' · '+target.o.time+' · All fit tiers. Every option below overlaps this offering, including different start times. Some alternatives may fit together with each other. Compare their published timing before choosing.';
    const open=new Set(Array.from($('agendaCompareList').querySelectorAll('details[open]')).map(e=>e.dataset.comparison));
    $('agendaCompareList').innerHTML=rows.map((r,i)=>`<details class="agenda-comparison" data-comparison="${esc(r.key)}" ${open.has(r.key)||i===0?'open':''}><summary>${badge(r.s)}<strong>${esc(r.s.title)}</strong><span class="small muted">${esc(r.o.time)} · ${esc(r.o.location)}${selected.has(r.key)?' · In My agenda':''}</span></summary><p class="agenda-reason"><strong>Why it may help Anne · interpretation:</strong> ${esc(r.s.why)}</p><p class="small"><strong>The answer that changes the priority:</strong> ${esc(r.s.discovery)}</p>${selectedHint(r)}<div class="actions">${addButton(r)}<button data-agenda-details="${r.s.index}">Full session details</button><a href="${esc(r.s.url)}" target="_blank" rel="noopener">Open official session ↗</a></div></details>`).join('');
  }
  function compare(key){compareKey=key;renderComparison();if(!$('agendaCompareDialog').open)$('agendaCompareDialog').showModal();}
  function actionDialog(title,copy,buttons){
    $('agendaActionTitle').textContent=title;$('agendaActionCopy').innerHTML=copy;
    $('agendaActionButtons').innerHTML=buttons.map(([action,label])=>`<button data-agenda-confirm="${action}">${esc(label)}</button>`).join('')+'<button data-agenda-confirm="cancel">Cancel</button>';
    $('agendaActionDialog').showModal();
  }
  function toggle(key){
    const r=model.byKey.get(key);if(!r)return;
    if(selected.has(key)){const next=new Set(selected);next.delete(key);applySelection(next,'Removed '+r.s.id+' · '+r.o.time+'. Discovery answers and notes are retained.');return;}
    const clashes=overlapsSelected(r);
    if(!clashes.length){applySelection([...selected,key],'Added '+r.s.id+' · '+r.o.time+'. This is a planning choice, not registration.');return;}
    pendingAction={kind:'conflict',key,clashes:clashes.map(x=>x.key)};
    actionDialog('This offering overlaps your agenda',`<p><strong>${esc(r.s.title)}</strong><br>${esc(r.o.date)} · ${esc(r.o.time)}</p><p>It conflicts with these current selections:</p><ul>${clashes.map(x=>`<li>${esc(x.s.title)}<br>${esc(x.o.time)} · ${esc(x.s.tier)}</li>`).join('')}</ul><p>Keep both to compare later, or explicitly replace every conflicting selection listed above.</p>`,[['keep','Add and keep conflict'],['replace','Replace '+clashes.length+' conflicting '+(clashes.length===1?'selection':'selections')]]);
  }
  function requestReset(clear){pendingAction={kind:clear?'clear':'reset'};actionDialog(clear?'Clear agenda selections?':'Reset to recommended?',`<p>${clear?'Remove all selected offerings?':'Replace your current selections with the 12-offering suggested starting agenda?'}</p><p>Your discovery answers and agenda notes will be retained. ${clear?'':'The suggested agenda is provisional; it does not register you for any session.'}</p>`,[[clear?'clear':'reset',clear?'Clear selections only':'Restore 12 suggested offerings']]);}
  function confirmAction(action){
    const p=pendingAction;pendingAction=null;$('agendaActionDialog').close();if(action==='cancel'||!p)return;
    if(p.kind==='clear'&&action==='clear')applySelection([],'Agenda selections cleared. Discovery answers and notes are retained.');
    else if(p.kind==='reset'&&action==='reset')applySelection(model.baseline,'Restored the 12-offering suggested starting agenda. Discovery answers and notes are retained.');
    else if(p.kind==='conflict'&&action==='keep')applySelection([...selected,p.key],'Added the offering and retained the conflict for Anne to resolve in My agenda.');
    else if(p.kind==='conflict'&&action==='replace'){
      const next=new Set(selected);p.clashes.forEach(k=>next.delete(k));next.add(p.key);applySelection(next,'Selected '+model.byKey.get(p.key).s.id+' and explicitly replaced '+p.clashes.length+' conflicting '+(p.clashes.length===1?'offering':'offerings')+'. Other selections and notes are retained.');
    }
  }
  function exportPlan(){
    const payload={schema:'anne-ai-world-plan',version:1,attendee:'Anne Weber',event:'Oracle AI World 2026',timezone:data.timezone,status:'Suggested planning choices only; no registrations or meetings confirmed',selected:[...selected],sessions:selectedRows().map(r=>({key:r.key,id:r.s.id,title:r.s.title,date:r.o.dateISO,time:r.o.time,location:r.o.location,url:r.s.url})),answers:{...answers},notes};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='anne-ai-world-plan.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    announce('Plan JSON exported with your selections, discovery answers and agenda notes. Review it before sharing; keep personal exports out of the public repository.');
  }
  function importPlan(){
    let next;try{next=model.readPlan(JSON.parse($('planImportText').value));}catch(error){$('planImportStatus').textContent=error.message;return;}
    let oldPlan,oldAnswers;
    try{oldPlan=localStorage.getItem(KEY);oldAnswers=localStorage.getItem(ANSWER_KEY);localStorage.setItem(ANSWER_KEY,JSON.stringify(next.answers));localStorage.setItem(KEY,JSON.stringify({version:1,selected:next.selected,notes:next.notes}));}
    catch{try{if(oldAnswers!==undefined)oldAnswers===null?localStorage.removeItem(ANSWER_KEY):localStorage.setItem(ANSWER_KEY,oldAnswers);if(oldPlan!==undefined)oldPlan===null?localStorage.removeItem(KEY):localStorage.setItem(KEY,oldPlan);}catch{}$('planImportStatus').textContent='Browser storage is unavailable. The plan was not imported; your current displayed selections and notes were retained.';return;}
    answers=next.answers;notes=next.notes;selected=new Set(next.selected);storageAvailable=true;
    document.querySelectorAll('[data-answer]').forEach(el=>el.value=answers[el.dataset.answer]||'');$('agendaNotes').value=notes;
    $('answerExportWrap').hidden=true;$('answerExport').value='';$('planImportText').value='';$('planImportFile').value='';$('planTransferDialog').close();store();refresh();
    $('persistStatus').textContent='Answers saved in this browser only. They are not sent or submitted anywhere.';
    announce('Imported '+selected.size+' offerings, discovery answers and agenda notes. Review My agenda for conflicts.');
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-panel="agenda"]'))$('agenda').scrollIntoView({block:'start'});
    let b=e.target.closest('[data-agenda-toggle]');if(b){e.preventDefault();toggle(b.dataset.agendaToggle);return;}
    b=e.target.closest('[data-agenda-compare]');if(b){e.preventDefault();compare(b.dataset.agendaCompare);return;}
    b=e.target.closest('[data-agenda-confirm]');if(b){confirmAction(b.dataset.agendaConfirm);return;}
    b=e.target.closest('[data-agenda-day]');if(b){activeAgendaDay=b.dataset.agendaDay;renderAgenda();$('myAgendaDays').querySelector('[data-agenda-day="'+activeAgendaDay+'"]').focus({preventScroll:true});return;}
    b=e.target.closest('[data-agenda-details]');if(b){$('agendaCompareDialog').close();openSession(b.dataset.agendaDetails);return;}
  });
  $('resetRecommended').onclick=()=>requestReset(false);$('clearAgenda').onclick=()=>requestReset(true);
  $('closeAgendaCompare').onclick=()=>$('agendaCompareDialog').close();
  $('agendaActionDialog').addEventListener('cancel',()=>{pendingAction=null;});
  $('exportAgendaPlan').onclick=exportPlan;
  $('openPlanImport').onclick=()=>{$('planImportStatus').textContent='';$('planTransferDialog').showModal();};
  $('closePlanImport').onclick=()=>$('planTransferDialog').close();$('applyPlanImport').onclick=importPlan;
  $('planImportFile').onchange=async()=>{const file=$('planImportFile').files[0];if(!file)return;if(file.size>2000000){$('planImportStatus').textContent='This file is too large for an agenda export.';return;}try{$('planImportText').value=await file.text();$('planImportStatus').textContent='File loaded. Click Import plan and notes to replace this browser’s saved plan.';}catch{$('planImportStatus').textContent='The file could not be read. No saved data changed.';}};
  $('agendaNotes').value=notes;$('agendaNotes').oninput=()=>{notes=$('agendaNotes').value;store();};
  if(stored===null&&storageAvailable)store();else $('agendaSaveStatus').textContent=storageAvailable?'Agenda restored from this browser. Notes and choices are not synced between domains or devices.':'Storage could not be read. Export a plan JSON to keep changes.';
  render();
})();
