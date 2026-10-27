import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';
import { SCENARIO_FRAMES } from './scenario-visuals.js?v=sales20261027-r7local';
import { proposalContent } from './proposal-content.js?v=sales20261027-r7local';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PILOT_CASES = Object.freeze(scenarioLibrary.map(item => item.id));
export const DEFAULT_PILOT_CASE = 'market-01';
export function pilotPlan(caseId = DEFAULT_PILOT_CASE, language = 'ru') {
  if (!PILOT_CASES.includes(caseId)) throw new RangeError('Unknown pilot case');
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const item = scenarioLibrary.find(entry => entry.id === caseId);
  const title = language === 'uz' ? item.uzTitle : item.title;
  const actions = item.points.map(point => ({ title: language === 'uz' ? point.uzTitle : point.title, description: language === 'uz' ? point.uzDescription : point.description }));
  const steps = [
    t('Согласовать цель, учебную группу и критерии с преподавателем.', 'Maqsad, o‘quv guruhi va mezonlarni o‘qituvchi bilan kelishish.'),
    t('Показать учебную сцену и пройти пять действий курсанта.', 'O‘quv sahnasini ko‘rsatish va kursantning beshta amalini bajarish.'),
    t('Открыть журнал, обсудить пропуски и повторить сложный момент.', 'Jurnalni ochish, o‘tkazilgan nuqtalarni muhokama qilish va murakkab joyni takrorlash.'),
    t('Определить состав класса, оборудование и следующий этап разработки.', 'Xona tarkibi, jihozlar va keyingi ishlab chiqish bosqichini belgilash.')
  ];
  const note = t('Дата, оборудование и условия пробного занятия согласуются отдельно. Этот план не является записью на встречу или коммерческим предложением по цене.', 'Sana, jihozlar va sinov mashg‘uloti shartlari alohida kelishiladi. Bu reja uchrashuvga yozilish yoki narx taklifi emas.');
  return { caseId, language, title, summary: language === 'uz' ? item.uzSummary : item.summary, steps, actions, note,
    text: [t('План пробного занятия / Учебный VR-комплекс', 'Sinov mashg‘uloti rejasi / O‘quv VR-kompleksi'), title, '', ...steps.map((step, index) => `${index+1}. ${step}`), '', t('Что отрабатываем', 'Nimani mashq qilamiz'), ...actions.map((action, index) => `${index+1}. ${action.title}\n${action.description}`), '', note].join('\n') };
}
function renderPilotPicker(caseId, language) {
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const selected = scenarioLibrary.find(item => item.id === caseId);
  const scenes = proposalContent(language).scenes;
  return `<div class="pilot-selector"><div class="pilot-selector-label"><strong>${t('Сценарий пробного занятия', 'Sinov mashg‘uloti ssenariysi')}</strong><small id="pilot-picker-hint">${t('Все 20 ситуаций / 4 среды', 'Barcha 20 vaziyat / 4 muhit')}</small></div><details class="pilot-picker" id="pilot-picker"><summary id="pilot-picker-toggle" aria-describedby="pilot-picker-hint"><span>${escape(language === 'uz' ? selected.uzTitle : selected.title)}</span></summary><div class="pilot-groups" id="pilot-choice-list">${Object.entries(scenes).map(([id, scene]) => `<div class="pilot-group" data-pilot-group="${id}" role="group" aria-labelledby="pilot-group-${id}"><strong id="pilot-group-${id}">${escape(scene.title)}</strong><div class="pilot-options">${scenarioLibrary.filter(item => item.sceneId === id).map(item => `<button type="button" data-pilot-case="${item.id}" aria-pressed="${item.id === caseId}">${escape(language === 'uz' ? item.uzTitle : item.title)}</button>`).join('')}</div></div>`).join('')}</div></details></div>`;
}
export function renderPilotPlan(caseId, language) {
  const plan = pilotPlan(caseId, language), t = (ru, uz) => language === 'uz' ? uz : ru;
  return `${renderPilotPicker(caseId, language)}<div id="pilot-selected-plan" role="group" aria-labelledby="pilot-selected-title"><div class="pilot-summary"><img src="${SCENARIO_FRAMES[caseId][0].src}" width="1774" height="887" alt=""><div><p class="eyebrow">${t('ОДНА ГРУППА / ОДНА СИТУАЦИЯ', 'BITTA GURUH / BITTA VAZIYAT')}</p><h3 id="pilot-selected-title">${escape(plan.title)}</h3><p>${escape(plan.summary)}</p></div></div><ol class="pilot-plan">${plan.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol><details class="pilot-actions"><summary>${t('Что отрабатываем: 5 действий', 'Nimani mashq qilamiz: 5 amal')}</summary><ol>${plan.actions.map(action => `<li><strong>${escape(action.title)}</strong><p>${escape(action.description)}</p></li>`).join('')}</ol></details><div class="pilot-download"><button class="btn btn--primary" type="button" id="download-pilot">${t('Скачать план занятия', 'Mashg‘ulot rejasini yuklash')}</button><small id="pilot-download-status" role="status">${t('План можно обсудить с командой. Дата еще не назначена.', 'Rejani jamoa bilan muhokama qilish mumkin. Sana hali belgilanmagan.')}</small></div></div>`;
}
