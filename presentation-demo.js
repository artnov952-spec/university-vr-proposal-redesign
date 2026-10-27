import { escapeHtml as escape, icon } from './proposal-template.js?v=sales20261027-r7local';
import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';
import { PANORAMA_MEDIA } from './panorama/media.js?v=sales20261027-r7local';
import { renderScenarioVisual, scenarioVisualState } from './scenario-visuals.js?v=sales20261027-r7local';

const SCENES = ['courtyard', 'entrance', 'traffic', 'market'];
const REGISTRIES = ['groups', 'scenarios', 'attempts'];
const STAGE_SCREENS = ['catalog', 'prepare', 'practice', 'journal', 'observe', 'score', 'review', 'exchange'];
const COMPONENT_SCREENS = { teacher: 'prepare', platform: 'registry', vr: 'practice', display: 'observe', exchange: 'exchange' };

// A disposable illustration, deliberately separate from the saved workspace.
export function createPresentationDemo() {
  return { scenario: 'courtyard', caseId:'courtyard-01', checks: [true, true, true], points: [0,1,3,4], paused: false, phase:'ended', seconds:150,
    log:[{kind:'start',seconds:0},...[0,1,3,4].map((index,i)=>({kind:'point',index,seconds:(i+1)*30})),{kind:'end',seconds:150}], criteria: [true, true, true], note: '', confirmed: false,
    reviewError: false, exchange: 'draft', packageData:null, revision:0, includeResult: true, masked: true, registry: 'attempts' };
}

export function reducePresentationDemo(state, action) {
  const toggle = (key, index) => ({ ...state, [key]: state[key].map((value, i) => i === index ? !value : value) });
  const invalidate = patch => ({...state,...patch,revision:state.revision+1,confirmed:false,exchange:'draft',packageData:null,reviewError:false});
  const reset = item => ({...createPresentationDemo(),scenario:item.sceneId,caseId:item.id,checks:[false,false,false],points:[],phase:'ready',seconds:0,log:[]});
  const log = (kind, extra={}) => [...state.log,{kind,seconds:state.seconds,...extra}];
  switch (action.type) {
    case 'scenario': return SCENES.includes(action.value) && state.scenario!==action.value ? reset(scenarioLibrary.find(item=>item.sceneId===action.value)) : state;
    case 'case': {
      const item=scenarioLibrary.find(item=>item.id===action.value);
      return item && item.id!==state.caseId ? reset(item) : state;
    }
    case 'check': return Number.isInteger(action.index) && action.index >= 0 && action.index < 3 ? toggle('checks', action.index) : state;
    case 'start': return state.checks.every(Boolean) && state.phase!=='running' ? invalidate({points:[],paused:false,phase:'running',seconds:0,log:[{kind:'start',seconds:0}],note:''}) : state;
    case 'point': return state.phase==='running' && !state.paused && Number.isInteger(action.index) && action.index >= 0 && action.index < 5 && !state.points.includes(action.index) ? invalidate({ points: [...state.points, action.index],seconds:state.seconds+30,log:[...state.log,{kind:'point',index:action.index,seconds:state.seconds+30}] }) : state;
    case 'pause': return state.phase==='running' ? invalidate({ paused: !state.paused,log:log(state.paused?'resume':'pause') }) : state;
    case 'end': return state.phase==='running' ? invalidate({phase:'ended',paused:false,log:log('end')}) : state;
    case 'criterion': return Number.isInteger(action.index) && action.index >= 0 && action.index < 3 ? invalidate({criteria:toggle('criteria',action.index).criteria}) : state;
    case 'note': return invalidate({note:String(action.value).slice(0,400)});
    case 'confirm': return state.phase==='ended' && state.criteria.some(Boolean) && state.note.trim() ? { ...state, confirmed: true, reviewError: false, exchange: 'draft',packageData:null } : { ...state, reviewError: true };
    case 'include': return { ...state, includeResult: !state.includeResult, exchange: 'draft',packageData:null };
    case 'validate': return { ...state, exchange: state.includeResult && state.confirmed && state.phase==='ended' && state.criteria.some(Boolean) ? 'checked' : 'blocked' };
    case 'package': return state.exchange === 'checked' ? { ...state, exchange: 'prepared',packageData:presentationPayload(state) } : state;
    case 'mask': return { ...state, masked: !state.masked };
    case 'registry': return REGISTRIES.includes(action.value) ? { ...state, registry: action.value } : state;
    default: return state;
  }
}

export function presentationFractions(state) {
  let previous=-1,ordered=0;
  for(const index of state.points){if(index>previous)ordered++;previous=Math.max(previous,index);}
  return [state.points.length/5,ordered/5,state.points.length?Math.min(1,225/Math.max(1,state.seconds)):0];
}
export function presentationScore(state) {
  const values=presentationFractions(state),weights=[50,30,20],total=weights.reduce((sum,weight,index)=>sum+(state.criteria[index]?weight:0),0);
  return total?Math.round(values.reduce((sum,value,index)=>sum+(state.criteria[index]?value*weights[index]:0),0)/total*100):0;
}
export function presentationPayload(state) {
  const scenario=scenarioLibrary.find(item=>item.id===state.caseId);
  return {mode:'LOCAL EXAMPLE',id:'DEMO-024-r'+state.revision,studentId:'DEMO-01',groupId:'101',courseId:'DEMO-COURSE-1',disciplineId:'DEMO-01',scenarioVersion:scenario.id+'-v1',score:presentationScore(state),durationSeconds:state.seconds,evidenceRevision:state.revision,actions:state.points.map(index=>scenario.points[index].id),comment:state.note,confirmed:state.confirmed};
}

export function renderPresentationDemo({ stage, component, state, language = 'ru', scope = 'process' }) {
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const screen = component ? COMPONENT_SCREENS[component] : STAGE_SCREENS[stage];
  if (!screen) throw new RangeError('Unknown presentation screen');
  const sceneNames = [t('Обход махалли', 'Mahallani kuzatish'), t('Осмотр подъезда', 'Kirish yo‘lagini ko‘zdan kechirish'), t('Дорожная обстановка', 'Yo‘l harakati'), t('Наблюдение на базаре', 'Bozorni kuzatish')];
  const sceneIndex = SCENES.indexOf(state.scenario);
  const selectedCase=scenarioLibrary.find(item=>item.id===state.caseId) || scenarioLibrary.find(item=>item.sceneId===state.scenario);
  const local=(item,key='title')=>escape(language==='uz'?item['uz'+key[0].toUpperCase()+key.slice(1)]:item[key]);
  const sceneName = local(selectedCase);
  const image = scenarioVisualState({caseId:selectedCase.id,points:[]}).frame;
  const title = {
    catalog: t('Каталог учебных ситуаций', 'O‘quv vaziyatlari katalogi'),
    prepare: component ? t('Пульт преподавателя', 'O‘qituvchi boshqaruv paneli') : t('Подготовка к занятию', 'Mashg‘ulotga tayyorgarlik'),
    practice: t('Задание курсанта', 'Kursant topshirig‘i'),
    journal: t('Журнал попытки № 024', '024-sonli urinish jurnali'),
    observe: t('Экран наблюдения', 'Kuzatish ekrani'), score: t('Расчет по критериям', 'Mezonlar bo‘yicha hisob'),
    review: t('Карточка разбора', 'Tahlil kartasi'), exchange: t('Подготовка обмена', 'Almashuvni tayyorlash'),
    registry: t('Связанные учебные данные', 'Bog‘langan o‘quv ma’lumotlari')
  }[screen];
  const action = (name, label, ico, extra = '') => `<button type="button" class="btn btn--soft" data-demo-action="${name}" data-demo-scope="${scope}" ${extra}>${ico ? icon(ico) : ''}${label}</button>`;
  const status = (label, ok = false) => `<span class="demo-status${ok ? ' is-ok' : ''}">${ok ? icon('circle-check') : icon('clock')}${label}</span>`;
  const line = (a, b) => `<div><dt>${a}</dt><dd>${b}</dd></div>`;
  const points = selectedCase.points.map(point=>local(point));
  const criteria = [t('Полнота действий', 'Harakatlar to‘liqligi'), t('Последовательность', 'Ketma-ketlik'), t('Время выполнения', 'Bajarish vaqti')];
  const score = presentationScore(state);
  const fractions=presentationFractions(state);
  const stamp=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  const scene = (observe = false) => `<div class="demo-scene">${renderScenarioVisual({caseId:selectedCase.id,points:state.points},language)}${observe ? `<div class="demo-observer">${status(state.paused ? t('Пауза', 'Tanaffus') : t('Пример наблюдения', 'Kuzatish namunasi'), !state.paused)}<strong>${state.masked ? t('Участник 01', 'Ishtirokchi 01') : t('Учебный курсант А.', 'O‘quv kursanti A.')}</strong><span>${t('Контрольные точки', 'Nazorat nuqtalari')}: ${state.points.length} / ${points.length}</span></div>` : ''}</div>`;
  let body = '';
  if (screen === 'catalog') {
    body = `<div class="demo-catalog">${SCENES.map((id, i) => `<button type="button" class="demo-scenario${state.scenario === id ? ' is-selected' : ''}" data-demo-action="scenario" data-demo-value="${id}" data-demo-scope="${scope}" aria-pressed="${state.scenario === id}"><img src="${PANORAMA_MEDIA[id].src}" width="1774" height="887" alt="" loading="lazy"><span><strong>${sceneNames[i]}</strong><small>${t('5 учебных сценариев', '5 o‘quv ssenariysi')}</small></span>${state.scenario === id ? icon('circle-check') : icon('chevron-right')}</button>`).join('')}</div><label class="demo-note-label" for="${scope}-case">${t('Сценарий в выбранной среде', 'Tanlangan muhitdagi ssenariy')}</label><select id="${scope}-case" class="demo-case-select" data-demo-case data-demo-action="case" data-demo-scope="${scope}">${scenarioLibrary.filter(item=>item.sceneId===state.scenario).map(item=>`<option value="${item.id}" ${item.id===selectedCase.id?'selected':''}>${local(item)}</option>`).join('')}</select><p class="demo-case-summary">${local(selectedCase,'summary')}</p><div class="demo-bottom-line"><span>${t('5 оцениваемых действий', '5 baholanadigan harakat')}</span>${action('goto-prepare', t('Назначить группе', 'Guruhga tayinlash'), 'arrow-right')}</div>`;
  } else if (screen === 'prepare') {
    const ready = state.checks.every(Boolean);
    body = `<div class="demo-two-col"><div><p class="demo-section-label">${t('Назначенное занятие', 'Tayinlangan mashg‘ulot')}</p><dl class="demo-description">${line(t('Группа', 'Guruh'), t('Учебная группа 101', 'O‘quv guruhi 101'))}${line(t('Участник', 'Ishtirokchi'), t('Курсант 01', 'Kursant 01'))}${line(t('Сценарий', 'Ssenariy'), sceneName)}${line(t('Версия', 'Versiya'), 'v1')}</dl><button type="button" class="demo-thumb" data-open-scene="${state.scenario}"><img src="${image.src}" alt="${escape(sceneName)}" width="1774" height="887" loading="lazy"><span>${icon('eye')}${t('Осмотреть среду', 'Muhitni ko‘rish')}</span></button></div><div><p class="demo-section-label">${t('Перед запуском', 'Boshlashdan oldin')}</p><div class="demo-checklist">${[t('Инструктаж проведен', 'Yo‘riqnoma o‘tkazilgan'), t('Комплект проверен', 'Jihozlar tekshirilgan'), t('Рабочее место готово', 'Ish joyi tayyor')].map((text, i) => `<button type="button" data-demo-action="check" data-demo-index="${i}" data-demo-scope="${scope}" aria-pressed="${state.checks[i]}" class="demo-check${state.checks[i] ? ' is-done' : ''}"><span>${icon(state.checks[i] ? 'check' : 'minus')}</span>${text}</button>`).join('')}</div><div class="demo-readiness"><b>${state.checks.filter(Boolean).length} / 3</b><span>${ready ? t('Можно перейти к практике', 'Amaliyotga o‘tish mumkin') : t('Отметьте выполненные проверки', 'Bajarilgan tekshiruvlarni belgilang')}</span></div>${action('goto-practice', t('Начать учебный пример', 'O‘quv namunasini boshlash'), 'arrow-right', ready ? '' : 'disabled')}</div></div>`;
  } else if (screen === 'practice') {
    const controls = state.phase==='running' ? action('pause',state.paused?t('Продолжить','Davom etish'):t('Пауза','Tanaffus'),'clock')+action('end',t('Завершить пример','Namunani yakunlash'),'check') : action('goto-practice',t('Начать новую попытку','Yangi urinishni boshlash'),'arrow-right',state.checks.every(Boolean)?'':'disabled')+action('goto-prepare',t('Проверить готовность','Tayyorlikni tekshirish'),'sliders-horizontal');
    body = `<div class="demo-practice-controls">${controls}</div><div class="demo-practice-layout">${scene()}<div class="demo-point-list">${points.map((text, i) => `<button type="button" data-demo-action="point" data-demo-index="${i}" data-demo-scope="${scope}" aria-pressed="${state.points.includes(i)}" ${state.phase!=='running'||state.paused||state.points.includes(i) ? 'disabled' : ''}>${icon(state.points.includes(i) ? 'circle-check' : 'circle-alert')}<span>${text}</span></button>`).join('')}</div></div><div class="demo-progress"><span style="width:${state.points.length / points.length * 100}%"></span></div><p class="demo-case-summary">${local(selectedCase,'brief')}</p><div class="demo-bottom-line"><span>${state.points.length}/${points.length} · ${stamp(state.seconds)} ${t('по учебной шкале', 'o‘quv shkalasi bo‘yicha')}</span></div><p class="demo-caption">${t('Действия меняют CG-сцену и журнал примера. Это ручная учебная модель, не телеметрия шлема. Новая попытка очищает только этот пример.','Harakatlar CG-sahna va namuna jurnalini o‘zgartiradi. Bu qo‘lda boshqariladigan o‘quv modeli, shlem telemetriyasi emas. Yangi urinish faqat shu namunani tozalaydi.')}</p>`;
  } else if (screen === 'journal') {
    const names={start:t('Начало попытки','Urinish boshlandi'),pause:t('Пауза','Tanaffus'),resume:t('Продолжение','Davom etish'),end:t('Попытка завершена','Urinish yakunlandi')};
    body = `<div class="demo-log">${state.log.length?state.log.map((event,i)=>`<div class="demo-log-row">${icon(event.kind==='point'?'circle-check':'clock')}<span><strong>${event.kind==='point'?points[event.index]:names[event.kind]}</strong><small>${sceneName} / v1</small></span><time>${stamp(event.seconds)}</time><span class="demo-log-index">${String(i+1).padStart(2,'0')}</span></div>`).join(''):`<p>${t('Сначала начните попытку и отметьте действия.','Avval urinishni boshlang va harakatlarni belgilang.')}</p>`}</div><div class="demo-bottom-line">${status(t('Событий','Hodisalar')+': '+state.log.length,true)}${action('goto-prepare',t('К подготовке','Tayyorgarlikka'),'arrow-right')}</div>`;
  } else if (screen === 'observe') {
    body = `${scene(true)}<div class="demo-observation-actions">${action('pause', state.paused ? t('Продолжить занятие', 'Mashg‘ulotni davom ettirish') : t('Поставить на паузу', 'Tanaffus qilish'), 'clock', `aria-pressed="${state.paused}"`)}${action('mask', state.masked ? t('Показать учебное имя', 'O‘quv ismini ko‘rsatish') : t('Скрыть имя', 'Ismni yashirish'), state.masked ? 'eye' : 'eye-off', `aria-pressed="${!state.masked}"`)}<button type="button" class="btn btn--soft" data-open-scene="${state.scenario}">${icon('eye')}${t('Открыть панораму', 'Panoramani ochish')}</button></div><p class="demo-caption">${t('Кадр CG-среды и локальное управление примером, не видеопоток со шлема.', 'CG-muhit kadri va namunani mahalliy boshqarish, shlemdan video oqim emas.')}</p>`;
  } else if (screen === 'score') {
    body = `<div class="demo-two-col"><div class="demo-score"><span>${t('Иллюстративный балл','Namunaviy ball')}</span><strong>${score}<small>/100</small></strong><p>${t('Балл рассчитан по действиям и их порядку. Справа можно включить или исключить критерий, а не отметить его выполнение.','Ball harakatlar va ularning tartibi asosida hisoblangan. O‘ngda mezonni yoqish yoki o‘chirish mumkin, bajarilishini belgilash emas.')}</p></div><div class="demo-criteria">${criteria.map((text,i)=>`<button type="button" data-demo-action="criterion" data-demo-index="${i}" data-demo-scope="${scope}" aria-pressed="${state.criteria[i]}"><span>${icon(state.criteria[i]?'circle-check':'minus')}<strong>${text}</strong><b>${Math.round(fractions[i]*100)}%</b></span><small>${state.criteria[i]?t('Включен','Yoqilgan'):t('Исключен','O‘chirilgan')} · ${t('вес','vazn')} ${[50,30,20][i]}</small><span class="demo-meter"><i style="width:${fractions[i]*100}%"></i></span></button>`).join('')}</div></div><p class="demo-caption">${t('Шкала времени условная. Методика и веса демонстрационные, не академическая оценка.','Vaqt shkalasi shartli. Metodika va vaznlar namunaviy, akademik baho emas.')}</p>`;
  } else if (screen === 'review') {
    body = `<div class="demo-review-head"><div><small>${sceneName} / v1</small><strong>${t('Курсант 01 · Группа 101','Kursant 01 · Guruh 101')}</strong></div><b>${score}<small>/100</small></b></div><div class="demo-review-evidence">${criteria.map((text,i)=>`<div>${icon(fractions[i]===1?'circle-check':'circle-alert')}<span>${text}</span><small>${Math.round(fractions[i]*100)}% · ${state.criteria[i]?t('В расчете','Hisobda'):t('Вне расчета','Hisobga kirmaydi')}</small></div>`).join('')}</div><p class="demo-case-summary">${t('Зафиксировано действий','Qayd etilgan harakatlar')}: ${state.points.length}/5. ${local(selectedCase,'debrief')}</p><label class="demo-note-label" for="${scope}-review-note">${t('Комментарий преподавателя','O‘qituvchi izohi')}</label><textarea id="${scope}-review-note" data-demo-note data-demo-scope="${scope}" maxlength="400" rows="2" placeholder="${t('Добавьте обратную связь к учебному примеру','O‘quv namunasiga izoh qo‘shing')}">${escape(state.note)}</textarea>${state.phase!=='ended'?`<p class="demo-error">${t('Сначала завершите начатую попытку на этапе 03.','Avval boshlangan urinishni 03-bosqichda yakunlang.')}</p>`:state.reviewError?`<p class="demo-error" role="alert">${t('Перед подтверждением добавьте комментарий.','Tasdiqlashdan oldin izoh qo‘shing.')}</p>`:''}<div class="demo-bottom-line">${status(state.confirmed?t('Пример подтвержден','Namuna tasdiqlangan'):t('Ожидает проверки','Tekshiruv kutilmoqda'),state.confirmed)}${action('confirm',state.confirmed?t('Подтверждено','Tasdiqlangan'):t('Подтвердить пример','Namunani tasdiqlash'),'check-check',state.confirmed||state.phase!=='ended'?'disabled':'')}</div>`;
  } else if (screen === 'exchange') {
    const phase = ['draft', 'blocked', 'checked', 'prepared'].indexOf(state.exchange);
    body = `<div class="demo-exchange-route">${[t('Карточка', 'Karta'), t('Проверка', 'Tekshirish'), t('Пакет', 'Paket')].map((text, i) => `<div class="${(i === 0 || (i === 1 && phase >= 2) || (i === 2 && phase === 3)) ? 'is-complete' : ''}">${icon(i === 0 ? 'file-text' : i === 1 ? 'shield-check' : 'database')}<strong>${text}</strong></div>`).join('')}</div><button type="button" class="demo-exchange-record" data-demo-action="include" data-demo-scope="${scope}" aria-pressed="${state.includeResult}">${icon(state.includeResult ? 'circle-check' : 'minus')}<span><strong>${t('Курсант 01 / Дисциплина DEMO-01', 'Kursant 01 / DEMO-01 fani')}</strong><small>${sceneName} / v1 · ${score}/100</small></span>${status(state.confirmed ? t('Подтверждено', 'Tasdiqlangan') : t('Нужен разбор', 'Tahlil kerak'), state.confirmed)}</button><div class="demo-package-status" role="status">${state.exchange === 'prepared' ? `${icon('circle-check')}<div><strong>${t('Пакет DEMO-024 подготовлен', 'DEMO-024 paketi tayyorlandi')}</strong><p>${t('1 учебная запись. Ничего не отправлено.', '1 o‘quv yozuvi. Hech narsa yuborilmagan.')}</p></div>` : state.exchange === 'blocked' ? `${icon('triangle-alert')}<div><strong>${t('Проверка не пройдена', 'Tekshiruvdan o‘tmadi')}</strong><p>${!state.includeResult ? t('Выберите учебную запись.', 'O‘quv yozuvini tanlang.') : t('Сначала подтвердите пример на этапе 07.', 'Avval 07-bosqichda namunani tasdiqlang.')}</p></div>` : `${icon('shield-check')}<div><strong>${state.exchange === 'checked' ? t('Состав проверен', 'Tarkib tekshirildi') : t('Проверьте состав перед подготовкой', 'Tayyorlashdan oldin tarkibni tekshiring')}</strong><p>${t('Код курсанта, дисциплина, сценарий, балл и подтверждение.', 'Kursant kodi, fan, ssenariy, ball va tasdiq.')}</p></div>`}</div><div class="demo-observation-actions">${action('validate', t('Проверить запись', 'Yozuvni tekshirish'), 'shield-check')}${action('package', t('Подготовить пакет', 'Paket tayyorlash'), 'database', state.exchange === 'checked' ? '' : 'disabled')}${!state.confirmed ? action('goto-review', t('К разбору', 'Tahlilga'), 'arrow-right') : ''}</div><p class="demo-caption">${t('Локальный пример. Реальный API E-reyting не подключен.', 'Mahalliy namuna. Haqiqiy E-reyting API ulanmagan.')}</p>`;
  } else if (screen === 'registry') {
    const rows = {
      groups: [[t('Группа 101', 'Guruh 101'), t('2 учебных участника', '2 o‘quv ishtirokchisi'), t('Назначено занятие', 'Mashg‘ulot tayinlangan')], [t('Группа 202', 'Guruh 202'), t('1 учебный участник', '1 o‘quv ishtirokchisi'), t('Подготовка', 'Tayyorgarlik')]],
      scenarios: sceneNames.map((text, i) => [text, t('5 сценариев / 25 действий', '5 ssenariy / 25 harakat'), i === sceneIndex ? t('Выбрана среда', 'Muhit tanlangan') : t('В каталоге', 'Katalogda')]),
      attempts: [['DEMO-024', sceneName, state.confirmed ? t('Подтверждено', 'Tasdiqlangan') : state.phase==='ended'?t('Ожидает разбора', 'Tahlil kutilmoqda'):state.phase==='running'?t('Идет практика','Amaliyot davom etmoqda'):t('Подготовка','Tayyorgarlik')]]
    };
    body = `<div class="demo-registry-tabs">${REGISTRIES.map((id, i) => action('registry', [t('Группы', 'Guruhlar'), t('Сценарии', 'Ssenariylar'), t('Попытки', 'Urinishlar')][i], ['users', 'book-open', 'history'][i], `data-demo-value="${id}" aria-pressed="${state.registry === id}"`)).join('')}</div><div class="demo-registry">${rows[state.registry].map(([a, b, c]) => `<div>${icon(state.registry === 'groups' ? 'users' : state.registry === 'scenarios' ? 'book-open' : 'file-text')}<span><strong>${a}</strong><small>${b}</small></span><span class="demo-status">${c}</span></div>`).join('')}</div><div class="demo-relation">${icon('link')}<p>${t('Одна попытка хранит связь: курсант → группа → версия сценария → события → результат.', 'Bitta urinish bog‘lanishni saqlaydi: kursant → guruh → ssenariy versiyasi → hodisalar → natija.')}</p></div>`;
  }
  if(screen==='exchange'&&state.exchange==='prepared')body+=`<details class="demo-payload"><summary>${t('Состав подготовленного пакета','Tayyorlangan paket tarkibi')}</summary><pre>${escape(JSON.stringify(state.packageData,null,2))}</pre></details>`;
  if(screen==='observe'&&state.phase!=='running')body=body.replace('data-demo-action="pause"','disabled data-demo-action="pause"');
  return `<section class="demo-screen" data-demo-screen="${screen}" data-demo-scope="${scope}" aria-label="${title}"><header class="demo-screen-bar"><span>${icon(component ? 'columns-3' : 'monitor')}<b>${title}</b></span><small>${t('Интерактивный пример', 'Interaktiv namuna')}</small></header><div class="demo-screen-body">${body}</div><footer class="demo-screen-footer"><span>${t('Вымышленные учебные данные', 'Xayoliy o‘quv ma’lumotlari')}</span><span>${t('Изменения только в этом примере', 'O‘zgarishlar faqat shu namunada')}</span></footer></section>`;
}
