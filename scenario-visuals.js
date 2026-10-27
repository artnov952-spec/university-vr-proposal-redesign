import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';

// Whole, fixed-camera renders. No independently scaled people, props, masks or sprite atlases.
export const SCENARIO_FRAMES = Object.freeze(Object.fromEntries(scenarioLibrary.map(item => [item.id,
  Object.freeze(Array.from({length:5},(_,index)=>Object.freeze({
    src:`./assets/scenario-frames/${item.id}/step-${index+1}.webp?v=style20261027-r1`,width:1774,height:887
  })))
])));
export const SCENARIO_THUMBNAILS = Object.freeze(Object.fromEntries(Object.entries(SCENARIO_FRAMES).map(([id,frames])=>[id,frames[0].src.replace('.webp','-thumb.webp')])));

export function normalizeVisualContext(value) {
  if (!value || typeof value !== 'object' || !Object.hasOwn(value,'caseId') || typeof value.caseId !== 'string' || !Object.hasOwn(SCENARIO_FRAMES,value.caseId) || !Object.hasOwn(value,'points') || !Array.isArray(value.points) || value.points.length>5 || value.points.some(index=>!Number.isInteger(index)||index<0||index>4) || new Set(value.points).size!==value.points.length) return null;
  return {caseId:value.caseId,points:[...value.points]};
}

export function visualForAttempt(attempt) {
  if (!attempt?.scenario?.conceptId || !Object.hasOwn(SCENARIO_FRAMES,attempt.scenario.conceptId)) return null;
  const concept=scenarioLibrary.find(item=>item.id===attempt.scenario.conceptId);
  if (attempt.scenario.sceneId!==concept.sceneId || attempt.scenario.title!==concept.title || attempt.scenario.brief!==concept.brief || attempt.scenario.points.length!==concept.points.length || attempt.scenario.points.some((point,index)=>['id','title','description'].some(key=>point[key]!==concept.points[index][key]))) return null;
  return {caseId:concept.id,points:attempt.events.filter(event=>event.kind==='record').map(event=>concept.points.findIndex(point=>point.id===event.pointId)).filter(index=>index>=0)};
}

export function scenarioVisualState(value) {
  const context=normalizeVisualContext(value);
  if(!context)return null;
  const item=scenarioLibrary.find(entry=>entry.id===context.caseId);
  let step=0;
  while(step<5&&context.points.includes(step))step++;
  return {caseId:context.caseId,sceneId:item.sceneId,step,pending:context.points.length>step,item,
    frame:SCENARIO_FRAMES[item.id][Math.max(0,step-1)]};
}

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderVisualStatus(value,language='ru') {
  const visual=scenarioVisualState(value);
  if(!visual)return '';
  const uz=language==='uz';
  const caption=visual.step?visual.item.points[visual.step-1][uz?'uzTitle':'title']:uz?'Vaziyat ochildi. Birinchi amalni tanlang.':'Ситуация загружена. Выберите первое действие.';
  return `<div class="scenario-visual-status" role="status"><b>${uz?'Amallar':'Действия'} ${visual.step}/5</b><span>${escape(caption)}${visual.pending?`<small>${uz?'Oldingi nazorat nuqtasi qayd etilmaguncha oqibat ko‘rsatilmaydi.':'Последствие ожидает предыдущую контрольную точку.'}</small>`:''}</span></div>`;
}
export function renderScenarioVisual(value,language='ru') {
  const visual=scenarioVisualState(value);
  if(!visual)return '';
  const {frame,item}=visual;
  const title=item[language==='uz'?'uzTitle':'title'];
  return `<div class="scenario-visual" data-visual-case="${visual.caseId}" data-visual-step="${visual.step}"><div class="scenario-image"><img class="scenario-frame" src="${frame.src}" width="${frame.width}" height="${frame.height}" alt="${escape(title)}" loading="lazy"><span class="scenario-cg-label">CG / ${language==='uz'?'O‘quv namuna':'Учебный пример'}</span></div>${renderVisualStatus(value,language)}</div>`;
}

const imageCache=new Map();
function frameImage(frame) {
  if(imageCache.has(frame.src)) {const current=imageCache.get(frame.src);imageCache.delete(frame.src);imageCache.set(frame.src,current);return current;}
  if(!imageCache.has(frame.src)) imageCache.set(frame.src,new Promise((resolve,reject)=>{
    const image=new Image();image.decoding='async';
    image.onload=()=>resolve(image);
    image.onerror=()=>{imageCache.delete(frame.src);reject(new Error('Scenario frame unavailable'));};
    image.src=new URL(frame.src,import.meta.url).href;
  }));
  while(imageCache.size>4)imageCache.delete(imageCache.keys().next().value);
  return imageCache.get(frame.src);
}
export function prefetchScenarioFrame(value) {
  const visual=scenarioVisualState(value);
  if(!visual || !visual.step || typeof Image==='undefined')return;
  // Only the current and next checkpoint, never all 100 illustrations.
  if(visual.step)frameImage(visual.frame).catch(()=>{});
  if(visual.step<5)frameImage(SCENARIO_FRAMES[visual.caseId][visual.step]).catch(()=>{});
}
export async function loadScenarioFrame(base,value) {
  const visual=scenarioVisualState(value);
  if(!visual)return base;
  return frameImage(visual.frame);
}
