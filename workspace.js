import { scenarios as sourceScenarios, modules as sourceModules } from './content.js?v=sales20261027-r7local';
import { getLanguage, setLanguage, subscribeLanguage } from './locale.js?v=sales20261027-r7local';
import { translate, localizedField, seedTranslations } from './workspace-i18n.js?v=sales20261027-r7local';
import { createExchange, exchangeRows, validateExchange, exchangeCSV, EXCHANGE_FIELDS, EXCHANGE_TABS } from './workspace-exchange.js?v=sales20261027-r7local';
import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';
import { renderScenarioVisual, visualForAttempt, prefetchScenarioFrame } from './scenario-visuals.js?v=sales20261027-r7local';
export { translate, localizedField } from './workspace-i18n.js?v=sales20261027-r7local';
export { exchangeRows, validateExchange, exchangeCSV } from './workspace-exchange.js?v=sales20261027-r7local';

// Local demo only. PDF pages 7-23 define the scope, not an approved scoring method.
// Integration: mountWorkspace(root, { onOpenScene, onStateChange }); no parent changes.
export const STORAGE_KEY = 'university-vr-proposal-redesign.workspace.v1';
export const SCHEMA_VERSION = 1;
export const WORKSPACE_GROUPS = [
  { title: 'Обзор', ids: [1] },
  { title: 'Подготовка занятия', ids: [2, 3, 5, 6, 13] },
  { title: 'Проведение', ids: [8, 7, 9] },
  { title: 'Результаты', ids: [10, 11, 12] },
  { title: 'Настройки', ids: [14, 15] }
];
// Symbol names verified against the supplied erp-kit-clean/icons/sprite.svg.
export const WORKSPACE_ICONS = Object.freeze({
  1: 'layout-grid', 2: 'users', 3: 'book-open', 5: 'scale',
  6: 'calendar-days', 7: 'eye', 8: 'sliders-horizontal', 9: 'monitor',
  10: 'history', 11: 'chart-column', 12: 'download', 13: 'book-open',
  14: 'sliders-horizontal', 15: 'shield-check'
});
const ROLES = { teacher: 'Преподаватель', cadet: 'Курсант', admin: 'Администратор' };
const SCENES = { courtyard: 'Махалля', entrance: 'Подъезд', traffic: 'Дорожная обстановка', market: 'Рынок' };
const CAPABILITIES = { groups: 'Изменять группы', edit: 'Методика и материалы', conduct: 'Управлять занятием', practice: 'Проходить упражнение', review: 'Подтверждать результат', manage: 'Настраивать доступ' };
const CRITERIA = { coverage: 'Полнота действий', order: 'Порядок действий', time: 'Время прохождения' };
const OBSERVATIONS = { critical: 'Критическая ошибка', violation: 'Дополнительное нарушение', hint: 'Помощь преподавателя' };
const STATUSES = { running: 'Идет практика', paused: 'Пауза', ended: 'Ожидает разбора', confirmed: 'Подтвержден локально' };
const isLegacyOverview = item => !item.conceptId && sourceScenarios.some(source=>item.id===`${source.id}-v1` && item.title===source.title && item.points.length===source.points.length && item.points.every((point,index)=>point.title===source.points[index].title && point.description===source.points[index].description));
const copy = value => JSON.parse(JSON.stringify(value));
const text = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const getAttempt = (state, id = state.activeAttemptId) => state.attempts.find(item => item.id === id);
const getScenario = (state, id = state.assignment.scenarioId) => state.scenarios.find(item => item.id === id);
const checksEmpty = () => ({ briefing: false, connection: false, space: false });
export const can = (state, capability) => Object.hasOwn(CAPABILITIES, capability) && Boolean(state.grants[state.profile.role]?.[capability]);
const clientModules = () => sourceModules.filter(item => item.id !== 4);

export function moveCheckpoint(points, index, direction) {
  const result = copy(points);
  const target = index + direction;
  if (Number.isInteger(index) && target >= 0 && target < result.length && result[index]) {
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function elapsedSeconds(attempt, now) {
  if (!attempt) return 0;
  const end = attempt.endedAt ?? attempt.pausedAt ?? now;
  return Math.max(0, Math.floor((end - attempt.startedAt - attempt.pausedMs) / 1000));
}

export function calculateResult(attempt, criteria) {
  const points = attempt.scenario.points;
  const records = attempt.events.filter(event => event.kind === 'record');
  const recorded = new Set(records.map(event => event.pointId));
  const completed = points.filter(point => recorded.has(point.id)).length;
  let previous = -1;
  let ordered = 0;
  for (const record of records) {
    const index = points.findIndex(point => point.id === record.pointId);
    if (index > previous) ordered += 1;
    previous = Math.max(previous, index);
  }
  const duration = elapsedSeconds(attempt, attempt.endedAt ?? attempt.pausedAt ?? attempt.startedAt);
  const fractions = {
    coverage: completed / points.length,
    order: ordered / points.length,
    time: completed ? Math.min(1, (points.length * 45) / Math.max(1, duration)) : 0
  };
  const enabled = criteria.filter(item => item.enabled && item.weight > 0);
  const totalWeight = enabled.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight ? Math.round(enabled.reduce((sum, item) => sum + fractions[item.id] * item.weight, 0) / totalWeight * 100) : null;
  const observations = Object.fromEntries(Object.keys(OBSERVATIONS).map(kind => [kind, attempt.events.filter(event => event.kind === kind).length]));
  return { score, completed, missing: points.filter(point => !recorded.has(point.id)), duration, fractions, totalWeight, observations };
}

export function visibleAttempts(state) {
  return state.attempts.filter(attempt => state.profile.role !== 'cadet' || attempt.cadetId === state.profile.cadetId);
}

export function analytics(state, groupId = '', scenarioId = '', options = {}) {
  const days = Number(options.period) || 0;
  const from = days > 0 ? (options.now ?? state.updatedAt) - days * 86400000 : -Infinity;
  const attempts = visibleAttempts(state).filter(item => item.endedAt !== null && item.endedAt >= from && (!groupId || item.groupId === groupId) && (!scenarioId || item.scenario.familyId === scenarioId) && (!options.cadetId || item.cadetId === options.cadetId) && (!options.confirmed || item.status === 'confirmed')).sort((a,b)=>a.endedAt-b.endedAt);
  const results = attempts.map(item => calculateResult(item, state.criteria));
  const scored = results.filter(item => item.score !== null);
  const missing = new Map();
  results.forEach(result => result.missing.forEach(point => missing.set(point.title, (missing.get(point.title) || 0) + 1)));
  const chains = new Map();
  attempts.forEach((attempt,index) => {
    const key = attempt.cadetId + '/' + attempt.scenario.familyId;
    if (!chains.has(key)) chains.set(key, []);
    chains.get(key).push({attempt,result:results[index]});
  });
  const repeats = [...chains.values()].filter(rows=>rows.length>1);
  return {
    attempts: attempts.length,
    confirmed: attempts.filter(item => item.status === 'confirmed').length,
    average: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : null,
    duration: results.length ? Math.round(results.reduce((sum, item) => sum + item.duration, 0) / results.length) : null,
    participants: new Set(attempts.map(item=>item.cadetId)).size,
    repeated: repeats.reduce((sum,rows)=>sum+rows.length-1,0),
    seeded: attempts.filter(item=>item.seeded).length,
    observations: Object.fromEntries(Object.keys(OBSERVATIONS).map(kind=>[kind,results.reduce((sum,row)=>sum+row.observations[kind],0)])),
    progress: repeats.map(rows=>({cadetId:rows[0].attempt.cadetId,scenario:rows[0].attempt.scenario,first:rows[0].result.score,last:rows.at(-1).result.score,attemptId:rows.at(-1).attempt.id,count:rows.length})),
    missing: [...missing].sort((a, b) => b[1] - a[1]),
    rows: attempts.map((attempt, index) => ({ attempt, result: results[index] }))
  };
}

export function readinessIssues(state) {
  const issues = [];
  const assignment = state.assignment;
  if (!state.groups.some(item => item.id === assignment.groupId)) issues.push('Выберите группу.');
  if (!state.cadets.some(item => item.id === assignment.cadetId && item.groupId === assignment.groupId)) issues.push('Выберите участника выбранной группы.');
  const scenario = getScenario(state);
  if (!scenario || !scenario.points.length) issues.push('Выберите сохраненную версию сценария.');
  else if(!scenario.published) issues.push('Выберите опубликованную версию сценария.');
  if (!state.criteria.some(item => item.enabled && item.weight > 0)) issues.push('Включите критерий с положительным весом.');
  if (!assignment.checks.briefing) issues.push('Подтвердите учебный инструктаж.');
  if (!assignment.checks.connection) issues.push('Подтвердите готовность браузерного клиента.');
  if (!assignment.checks.space) issues.push('Подтвердите безопасное учебное место.');
  if (state.activeAttemptId) issues.push('Сначала завершите активную сессию.');
  return issues;
}

export function createDemoState(now = Date.now()) {
  const scenarios = sourceScenarios.map(item => ({
    id: `${item.id}-v1`, familyId: item.id, sceneId: item.id, title: item.title, summary: item.summary || 'Наблюдение, фиксация действий и совместный разбор.', published: true,
    environment: SCENES[item.id], difficulty: item.id === 'traffic' ? 'advanced' : 'basic', version: 1,
    ...seedTranslations({ ...item, summary: item.summary || 'Наблюдение, фиксация действий и совместный разбор.', uzSummary: item.uzSummary }, ['title', 'summary']),
    points: item.points.map((point, index) => ({ id: `${item.id}-p${index + 1}`, title: point.title, description: point.description, ...seedTranslations(point, ['title', 'description']) }))
  }));
  scenarios.push(...scenarioLibrary.map(item=>({
    id:`${item.id}-v1`,familyId:item.id,conceptId:item.id,sceneId:item.sceneId,
    title:item.title,summary:item.summary,brief:item.brief,role:item.role,debrief:item.debrief,
    durationSeconds:item.durationSeconds,environment:SCENES[item.sceneId],difficulty:'basic',version:1,published:true,
    ...seedTranslations(item,['title','summary','brief','role','debrief']),
    points:item.points.map(point=>({id:point.id,title:point.title,description:point.description,...seedTranslations(point,['title','description'])}))
  })));
  const criteria = [{ id: 'coverage', enabled: true, weight: 60 }, { id: 'order', enabled: true, weight: 25 }, { id: 'time', enabled: true, weight: 15 }];
  const seedAttempt = (id, scenario, cadetId, missed, offset) => ({
    id, scenario: copy(scenario), cadetId, groupId: 'g1', status: 'ended',
    startedAt: now - offset - 95000, endedAt: now - offset, pausedAt: null, pausedMs: 0,
    events: scenario.points.map((point, index) => ({ id: `${id}-e${index}`, kind: index === missed ? 'skip' : 'record', pointId: point.id, title: point.title, seconds: (index + 1) * 25 })).concat({ id: `${id}-end`, kind: 'end', title: 'Занятие завершено', seconds: 95 }),
    comments: [{ id: `${id}-comment`, text: 'Учебный пример. Обсудите последовательность наблюдений.', eventId: '', seconds: 95, seeded: true }], confirmation: null, seeded: true
  });
  const attempts = [seedAttempt('attempt-1', scenarios[0], 'c1', 1, 7200000), seedAttempt('attempt-2', scenarios[1], 'c2', -1, 3600000)];
  attempts[1].status = 'confirmed';
  attempts[1].confirmation = { at: now - 3500000, criteriaRevision: 1, score: calculateResult(attempts[1], criteria).score };
  return {
    version: SCHEMA_VERSION, libraryRevision:2, revision: 0, sequence: 10, updatedAt: now, language: 'ru',
    profile: { role: 'teacher', cadetId: 'c1' },
    grants: {
      teacher: { groups: true, edit: true, conduct: true, practice: true, review: true, manage: false },
      cadet: { groups: false, edit: false, conduct: false, practice: true, review: false, manage: false },
      admin: { groups: true, edit: false, conduct: false, practice: false, review: false, manage: true }
    },
    groups: [{ id: 'g1', name: 'Демо 101', course: '1', ...seedTranslations({ name: 'Демо 101', uzName: 'Demo 101' }, ['name']) }, { id: 'g2', name: 'Демо 202', course: '2', ...seedTranslations({ name: 'Демо 202', uzName: 'Demo 202' }, ['name']) }],
    cadets: [1, 2, 3].map(n => ({ id: `c${n}`, name: `Участник 0${n}`, code: `DEMO-0${n}`, groupId: n === 3 ? 'g2' : 'g1', ...seedTranslations({ name: `Участник 0${n}`, uzName: `Ishtirokchi 0${n}` }, ['name']) })),
    scenarios, criteria, criteriaRevision: 1,
    assignment: { groupId: 'g1', cadetId: 'c1', scenarioId: scenarios.find(item=>item.conceptId)?.id || scenarios[0].id, mode: 'browser', checks: checksEmpty() },
    activeAttemptId: null, selectedAttemptId: 'attempt-1', displayAttemptId: 'attempt-1', attempts,
    materials: [
      { id: 'm1', title: 'Памятка перед практикой', body: 'Это учебная браузерная модель, не служебная система.\n1. Выберите группу и версию сценария.\n2. Пройдите инструктаж и проверку готовности.\n3. Фиксируйте действия в журнале.\n4. Разберите пропуски с преподавателем.', uzTitle: 'Mashq oldidan eslatma', uzBody: "Bu o'quv brauzer modeli, xizmat tizimi emas.\n1. Guruh va ssenariy versiyasini tanlang.\n2. Tayyorlikni tasdiqlang.\n3. Harakatlarni qayd eting.\n4. Natijani o'qituvchi bilan muhokama qiling." },
      { id: 'm2', title: 'Как читать локальный результат', body: 'Демонстрационный балл показывает полноту, порядок и время. Веса задает преподаватель. Метод не утвержден и не является академической оценкой. Изменение сохраненных критериев отменяет локальные подтверждения старых результатов.', uzTitle: "Mahalliy natijani o'qish", uzBody: "Namoyish bali harakatlarning to'liqligi, tartibi va vaqtini ko'rsatadi. Bu tasdiqlangan akademik baho emas. Mezonlar o'zgarsa, avvalgi mahalliy tasdiqlar bekor qilinadi." }
    ].map(item => ({ ...item, ...seedTranslations(item, ['title', 'body']) })),
    drafts: { criteria: copy(criteria), group: { name: '', course: '1' }, cadet: { name: '', code: '', groupId: 'g1' }, material: { title: '', body: '' }, comment: { text: '', eventId: '' }, observation: { kind:'critical', text:'' },termination:{reason:''} },
    view: { moduleId: 1, groupFilter: '', cadetSearch: '', catalogSearch: '', sceneFilter: '', difficultyFilter:'', availabilityFilter:'', analyticsGroup: '', analyticsScenario: '', analyticsCadet:'', analyticsPeriod:'', analyticsStatus:'', materialSearch: '', auditSearch: '', auditRole: '' },
    preferences: { density: 'comfortable', displayNames: false },
    exchange: createExchange(attempts),
    audit: [{ id: 'audit-seed', at: now, role: 'teacher', action: 'Созданы две вымышленные учебные попытки' }]
  };
}

const ACTION_CAP = { ADD_GROUP: 'groups', ADD_CADET: 'groups', SAVE_CRITERIA: 'edit', ASSIGN: 'conduct', PREPARE_REPEAT:'conduct', READY: 'conduct', START: 'conduct', ABORT:'conduct', BACKUP:'manage', PAUSE: 'conduct', RESUME: 'conduct', COMMENT: 'review', OBSERVATION:'review', CONFIRM: 'review', ADD_MATERIAL: 'edit', SET_GRANT: 'manage', EXPORT: 'review', EXCHANGE_MAP: 'review', EXCHANGE_DISCIPLINE: 'review', EXCHANGE_SELECT: 'review', EXCHANGE_FIELD: 'review', VALIDATE_EXCHANGE: 'review', SIMULATE_BATCH: 'review', RETRY_BATCH: 'review', EXPORT_EXCHANGE: 'review' };

export function workspaceReducer(state, action) {
  const now = action.now ?? state.updatedAt;
  requireThat(Number.isFinite(now), 'Некорректное время действия.');
  if (action.type === 'RESET') return createDemoState(now);
  // Scenario production belongs to the supplier, never to a client grant.
  requireThat(!['SAVE_SCENARIO', 'LOAD_SCENARIO', 'POINT'].includes(action.type) && !(action.type === 'DRAFT' && action.slot === 'scenario'), 'Редактирование сценариев недоступно в клиентском пространстве.');
  const cap = ACTION_CAP[action.type];
  requireThat(!cap || can(state, cap), 'Для этого действия смените роль или локальные права.');
  const next = copy(state);
  const id = prefix => `${prefix}-${++next.sequence}`;
  let audit = '';
  const active = () => {
    const attempt = getAttempt(next);
    requireThat(attempt, 'Нет активной сессии.');
    return attempt;
  };
  const log = (attempt, kind, title, extra = {}) => attempt.events.push({ id: id('event'), kind, title, seconds: elapsedSeconds(attempt, now), ...extra });
  switch (action.type) {
    case 'NAVIGATE':
      requireThat(clientModules().some(item => item.id === Number(action.id)), 'Модуль не найден.');
      next.view.moduleId = Number(action.id);
      if (next.view.moduleId === 8 && next.activeAttemptId && !getAttempt(next)?.events.some(item => item.id === next.drafts.comment.eventId)) next.drafts.comment.eventId = '';
      break;
    case 'PROFILE':
      requireThat(Object.hasOwn(ROLES, action.role), 'Роль не найдена.');
      requireThat(next.cadets.some(item => item.id === action.cadetId), 'Выберите демо-профиль курсанта.');
      next.profile = { role: action.role, cadetId: action.cadetId };
      audit = `Выбрана роль: ${ROLES[action.role]}`;
      break;
    case 'LANGUAGE':
      requireThat(['ru', 'uz'].includes(action.language), 'Язык не поддерживается.');
      next.language = action.language;
      audit = action.language === 'ru' ? 'Выбран русский интерфейс' : 'Выбран узбекский интерфейс';
      break;
    case 'FILTER':
      requireThat(['groupFilter', 'cadetSearch', 'catalogSearch', 'sceneFilter', 'difficultyFilter', 'availabilityFilter', 'analyticsGroup', 'analyticsScenario', 'analyticsCadet', 'analyticsPeriod', 'analyticsStatus', 'materialSearch', 'auditSearch', 'auditRole'].includes(action.field), 'Фильтр не найден.');
      next.view[action.field] = text(action.value);
      break;
    case 'DRAFT': {
      const limits = { group: ['name', 'course'], cadet: ['name', 'code', 'groupId'], material: ['title', 'body'], comment: ['text', 'eventId'], observation:['kind','text'],termination:['reason'] };
      requireThat(limits[action.slot]?.includes(action.field), 'Поле черновика не найдено.');
      const needed = { group: 'groups', cadet: 'groups', material: 'edit', comment: 'review', observation:'review',termination:'conduct' }[action.slot];
      requireThat(can(next, needed), 'Черновик доступен в режиме преподавателя или по локальным правам.');
      next.drafts[action.slot][action.field] = String(action.value ?? '').slice(0, action.field === 'body' ? 12000 : action.field === 'text' ? 2000 : 180);
      break;
    }
    case 'CRITERION': {
      requireThat(can(next, 'edit'), 'Критерии доступны преподавателю.');
      const criterion = next.drafts.criteria.find(item => item.id === action.id);
      requireThat(criterion && ['enabled', 'weight'].includes(action.field), 'Критерий не найден.');
      requireThat(action.field !== 'weight' || action.value === '' || Number.isFinite(Number(action.value)), 'Вес должен быть числом.');
      criterion[action.field] = action.field === 'enabled' ? Boolean(action.value) : action.value === '' ? '' : Number(action.value);
      break;
    }
    case 'ADD_GROUP': {
      const draft = next.drafts.group;
      const name = text(draft.name, 80);
      requireThat(name && /^[1-6]$/.test(draft.course), 'Укажите название группы и курс от 1 до 6.');
      requireThat(!next.groups.some(item => item.name.toLowerCase() === name.toLowerCase()), 'Такая группа уже есть.');
      next.groups.push({ id: id('group'), name, course: draft.course });
      next.drafts.group.name = '';
      audit = 'Добавлена вымышленная учебная группа';
      break;
    }
    case 'ADD_CADET': {
      const draft = next.drafts.cadet;
      requireThat(text(draft.name) && text(draft.code) && next.groups.some(item => item.id === draft.groupId), 'Заполните псевдоним, учебный код и группу.');
      requireThat(!next.cadets.some(item => item.code.toLowerCase() === text(draft.code).toLowerCase()), 'Учебный код уже используется.');
      next.cadets.push({ id: id('cadet'), name: text(draft.name, 80), code: text(draft.code, 40), groupId: draft.groupId });
      next.drafts.cadet = { name: '', code: '', groupId: draft.groupId };
      audit = 'Добавлен вымышленный участник';
      break;
    }
    case 'SELECT_SCENARIO': {
      requireThat(can(next, 'conduct'), 'Выбор назначения доступен преподавателю.');
      requireThat(getScenario(next, action.id)?.published, 'Выберите опубликованную версию сценария.');
      next.assignment.scenarioId = action.id;
      next.assignment.checks = checksEmpty();
      audit = 'Изменен сценарий назначения, готовность сброшена';
      break;
    }
    case 'SAVE_CRITERIA':
      requireThat(next.drafts.criteria.every(item => typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight >= 0 && item.weight <= 100), 'Укажите числовые веса от 0 до 100.');
      requireThat(next.drafts.criteria.some(item => item.enabled && item.weight > 0), 'Нужен хотя бы один включенный критерий с положительным весом.');
      next.criteria = copy(next.drafts.criteria);
      next.criteriaRevision += 1;
      next.attempts.forEach(attempt => {
        if (attempt.confirmation) { attempt.confirmation = null; attempt.status = 'ended'; }
      });
      audit = 'Сохранены критерии; результаты пересчитаны, старые подтверждения сняты';
      break;
    case 'ASSIGN':
      requireThat(['groupId', 'cadetId', 'scenarioId', 'mode'].includes(action.field), 'Поле назначения не найдено.');
      if (action.field === 'groupId') {
        requireThat(next.groups.some(item => item.id === action.value), 'Группа не найдена.');
        next.assignment.cadetId = next.cadets.find(item => item.groupId === action.value)?.id || '';
      }
      if (action.field === 'cadetId') requireThat(next.cadets.some(item => item.id === action.value && item.groupId === next.assignment.groupId), 'Участник не входит в группу.');
      if (action.field === 'scenarioId') requireThat(getScenario(next, action.value)?.published, 'Выберите опубликованную версию сценария.');
      if (action.field === 'mode') requireThat(action.value === 'browser', 'В демо доступен только браузерный клиент.');
      next.assignment[action.field] = action.value;
      next.assignment.checks = checksEmpty();
      break;
    case 'READY':
      requireThat(Object.hasOwn(next.assignment.checks, action.field), 'Проверка не найдена.');
      next.assignment.checks[action.field] = Boolean(action.value);
      break;
    case 'START': {
      const issues = readinessIssues(next);
      requireThat(!issues.length, issues.join(' '));
      const attempt = {
        id: id('attempt'), scenario: copy(getScenario(next)), cadetId: next.assignment.cadetId, groupId: next.assignment.groupId,
        startedAt: now, endedAt: null, pausedAt: null, pausedMs: 0, status: 'running', events: [], comments: [], confirmation: null, seeded: false
      };
      next.attempts.push(attempt);
      next.activeAttemptId = attempt.id;
      next.selectedAttemptId = attempt.id;
      next.displayAttemptId = attempt.id;
      next.view.moduleId = 7;
      audit = 'Запущена браузерная учебная сессия';
      break;
    }
    case 'EVENT': {
      const attempt = active();
      requireThat(can(next, 'practice') && (next.profile.role !== 'cadet' || next.profile.cadetId === attempt.cadetId), 'Выберите профиль назначенного участника или преподавателя.');
      requireThat(attempt.status === 'running', 'Запись действий недоступна на паузе.');
      const point = attempt.scenario.points.find(item => item.id === action.pointId);
      requireThat(point && ['record', 'skip'].includes(action.kind), 'Действие не соответствует назначенному упражнению.');
      requireThat(!attempt.events.some(item => item.pointId === point.id), 'Эта точка уже зарегистрирована.');
      log(attempt, action.kind, point.title, { pointId: point.id });
      audit = action.kind === 'record' ? 'Зафиксировано учебное действие' : 'Зафиксирован учебный пропуск';
      break;
    }
    case 'OPEN_SCENE': {
      const attempt = active();
      requireThat(can(next, 'practice') && (next.profile.role !== 'cadet' || next.profile.cadetId === attempt.cadetId), 'Откройте назначенный профиль участника.');
      requireThat(attempt.status === 'running', 'Сначала продолжите сессию.');
      log(attempt, 'scene', 'Открыта учебная сцена', { sceneId: attempt.scenario.sceneId });
      break;
    }
    case 'PAUSE': {
      const attempt = active();
      requireThat(attempt.status === 'running', 'Пауза уже установлена.');
      log(attempt, 'pause', 'Преподаватель поставил сессию на паузу');
      attempt.pausedAt = now;
      attempt.status = 'paused';
      audit = 'Сессия на паузе';
      break;
    }
    case 'RESUME': {
      const attempt = active();
      requireThat(attempt.status === 'paused', 'Сессия не на паузе.');
      attempt.pausedMs += Math.max(0, now - attempt.pausedAt);
      attempt.pausedAt = null;
      attempt.status = 'running';
      log(attempt, 'resume', 'Сессия продолжена');
      audit = 'Сессия продолжена';
      break;
    }
    case 'ABORT':
    case 'END': {
      const attempt = active();
      if(action.type==='ABORT') {
        requireThat(text(next.drafts.termination.reason),'Укажите причину прерывания.');
        attempt.termination={kind:'interrupted',reason:text(next.drafts.termination.reason)};
        next.drafts.termination.reason='';
      }
      requireThat(can(next, 'conduct') || (can(next, 'practice') && next.profile.role === 'cadet' && next.profile.cadetId === attempt.cadetId), 'Завершение доступно преподавателю или назначенному курсанту.');
      log(attempt, 'end', action.type==='ABORT'?'Попытка прервана':'Занятие завершено');
      if (attempt.pausedAt !== null) attempt.pausedMs += Math.max(0, now - attempt.pausedAt);
      attempt.pausedAt = null;
      attempt.endedAt = now;
      attempt.status = 'ended';
      next.activeAttemptId = null;
      next.selectedAttemptId = attempt.id;
      next.assignment.checks = checksEmpty();
      next.view.moduleId = 10;
      audit = 'Сессия завершена, результат ожидает разбора';
      break;
    }
    case 'PREPARE_REPEAT': {
      const attempt=getAttempt(next,action.id);
      requireThat(attempt && attempt.endedAt!==null,'Выберите завершенную попытку.');
      requireThat(!next.activeAttemptId,'Сначала завершите активную сессию.');
      requireThat(getScenario(next,attempt.scenario.id)?.published,'Выберите опубликованную версию сценария.');
      next.assignment={...next.assignment,groupId:attempt.groupId,cadetId:attempt.cadetId,scenarioId:attempt.scenario.id,checks:checksEmpty()};
      next.view.moduleId=6;
      audit='Подготовлено повторное занятие по выбранной попытке';
      break;
    }
    case 'BACKUP':audit='Подготовлена локальная копия данных демо';break;
    case 'SELECT_ATTEMPT':
    case 'SELECT_DISPLAY': {
      requireThat(visibleAttempts(next).some(item => item.id === action.id), 'Попытка недоступна выбранному профилю.');
      next[action.type === 'SELECT_DISPLAY' ? 'displayAttemptId' : 'selectedAttemptId'] = action.id;
      next.drafts.comment = { text: '', eventId: '' };
      break;
    }
    case 'COMMENT': {
      const attempt = getAttempt(next, action.attemptId || next.selectedAttemptId);
      requireThat(attempt, 'Выберите попытку.');
      const draft = next.drafts.comment;
      requireThat(text(draft.text, 2000), 'Введите комментарий преподавателя.');
      requireThat(!draft.eventId || attempt.events.some(item => item.id === draft.eventId), 'Событие не относится к этой попытке.');
      attempt.comments.push({ id: id('comment'), text: text(draft.text, 2000), eventId: draft.eventId, seconds: elapsedSeconds(attempt, now) });
      next.drafts.comment = { text: '', eventId: '' };
      audit = 'Сохранен комментарий преподавателя';
      break;
    }
    case 'OBSERVATION': {
      const attempt = getAttempt(next, action.attemptId || next.selectedAttemptId);
      const draft = next.drafts.observation;
      requireThat(attempt && Object.hasOwn(OBSERVATIONS,draft.kind), 'Выберите попытку и вид наблюдения.');
      requireThat(text(draft.text,2000), 'Опишите наблюдение преподавателя.');
      log(attempt,draft.kind,OBSERVATIONS[draft.kind],{note:text(draft.text,2000)});
      if(attempt.status === 'confirmed') {attempt.status='ended';attempt.confirmation=null;}
      next.exchange.validation=null;
      next.drafts.observation.text='';
      audit='Сохранено наблюдение; результат требует проверки';
      break;
    }
    case 'CONFIRM': {
      const attempt = getAttempt(next, next.selectedAttemptId);
      requireThat(attempt?.status === 'ended', 'Подтверждать можно только завершенную неподтвержденную попытку.');
      requireThat(!attempt.events.some(event=>Object.hasOwn(OBSERVATIONS,event.kind)) || attempt.comments.some(comment=>comment.text.trim()), 'Добавьте комментарий к наблюдениям перед подтверждением.');
      const score = calculateResult(attempt, next.criteria).score;
      requireThat(score !== null, 'Включите критерий с положительным весом.');
      attempt.confirmation = { at: now, criteriaRevision: next.criteriaRevision, score };
      attempt.status = 'confirmed';
      audit = 'Преподаватель подтвердил локальный учебный результат';
      break;
    }
    case 'ADD_MATERIAL': {
      const draft = next.drafts.material;
      requireThat(text(draft.title) && text(draft.body, 12000), 'Заполните название и текст заметки.');
      next.materials.push({ id: id('material'), title: text(draft.title), body: text(draft.body, 12000) });
      next.drafts.material = { title: '', body: '' };
      audit = 'Добавлена локальная текстовая заметка';
      break;
    }
    case 'PREFERENCE':
      requireThat(action.field === 'density' && ['comfortable', 'compact'].includes(action.value) || action.field === 'displayNames' && typeof action.value === 'boolean', 'Настройка не найдена.');
      next.preferences[action.field] = action.value;
      audit = 'Обновлены настройки интерфейса';
      break;
    case 'EXCHANGE_VIEW':
      requireThat(['tab', 'groupFilter', 'statusFilter'].includes(action.field), 'Фильтр не найден.');
      requireThat(action.field !== 'tab' || Object.hasOwn(EXCHANGE_TABS, action.value), 'Раздел обмена не найден.');
      requireThat(action.field !== 'statusFilter' || ['all', 'confirmed', 'blocked', 'simulated'].includes(action.value), 'Фильтр не найден.');
      next.exchange[action.field] = text(action.value);
      break;
    case 'EXCHANGE_MAP': {
      const sources = { students: next.cadets.map(item => item.id), groups: next.groups.map(item => item.id), courses: next.groups.map(item => item.course), scenarios: [...next.scenarios, ...next.attempts.map(item => item.scenario)].map(item => item.id), dates: visibleAttempts(next).map(item => item.id) };
      requireThat(sources[action.kind]?.includes(action.id), 'Объект сопоставления не найден.');
      next.exchange.mappings[action.kind][action.id] = text(action.value, 120);
      next.exchange.validation = null;
      break;
    }
    case 'EXCHANGE_SELECT':
      requireThat(visibleAttempts(next).some(item => item.id === action.id), 'Попытка недоступна выбранному профилю.');
      next.exchange.selected = next.exchange.selected.filter(id => id !== action.id);
      if (action.value) next.exchange.selected.push(action.id);
      next.exchange.validation = null;
      break;
    case 'EXCHANGE_DISCIPLINE':
      next.exchange.disciplineId = text(action.value, 120);
      next.exchange.validation = null;
      audit = 'Изменено концептуальное сопоставление дисциплины';
      break;
    case 'EXCHANGE_FIELD':
      requireThat(Object.hasOwn(EXCHANGE_FIELDS, action.id) && !['studentId', 'groupId', 'courseId', 'disciplineId', 'scenarioVersion', 'resultDate', 'score'].includes(action.id), 'Обязательные поля нельзя исключить.');
      next.exchange.fields = next.exchange.fields.filter(key => key !== action.id);
      if (action.value) next.exchange.fields.push(action.id);
      next.exchange.validation = null;
      break;
    case 'VALIDATE_EXCHANGE': {
      const { ok, errors, fingerprint } = validateExchange(next);
      next.exchange.validation = { ok, errors, fingerprint, at: now };
      next.exchange.tab = 'validation';
      audit = ok ? 'Локальная проверка обмена пройдена' : 'Локальная проверка обнаружила ошибки';
      break;
    }
    case 'SIMULATE_BATCH':
    case 'RETRY_BATCH': {
      const validation = validateExchange(next);
      requireThat(validation.ok && next.exchange.validation?.ok && next.exchange.validation.fingerprint === validation.fingerprint, 'Сначала успешно проверьте выбранные записи.');
      const existing = next.exchange.batches.find(item => action.type === 'RETRY_BATCH' ? item.id === action.id : item.fingerprint === validation.fingerprint);
      if (action.type === 'RETRY_BATCH') requireThat(existing?.fingerprint === validation.fingerprint, 'Пакет устарел. Проверьте текущие записи заново.');
      if (existing) {
        existing.retryCount += 1;
        existing.lastRetryAt = now;
        next.exchange.lastReceiptId = existing.id;
        audit = 'Повтор локальной симуляции: использована прежняя квитанция';
      } else {
        const batch = { id: id('local-batch'), receipt: id('local-receipt'), at: now, status: 'LOCAL SIMULATION', fingerprint: validation.fingerprint, retryCount: 0, lastRetryAt: null, fields: copy(next.exchange.fields), records: validation.rows.map(row => ({ id: row.id, values: copy(row.values) })) };
        next.exchange.batches.push(batch);
        next.exchange.lastReceiptId = batch.id;
        audit = 'Создан пакет LOCAL SIMULATION';
      }
      next.exchange.tab = 'history';
      break;
    }
    case 'EXPORT_EXCHANGE':
      exchangeCSV(next, toCSV);
      audit = 'Создан локальный CSV выбранных сопоставленных записей';
      break;
    case 'SET_GRANT':
      requireThat(Object.hasOwn(ROLES, action.role) && Object.hasOwn(CAPABILITIES, action.capability), 'Право не найдено.');
      requireThat(!['review', 'manage'].includes(action.capability), 'Подтверждение закреплено за преподавателем, доступ за администратором.');
      next.grants[action.role][action.capability] = Boolean(action.value);
      audit = `Изменено локальное право: ${ROLES[action.role]}, ${CAPABILITIES[action.capability]}`;
      break;
    case 'EXPORT':
      audit = 'Создан локальный CSV, внешней отправки нет';
      break;
    default: throw new Error('Неизвестное действие рабочего пространства.');
  }
  next.revision += 1;
  next.updatedAt = now;
  if (audit) next.audit = [...next.audit, { id: id('audit'), at: now, role: next.profile.role, action: audit }].slice(-120);
  return next;
}

export function restoreDemoState(raw, now = Date.now()) {
  if (!raw) return { state: createDemoState(now), warning: '' };
  try {
    const state = JSON.parse(raw);
    const defaults = createDemoState(now);
    // Preserve withdrawn drafts as inert legacy data; they have no editing action.
    if (state.view?.moduleId === 4) state.view.moduleId = 3;
    if (state.drafts?.scenario) {
      state.legacyScenarioDraft = state.drafts.scenario;
      delete state.drafts.scenario;
    }
    if (state.view) state.view = { ...defaults.view, ...state.view };
    if(state.drafts) {state.drafts.observation ??= copy(defaults.drafts.observation);state.drafts.termination ??= copy(defaults.drafts.termination);}
    state.preferences = { ...defaults.preferences, ...state.preferences };
    state.exchange ??= createExchange(state.attempts || []);
    if (state.exchange && typeof state.exchange === 'object') {
      state.exchange.disciplineId ??= '';
      if (Array.isArray(state.exchange.fields) && !state.exchange.fields.includes('disciplineId')) state.exchange.fields.splice(3, 0, 'disciplineId');
    }
    const list = (value, max) => Array.isArray(value) && value.length <= max;
    const str = value => typeof value === 'string';
    const uniqueIds = items => new Set(items.map(item => item.id)).size === items.length;
    const scenarioValid = item => item && str(item.id) && str(item.familyId) && Object.hasOwn(SCENES, item.sceneId) && str(item.title) && str(item.environment) && ['basic', 'advanced'].includes(item.difficulty) && Number.isInteger(item.version) && item.version > 0 && list(item.points, 24) && item.points.every(point => str(point.id) && str(point.title) && str(point.description)) && uniqueIds(item.points);
    requireThat(state.version === SCHEMA_VERSION && Number.isInteger(state.revision) && Number.isInteger(state.sequence) && Number.isFinite(state.updatedAt), 'version');
    requireThat(['ru', 'uz'].includes(state.language) && Object.hasOwn(ROLES, state.profile?.role), 'profile');
    requireThat(list(state.groups, 1000) && state.groups.length && state.groups.every(item => str(item.id) && str(item.name) && str(item.course)), 'groups');
    requireThat(list(state.cadets, 5000) && state.cadets.length && state.cadets.every(item => str(item.id) && str(item.name) && str(item.code) && state.groups.some(group => group.id === item.groupId)), 'cadets');
    requireThat(state.cadets.some(item => item.id === state.profile.cadetId), 'profile cadet');
    requireThat(list(state.scenarios, 1000) && state.scenarios.length && state.scenarios.every(item => scenarioValid(item) && item.points.length), 'scenarios');
    const criteriaValid = (items, draft = false) => list(items, 3) && items.length === 3 && Object.keys(CRITERIA).every(key => items.filter(item => item.id === key).length === 1) && items.every(item => typeof item.enabled === 'boolean' && (typeof item.weight === 'number' && Number.isFinite(item.weight) && (draft || item.weight >= 0 && item.weight <= 100) || draft && item.weight === ''));
    requireThat(criteriaValid(state.criteria) && Number.isInteger(state.criteriaRevision), 'criteria');
    requireThat(list(state.attempts, 5000) && state.attempts.every(item => scenarioValid(item.scenario) && item.scenario.points.length && str(item.id) && Object.hasOwn(STATUSES, item.status) && Number.isFinite(item.startedAt) && Number.isFinite(item.pausedMs) && (item.endedAt === null || Number.isFinite(item.endedAt)) && (item.pausedAt === null || Number.isFinite(item.pausedAt)) && state.cadets.some(cadet => cadet.id === item.cadetId && cadet.groupId === item.groupId) && list(item.events, 1000) && item.events.every(event => str(event.id) && str(event.kind) && str(event.title) && Number.isFinite(event.seconds)) && list(item.comments, 1000) && item.comments.every(comment => str(comment.id) && str(comment.text) && str(comment.eventId) && Number.isFinite(comment.seconds))), 'attempts');
    requireThat(state.attempts.every(item => item.pausedMs >= 0 && (item.status === 'paused') === (item.pausedAt !== null) && ['ended', 'confirmed'].includes(item.status) === (item.endedAt !== null) && item.events.every((event, index) => ['record', 'skip', 'pause', 'resume', 'scene', 'end', ...Object.keys(OBSERVATIONS)].includes(event.kind) && event.seconds >= 0 && (!index || event.seconds >= item.events[index - 1].seconds) && (!Object.hasOwn(OBSERVATIONS,event.kind) || str(event.note)) && (!['record', 'skip'].includes(event.kind) || item.scenario.points.some(point => point.id === event.pointId))) && new Set(item.events.filter(event => event.pointId).map(event => event.pointId)).size === item.events.filter(event => event.pointId).length && uniqueIds(item.events) && uniqueIds(item.comments) && (item.status !== 'confirmed' || item.confirmation && item.confirmation.criteriaRevision === state.criteriaRevision && Number.isFinite(item.confirmation.at) && Number.isFinite(item.confirmation.score))), 'attempt consistency');
    requireThat(state.activeAttemptId === null || state.attempts.some(item => item.id === state.activeAttemptId && ['running', 'paused'].includes(item.status)), 'active');
    requireThat(state.attempts.every(item=>!item.termination || item.termination.kind==='interrupted' && str(item.termination.reason) && item.endedAt!==null),'termination');
    requireThat(state.attempts.filter(item => ['running', 'paused'].includes(item.status)).length === (state.activeAttemptId ? 1 : 0), 'active count');
    requireThat(state.assignment && state.assignment.mode === 'browser' && state.groups.some(item => item.id === state.assignment.groupId) && getScenario(state) && Object.keys(checksEmpty()).every(key => typeof state.assignment.checks?.[key] === 'boolean'), 'assignment');
    requireThat(Object.keys(ROLES).every(role => Object.keys(CAPABILITIES).every(cap => typeof state.grants?.[role]?.[cap] === 'boolean')), 'grants');
    requireThat(state.grants.teacher.review && !state.grants.admin.review && !state.grants.cadet.review && state.grants.admin.manage && !state.grants.teacher.manage && !state.grants.cadet.manage, 'fixed grants');
    requireThat(criteriaValid(state.drafts?.criteria, true) && Object.hasOwn(OBSERVATIONS,state.drafts.observation?.kind) && str(state.drafts.observation?.text) && str(state.drafts.termination?.reason), 'drafts');
    for (const [slot, fields] of Object.entries({ group: ['name', 'course'], cadet: ['name', 'code', 'groupId'], material: ['title', 'body'], comment: ['text', 'eventId'] })) requireThat(fields.every(field => str(state.drafts[slot]?.[field])), 'draft fields');
    requireThat(list(state.materials, 1000) && state.materials.every(item => str(item.id) && str(item.title) && str(item.body)), 'materials');
    requireThat([state.groups, state.cadets, state.scenarios, state.attempts, state.materials].every(uniqueIds), 'duplicate ids');
    requireThat(list(state.audit, 120) && state.audit.every(item => str(item.id) && str(item.action) && Object.hasOwn(ROLES, item.role) && Number.isFinite(item.at)), 'audit');
    requireThat(state.view && clientModules().some(item => item.id === state.view.moduleId) && ['groupFilter', 'cadetSearch', 'catalogSearch', 'sceneFilter', 'difficultyFilter', 'availabilityFilter', 'analyticsGroup', 'analyticsScenario', 'analyticsCadet', 'analyticsPeriod', 'analyticsStatus', 'materialSearch', 'auditSearch', 'auditRole'].every(key => str(state.view[key])), 'view');
    requireThat(['comfortable', 'compact'].includes(state.preferences.density) && typeof state.preferences.displayNames === 'boolean', 'preferences');
    const exchange = state.exchange;
    requireThat(exchange && Object.hasOwn(EXCHANGE_TABS, exchange.tab) && str(exchange.groupFilter) && str(exchange.disciplineId) && ['all', 'confirmed', 'blocked', 'simulated'].includes(exchange.statusFilter) && list(exchange.selected, 5000) && exchange.selected.every(str) && new Set(exchange.selected).size === exchange.selected.length && list(exchange.fields, 9) && exchange.fields.every(key => Object.hasOwn(EXCHANGE_FIELDS, key)) && new Set(exchange.fields).size === exchange.fields.length, 'exchange');
    requireThat(['students', 'groups', 'courses', 'scenarios', 'dates'].every(key => exchange.mappings?.[key] && typeof exchange.mappings[key] === 'object' && !Array.isArray(exchange.mappings[key]) && Object.values(exchange.mappings[key]).every(str)) && list(exchange.batches, 5000) && exchange.batches.every(item => str(item.id) && str(item.receipt) && str(item.fingerprint) && Number.isFinite(item.at) && Number.isInteger(item.retryCount) && item.retryCount >= 0 && item.status === 'LOCAL SIMULATION' && list(item.fields, 9) && item.fields.every(key => Object.hasOwn(EXCHANGE_FIELDS, key)) && list(item.records, 5000) && item.records.every(row => str(row.id) && row.values && typeof row.values === 'object')) && uniqueIds(exchange.batches), 'exchange history');
    // Revalidation never trusts a stored success flag or stale payload.
    if (exchange.validation) {
      const checked = validateExchange(state);
      exchange.validation = checked.fingerprint === exchange.validation.fingerprint ? { ok: checked.ok, errors: checked.errors, fingerprint: checked.fingerprint, at: exchange.validation.at } : null;
    }
    // Refresh only unchanged bundled translations; retain user content and all progress.
    for (const [key, originals] of Object.entries({ scenarios: defaults.scenarios, groups: defaults.groups, cadets: defaults.cadets })) {
      for (const original of originals) {
        const item = state[key].find(item => item.id === original.id);
        if (!item) continue;
        const fields = key === 'scenarios' ? ['title', 'summary'] : ['name'];
        for (const field of fields) if (item[field] === original[field] && original.i18nSource?.[field]) {
          item.i18nSource = { ...item.i18nSource, [field]: original[field] };
          item[`uz${field[0].toUpperCase()}${field.slice(1)}`] = original[`uz${field[0].toUpperCase()}${field.slice(1)}`];
        }
        if (key === 'scenarios') item.points.forEach(point => {
          const source = original.points.find(row => row.id === point.id && row.title === point.title && row.description === point.description);
          if (source) Object.assign(point, seedTranslations(source, ['title', 'description']));
        });
      }
    }
    for (const attempt of state.attempts) {
      const source = defaults.scenarios.find(item => item.id === attempt.scenario.id && item.title === attempt.scenario.title);
      if (source) {
        const translated = seedTranslations(source, ['title']);
        Object.assign(attempt.scenario, { ...translated, i18nSource: { ...attempt.scenario.i18nSource, ...translated.i18nSource } });
        attempt.scenario.points.forEach(point => {
          const original = source.points.find(item => item.id === point.id && item.title === point.title && item.description === point.description);
          if (original) Object.assign(point, seedTranslations(original, ['title', 'description']));
        });
      }
      attempt.comments.forEach(comment => { if (attempt.seeded && comment.id === `${attempt.id}-comment` && comment.text === 'Учебный пример. Обсудите последовательность наблюдений.') comment.seeded = true; });
    }
    const bundledPoints = defaults.scenarios.flatMap(item => item.points);
    for (const scenario of [...state.scenarios, ...state.attempts.map(item => item.scenario)]) {
      // Legacy versions may inherit seed points, but their custom text stays exact.
      for (const point of scenario.points) {
        const source = bundledPoints.find(item => item.id === point.id && item.title === point.title && item.description === point.description);
        if (source) Object.assign(point, seedTranslations(source, ['title', 'description']));
      }
    }
    for (const original of defaults.materials) {
      const material = state.materials.find(item => item.id === original.id && item.title === original.title && item.body === original.body);
      if (!material) continue;
      Object.assign(material, seedTranslations(original, ['title', 'body']));
      for (const field of ['uzTitle', 'uzBody']) {
        if (material[field] === original[field].replaceAll("'", '')) material[field] = original[field];
      }
    }
    // Only add the new market family; never overwrite IDs, saved versions or other data.
    const market = defaults.scenarios.find(item => item.familyId === 'market' && item.version === 1);
    if (market && state.scenarios.length < 1000 && !state.scenarios.some(item => item.familyId === 'market' || item.id === market.id)) state.scenarios.push(copy(market));
    if (state.libraryRevision !== 2) {
      for (const item of defaults.scenarios.filter(item=>item.conceptId)) if(state.scenarios.length<1000 && !state.scenarios.some(saved=>saved.id===item.id)) state.scenarios.push(copy(item));
      state.libraryRevision=2;
    }
    return { state, warning: '' };
  } catch {
    return { state: createDemoState(now), warning: 'Сохраненные данные несовместимы или повреждены. Открыт учебный пример. Исходная запись не изменена до следующего действия.' };
  }
}

// Formula-injection protection applies even to locally entered pseudonyms and notes.
export function toCSV(rows) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const raw = String(value ?? '');
    const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(';')).join('\r\n');
}

export function resultCSV(state, ids = null, confirmedOnly = false) {
  const t = value => translate(value, state.language);
  const local = (item, key = 'title') => localizedField(item, key, state.language);
  const attempts = visibleAttempts(state).filter(item => item.endedAt !== null && (!ids || ids.includes(item.id)) && (!confirmedOnly || item.status === 'confirmed'));
  return toCSV([
    ['LOCAL SIMULATION', 'Группа', 'Учебный код', 'Псевдоним', 'Сценарий', 'Версия', 'Статус', 'Демо-балл', 'Секунды', 'Редакция критериев', 'Комментарий'].map(t),
    ...attempts.map(item => [item.id, local(state.groups.find(group => group.id === item.groupId), 'name'), state.cadets.find(cadet => cadet.id === item.cadetId)?.code, local(state.cadets.find(cadet => cadet.id === item.cadetId), 'name'), local(item.scenario), item.scenario.version, t(STATUSES[item.status]), calculateResult(item, state.criteria).score, elapsedSeconds(item, item.endedAt), state.criteriaRevision, item.comments.map(comment => comment.seeded ? t(comment.text) : comment.text).join(' | ')])
  ]);
}

export function attemptCSV(state, id) {
  const t = value => translate(value, state.language);
  const local = item => localizedField(item, 'title', state.language);
  const attempt = visibleAttempts(state).find(item => item.id === id);
  requireThat(attempt?.endedAt !== null && attempt, 'Выберите завершенную попытку.');
  const result = calculateResult(attempt, state.criteria);
  return toCSV([
    ['Тип записи, локальное демо', 'Попытка', 'Секунды', 'Действие', 'Статус', 'Точка', 'Комментарий', 'Демо-балл', 'Версия сценария', 'Редакция критериев'].map(t),
    [t('Итог'), attempt.id, result.duration, local(attempt.scenario), t(STATUSES[attempt.status]), '', '', result.score, attempt.scenario.version, state.criteriaRevision],
    ...attempt.events.map(event => [t('Событие'), attempt.id, event.seconds, event.pointId ? local(attempt.scenario.points.find(point => point.id === event.pointId)) : t(event.title), t(({ record: 'Зафиксировано', skip: 'Пропущено', pause: 'Пауза', resume: 'Продолжение', scene: 'Просмотр', end: 'Завершение' })[event.kind]), event.pointId || '', '', '', attempt.scenario.version, state.criteriaRevision]),
    ...attempt.comments.map(comment => [t('Комментарий'), attempt.id, comment.seconds, '', '', comment.eventId, comment.seeded ? t(comment.text) : comment.text, '', attempt.scenario.version, state.criteriaRevision])
  ]);
}


let mountSequence = 0;

/** Moves with its root, including into a native dialog. No remount or global CSS required. */
export function mountWorkspace(root, options = {}) {
  requireThat(root?.ownerDocument && typeof root.append === 'function', 'Передайте корневой DOM-элемент.');
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const prefix = `vr-workspace-${++mountSequence}`;
  const controller = new win.AbortController();
  const signal = controller.signal;
  let destroyed = false;
  let storageWarning = '';
  let raw = null;
  try { raw = win.localStorage.getItem(STORAGE_KEY); } catch { storageWarning = 'Хранилище браузера недоступно. Изменения сохраняются только до закрытия страницы.'; }
  const restored = restoreDemoState(raw);
  let state = restored.state;
  state.language = getLanguage();
  let notice = restored.warning;
  let noticeError = Boolean(notice);
  const frame = doc.createElement('div');
  frame.setAttribute('data-vr-workspace', '');
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./workspace.css?v=sales20261027-r7local', import.meta.url).href;
  if (!doc.head?.querySelector?.('link[href*="workspace.css"],link[data-workspace-styles]')) root.append(stylesheet);
  root.append(frame);

  const t = value => translate(value, state.language);
  const rawText = value => doc.createTextNode(String(value ?? ''));
  const local = (item, key = 'title') => {
    const value = localizedField(item, key, state.language);
    return key === 'body' && item?.i18nSource?.body === item.body ? value.replaceAll('\\n', '\n') : value;
  };
  const dataText = (item, key = 'title') => rawText(local(item, key));
  const element = (tag, attrs = {}, ...children) => {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === undefined || value === null) continue;
      if (key === 'class') node.className = value;
      else if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'selected') node[key] = value;
      else node.setAttribute(key, String(value));
    }
    const append = child => {
      if (Array.isArray(child)) child.forEach(append);
      else if (child !== null && child !== undefined && child !== false) node.append(child?.nodeType ? child : doc.createTextNode(String(t(child))));
    };
    children.forEach(append);
    return node;
  };
  const button = (label, action, attrs = {}) => element('button', { type: 'button', class: 'ws-button', 'data-action': action, ...attrs }, t(label));
  const icon = name => {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
    for (const [key, value] of Object.entries({ class: 'ws-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(key, value);
    use.setAttribute('href', `${new URL('./assets/ui-icons/sprite.svg', import.meta.url).href}#i-${name}`);
    svg.append(use);
    return svg;
  };
  const go = (label, moduleId, attrs = {}) => button(label, 'navigate', { 'data-module': moduleId, ...attrs });
  const p = (value, cls = 'ws-muted') => element('p', { class: cls }, t(value));
  const badge = (value, cls = '') => element('span', { class: `ws-badge ${cls}` }, t(value));
  const panel = (title, ...children) => element('section', { class: 'ws-panel' }, element('h3', {}, t(title)), ...children);
  const grid = (...children) => element('div', { class: 'ws-grid' }, ...children);
  const row = (...children) => element('div', { class: 'ws-row' }, ...children);
  const empty = () => p('Нет данных по выбранному фильтру.', 'ws-empty');
  const field = (label, input) => element('label', { class: 'ws-field' }, element('span', {}, t(label)), input);
  const input = (slot, key, value, attrs = {}) => element('input', { class: 'ws-input', name: `${slot}.${key}`, 'data-slot': slot, 'data-field': key, value, maxlength: 180, autocomplete: 'off', ...attrs });
  const draftInput = (slot, key, attrs = {}) => input(slot, key, state.drafts[slot][key], attrs);
  const area = (slot, key, value, attrs = {}) => element('textarea', { class: 'ws-input', name: `${slot}.${key}`, 'data-slot': slot, 'data-field': key, rows: 4, maxlength: key === 'body' ? 12000 : 2000, ...attrs }, rawText(value));
  const select = (slot, key, value, items, attrs = {}) => element('select', { class: 'ws-input', name: `${slot}.${key}`, 'data-slot': slot, 'data-field': key, ...attrs }, items.map(([id, label]) => element('option', { value: id, selected: String(id) === String(value) }, t(label))));
  const groupOptions = all => [...(all ? [['', t('Все группы')]] : []), ...state.groups.map(item => [item.id, rawText(local(item, 'name'))])];
  const scenarioOptions = () => state.scenarios.filter(item=>!isLegacyOverview(item) || item.id===state.assignment.scenarioId).map(item => [item.id, rawText(`${local(item)} / v${item.version}`)]);
  const cadetName = id => local(state.cadets.find(item => item.id === id), 'name') || t('Участник недоступен');
  const groupName = id => local(state.groups.find(item => item.id === id), 'name') || t('Группа недоступна');
  const eventTitle = (attempt, event) => event.pointId ? local(attempt.scenario.points.find(point => point.id === event.pointId)) || event.title : t(event.title);
  const commentText = comment => comment.seeded ? t(comment.text) : rawText(comment.text);
  const stamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const form = (action, ...children) => element('form', { class: 'ws-form', 'data-form': action }, ...children);
  const submit = (label, disabled = false) => element('button', { class: 'ws-button ws-primary', type: 'submit', disabled }, t(label));
  const lock = capability => !can(state, capability);
  const notifyParent = () => {
    if (typeof options.onStateChange === 'function') {
      try { options.onStateChange(copy(state)); } catch { win.console?.warn('Не удалось обновить внешнюю сводку рабочего пространства.'); }
    }
  };
  const save = () => {
    try { win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageWarning = ''; }
    catch { storageWarning = 'Не удалось сохранить изменения в браузере. Текущая сессия работает в памяти; экспортируйте нужный CSV.'; }
    notifyParent();
    win.dispatchEvent(new win.CustomEvent('university-vr-workspace-state', { detail: { source: prefix, state: copy(state) } }));
  };
  const dispatch = (action, renderAfter = true, message = '') => {
    if (destroyed) return false;
    try {
      if (renderAfter) localDialog?.close();
      state = workspaceReducer(state, { ...action, now: Date.now() });
      if (action.type === 'RESET') state.language = getLanguage();
      if (action.type === 'LANGUAGE') setLanguage(state.language);
      notice = message;
      noticeError = false;
      save();
      if (renderAfter) render();
      else updateNotices();
      return true;
    } catch (error) {
      notice = error.message;
      noticeError = true;
      if (renderAfter) render(); else updateNotices();
      return false;
    }
  };

  function updateNotices() {
    const node = frame.querySelector('[data-notice]');
    if (!node) return;
    node.textContent = [storageWarning, notice].filter(Boolean).map(t).join(' ');
    node.hidden = !node.textContent;
    node.classList.toggle('ws-error', noticeError);
    const dirty = frame.querySelector('[data-dirty]');
    if (dirty) dirty.textContent = JSON.stringify(state.criteria) === JSON.stringify(state.drafts.criteria) ? t('Сохранено') : t('Есть несохраненные изменения');
  }

  function attemptSelector(slot = 'attempt') {
    const available = visibleAttempts(state);
    const chosen = slot === 'display' ? state.displayAttemptId : state.selectedAttemptId;
    return field('Попытка', select(slot, 'id', available.some(item => item.id === chosen) ? chosen : available[0]?.id, available.map(item => [item.id, rawText(`${slot === 'display' && !state.preferences.displayNames ? groupName(item.groupId) : cadetName(item.cadetId)} / ${local(item.scenario)} / ${t(STATUSES[item.status])}`)])));
  }

  function timeline(attempt) {
    if (!attempt.events.length) return p('Действий пока нет. Зафиксируйте контрольную точку в модуле практики.', 'ws-empty');
    return element('ol', { class: 'ws-timeline' }, attempt.events.map(event => element('li', { class: event.kind === 'skip' ? 'ws-missed' : '' },
      element('time', {}, stamp(event.seconds)), element('div', {}, element('strong', {}, rawText(eventTitle(attempt, event))), p(({ record: 'Действие зафиксировано', skip: 'Точка пропущена', pause: 'Пауза преподавателя', resume: 'Продолжение', end: 'Конец попытки', scene: 'Просмотр сцены' })[event.kind] || 'Учебное событие')))));
  }

  function attemptStats(attempt) {
    const result = calculateResult(attempt, state.criteria);
    return element('div', { class: 'ws-stats' }, [
      [`${result.completed} / ${attempt.scenario.points.length}`, 'Контрольные точки'],
      [result.score === null ? 'Нет' : `${result.score} / 100`, 'Иллюстративный балл'],
      [element('span', { 'data-elapsed': attempt.id }, stamp(elapsedSeconds(attempt, Date.now()))), 'Время']
    ].map(([value, label]) => element('div', {}, element('strong', {}, value), element('small', {}, t(label)))));
  }

  const facts = pairs => element('dl', { class: 'ws-facts' }, pairs.flatMap(([label, value]) => [element('dt', {}, label), element('dd', {}, value)]));
  const pointsPreview = scenario => element('ol', { class: 'ws-passport-points' }, scenario.points.map((point, index) => element('li', {}, element('strong', {}, index + 1, '. ', dataText(point)), p(dataText(point, 'description')))));
  const recentRows = attempts => attempts.length ? table(['Участник', 'Сценарий', 'Статус', 'Действия'], attempts.slice().reverse().slice(0, 6).map(attempt => [rawText(cadetName(attempt.cadetId)), dataText(attempt.scenario), t(STATUSES[attempt.status]), button('К разбору', 'review-attempt', { 'data-id': attempt.id })])) : empty();
  const visibleActive = () => visibleAttempts(state).find(item => item.id === state.activeAttemptId);

  function moduleProfile() {
    const available = visibleAttempts(state), active = visibleActive(), pending = available.filter(item => item.status === 'ended'), scenario = getScenario(state);
    const assigned=state.profile.role!=='cadet'||state.profile.cadetId===state.assignment.cadetId;
    return element('div', {},
      grid(panel('Следующий шаг', p(active ? 'Практика уже идет. Откройте наблюдение или продолжите упражнение.' : pending.length ? 'Есть попытки для разбора. Проверьте события и добавьте обратную связь.' : 'Выберите учебную группу, опубликованный сценарий и проверьте готовность.'),
        row(active ? go('Продолжить практику', 7) : go('Настроить занятие', 6), go('К разбору', 10), go('Материалы', 13)),
        facts([['Готовность', Object.values(state.assignment.checks).filter(Boolean).length + ' / 3'], ['Ожидает разбора', pending.length], ['Назначенный сценарий', dataText(scenario)]])),
      panel('Ближайшее занятие', state.profile.role !== 'cadet' || state.profile.cadetId === state.assignment.cadetId ? facts([['Группа', rawText(groupName(state.assignment.groupId))], ['Участник', rawText(cadetName(state.assignment.cadetId))], ['Сценарий', dataText(scenario)], ['Версия', 'v' + scenario.version]]) : p('Для выбранного профиля пока нет назначения.'),
        row(go('Подготовить занятие', 6), go('Паспорт сценария', 3)))),
      panel('Последние попытки', recentRows(available)),
      assigned&&panel('План занятия', dataText(scenario), pointsPreview(scenario), row(go('Паспорт сценария', 3), go('Методика', 5))),
      element('details', { class: 'ws-panel' }, element('summary', {}, 'Демо-профиль курсанта'), p('Роли имитируются локально. Действия зависят от прав; курсант видит только собственные попытки.'),
        field('Демо-профиль курсанта', select('profile', 'cadetId', state.profile.cadetId, state.cadets.map(item => [item.id, rawText(local(item, 'name') + ' / ' + groupName(item.groupId))]))), go('Доступ', 15)));
  }

  function moduleGroups() {
    const visible = state.cadets.filter(item => (state.profile.role !== 'cadet' || item.id === state.profile.cadetId) && (!state.view.groupFilter || item.groupId === state.view.groupFilter) && (local(item, 'name') + ' ' + item.code).toLowerCase().includes(state.view.cadetSearch.toLowerCase()));
    return element('div', {},
      row(field('Группа', select('filter', 'groupFilter', state.view.groupFilter, groupOptions(true))), field('Поиск', input('filter', 'cadetSearch', state.view.cadetSearch, { type: 'search' }))),
      panel('Состав групп', visible.length ? table(['Псевдоним', 'Учебный код', 'Группа', 'Курс', 'Действия'], visible.map(item => [dataText(item, 'name'), rawText(item.code), rawText(groupName(item.groupId)), state.groups.find(group => group.id === item.groupId)?.course, button('Карточка участника', 'cadet-detail', { 'data-id': item.id })])) : empty()),
      grid(panel('Добавить группу', form('add-group', field('Название', draftInput('group', 'name', { required: true, disabled: lock('groups'), maxlength: 80 })), field('Курс', select('group', 'course', state.drafts.group.course, [1, 2, 3, 4, 5, 6].map(value => [value, value]), { disabled: lock('groups') })), submit('Добавить группу', lock('groups')))),
        panel('Добавить участника', p('Используйте только вымышленный псевдоним и учебный код. Не вводите личные данные.'), form('add-cadet', field('Псевдоним', draftInput('cadet', 'name', { required: true, disabled: lock('groups'), maxlength: 80 })), field('Учебный код', draftInput('cadet', 'code', { required: true, disabled: lock('groups'), maxlength: 40 })), field('Группа', select('cadet', 'groupId', state.drafts.cadet.groupId, groupOptions(false), { disabled: lock('groups') })), submit('Добавить участника', lock('groups'))))));
  }

  function moduleCatalog() {
    const filtered = state.scenarios.filter(item => !isLegacyOverview(item) && (!state.view.sceneFilter || item.sceneId === state.view.sceneFilter) && (!state.view.difficultyFilter || item.difficulty===state.view.difficultyFilter) && (!state.view.availabilityFilter || (item.published?'published':'saved')===state.view.availabilityFilter) && (local(item) + ' ' + t(SCENES[item.sceneId])).toLowerCase().includes(state.view.catalogSearch.toLowerCase()));
    return element('div', {}, row(field('Поиск', input('filter', 'catalogSearch', state.view.catalogSearch, { type: 'search' })), field('Среда', select('filter', 'sceneFilter', state.view.sceneFilter, [['', 'Все среды'], ...Object.entries(SCENES)])), field('Сложность',select('filter','difficultyFilter',state.view.difficultyFilter,[['','Любая сложность'],['basic','Базовая'],['advanced','Повышенная']])), field('Доступность',select('filter','availabilityFilter',state.view.availabilityFilter,[['','Все версии'],['published','Опубликован'],['saved','Сохраненная версия']]))),
      p('Каталог опубликованных паспортов. Содержание и версии доступны только для чтения.'),
      element('div', { class: 'ws-catalog' }, filtered.length ? filtered.map(item => panel(dataText(item),
        row(badge(item.published ? 'Опубликован' : 'Сохраненная версия'), badge('v' + item.version), badge(item.difficulty === 'basic' ? 'Базовая' : 'Повышенная')),
        p(item.summary ? dataText(item, 'summary') : 'Наблюдение, фиксация действий и совместный разбор.'),
        facts([['Среда', t(SCENES[item.sceneId])], ['Контрольные точки', item.points.length]]),
        element('details', {}, element('summary', {}, 'Паспорт сценария'), item.brief && p(dataText(item,'brief')), pointsPreview(item), item.debrief && p(dataText(item,'debrief'))),
        row(button(state.assignment.scenarioId === item.id ? 'Выбран' : 'Назначить', 'select-scenario', { 'data-id': item.id, disabled: lock('conduct') || state.assignment.scenarioId === item.id }), go('Подготовить занятие', 6)))) : empty()));
  }

  function moduleCriteria() {
    const sample = visibleAttempts(state).find(item => item.endedAt !== null);
    const explanations = { coverage: 'Доля зафиксированных точек. Пропуск не считается выполнением.', order: 'Доля действий без возврата назад по ожидаемому списку.', time: 'До 45 секунд на точку без снижения. Паузы исключаются; без действий вклад равен нулю.' };
    return element('div',{},panel('Шесть аспектов разбора',p('Полнота, порядок и время входят в числовой пример. Критические ошибки, нарушения и помощь фиксируются преподавателем отдельно и видны в разборе и аналитике. Их вес и пороги утверждает университет.'),row(...Object.values(OBSERVATIONS).map(label=>badge(label))),go('К разбору',10)),form('save-criteria', panel('Иллюстративная методика', p('Демо-балл = 100 × сумма (доля критерия × его вес) / сумма включенных весов. Это не утвержденная академическая методика.'),
      state.drafts.criteria.map(item => element('div', { class: 'ws-criterion-card' }, row(
        element('label', { class: 'ws-check' }, element('input', { type: 'checkbox', name: 'criterion.' + item.id + '.enabled', 'data-slot': 'criterion', 'data-id': item.id, 'data-field': 'enabled', checked: item.enabled, disabled: lock('edit') }), element('strong', {}, CRITERIA[item.id])),
        field('Вес', input('criterion', item.id, item.weight, { type: 'number', min: 0, max: 100, step: 'any', 'data-id': item.id, 'data-criterion-weight': '', disabled: lock('edit') }))), p(explanations[item.id]))),
      facts([['Редакция критериев', state.criteriaRevision]]), element('span', { class: 'ws-muted', 'data-dirty': '' }),
      p('Сохранение пересчитает все локальные результаты и снимет старые подтверждения. Изменение черновика пока не влияет на баллы.'), submit('Сохранить критерии', lock('edit'))),
      sample && panel('Влияние на выбранный пример', dataText(sample.scenario),
        facts([['Текущий демо-балл', calculateResult(sample, state.criteria).score ?? t('Нет')], ['Балл с черновиком', calculateResult(sample, state.drafts.criteria).score ?? t('Нет')]]), go('К разбору', 10))));
  }

  function moduleAssignment() {
    const issues = readinessIssues(state), scenario = getScenario(state);
    return element('div', {}, grid(panel('Назначение',
      field('Группа', select('assignment', 'groupId', state.assignment.groupId, groupOptions(false), { disabled: lock('conduct') })),
      field('Участник', select('assignment', 'cadetId', state.assignment.cadetId, state.cadets.filter(item => item.groupId === state.assignment.groupId).map(item => [item.id, dataText(item, 'name')]), { disabled: lock('conduct') })),
      field('Сценарий', select('assignment', 'scenarioId', state.assignment.scenarioId, scenarioOptions(), { disabled: lock('conduct') })),
      p('Изменение назначения сбрасывает готовность. Проверки подтверждаются пользователем, подключение шлема не проверяется.')),
      panel('Проверка готовности', Object.entries({ briefing: 'Инструктаж пройден', connection: 'Браузерный клиент готов', space: 'Учебное место безопасно' }).map(([key, label]) => element('label', { class: 'ws-check' }, element('input', { type: 'checkbox', name: 'ready.' + key, 'data-slot': 'ready', 'data-field': key, checked: state.assignment.checks[key], disabled: lock('conduct') }), element('span', {}, label))),
        issues.length ? element('ul', { class: 'ws-issues' }, issues.map(issue => element('li', {}, issue))) : badge('Все локальные проверки выполнены', 'ws-ok'),
        button('Начать занятие', 'start', { class: 'ws-button ws-primary', disabled: issues.length > 0 || lock('conduct') }), visibleActive() && go('Наблюдать', 8))),
      panel('Предпросмотр занятия', row(dataText(scenario), badge('v' + scenario.version)), pointsPreview(scenario), row(go('Методика', 5), go('Материалы', 13))));
  }

  function attemptVisual(attempt) {
    const node = element('div', {class:'ws-scenario-visual'});
    const visual=visualForAttempt(attempt);prefetchScenarioFrame(visual);
    node.innerHTML = renderScenarioVisual(visual, state.language);
    return node;
  }
  function modulePractice() {
    const attempt = visibleActive();
    if (!attempt) return element('div', {}, panel('Нет активной сессии', p('Сначала назначьте участника и пройдите проверки готовности. Завершенные попытки доступны в разборе.'), row(go('Настроить занятие', 6), go('К разбору', 10))), panel('План упражнения', dataText(getScenario(state)), pointsPreview(getScenario(state))));
    const allowed = can(state, 'practice') && (state.profile.role !== 'cadet' || state.profile.cadetId === attempt.cadetId), enabled = allowed && attempt.status === 'running';
    return element('div', {}, panel(dataText(attempt.scenario), row(badge(STATUSES[attempt.status]), rawText(cadetName(attempt.cadetId)), badge('v' + attempt.scenario.version)), attemptStats(attempt),
      attempt.scenario.brief&&p(dataText(attempt.scenario,'brief')),attempt.scenario.role&&p(dataText(attempt.scenario,'role')),
      p('Выполняйте точки по порядку. Каждое действие и пропуск попадают в журнал; повторная запись точки заблокирована.'),
      attemptVisual(attempt),
      p('Отметка фиксирует ручной учебный ответ, а не автоматически распознанное действие. Условия сценария дополняют общую CG-панораму.'),
      button('Открыть сцену', 'open-scene', { disabled: !enabled }), !options.onOpenScene && p('Откроется локальная вводная. Регистрация событий доступна ниже.')),
      panel('Действия в упражнении', element('ol', { class: 'ws-exercise' }, attempt.scenario.points.map((point, index) => {
        const event = attempt.events.find(item => item.pointId === point.id);
        return element('li', {}, element('span', { class: 'ws-point-number' }, String(index + 1).padStart(2, '0')), element('div', {}, element('h4', {}, dataText(point)), p(dataText(point, 'description')), event && badge(event.kind === 'record' ? 'Зафиксировано' : 'Пропущено', event.kind === 'record' ? 'ws-ok' : 'ws-missed')), row(button('Зафиксировать', 'record', { 'data-id': point.id, disabled: !enabled || Boolean(event) }), button('Пропустить', 'skip', { 'data-id': point.id, disabled: !enabled || Boolean(event) })));
      })), row(button('Завершить занятие', 'end', { disabled: !(can(state, 'conduct') || allowed) }), go('Наблюдать', 8))), panel('Журнал текущей попытки', timeline(attempt)));
  }

  function moduleTeacher() {
    const attempt = visibleActive();
    if (!attempt) {
      const recent = visibleAttempts(state).at(-1);
      return element('div', {}, panel('Нет активной сессии', p('Запуск открывается после локальной проверки готовности.'), row(go('Настроить занятие', 6), go('К разбору', 10))), panel('Последние наблюдения', recentRows(visibleAttempts(state))), recent && panel('Журнал завершенной попытки', dataText(recent.scenario), timeline(recent)));
    }
    return element('div', {}, panel('Текущая сессия', row(badge(STATUSES[attempt.status]), rawText(cadetName(attempt.cadetId))), element('h4', {}, dataText(attempt.scenario)), attemptStats(attempt), attemptVisual(attempt),
      row(button(attempt.status === 'paused' ? 'Продолжить' : 'Пауза', attempt.status === 'paused' ? 'resume' : 'pause', { disabled: lock('conduct') }), button('Завершить занятие', 'end', { disabled: lock('conduct') }), go('Практика', 7), go('Открыть экран группы', 9))),
      panel('Журнал текущей попытки', timeline(attempt)), observationPanel(attempt), panel('Комментарий преподавателя', commentForm(attempt), attempt.comments.map(comment => p(commentText(comment), 'ws-document'))),element('details',{class:'ws-panel'},element('summary',{},'Прервать учебную попытку'),p('Завершает только локальную попытку с причиной. Не является аппаратной остановкой шлема.'),form('abort',field('Причина прерывания',area('termination','reason',state.drafts.termination.reason,{required:true,disabled:lock('conduct'),maxlength:180})),submit('Прервать попытку',lock('conduct')))));
  }

  function moduleDisplay() {
    const available = visibleAttempts(state);
    if (!available.length) return panel('Экран группы', empty(), go('Настроить занятие', 6));
    const attempt = available.find(item => item.id === state.displayAttemptId) || available[0];
    return element('div', {}, attemptSelector('display'), panel('Экран группы', p('Общий показ контрольных точек и событий. Это журнал, а не видеотрансляция шлема.'),
      element('div', { class: 'ws-display' }, element('span', { class: 'ws-kicker' }, rawText(groupName(attempt.groupId)), state.preferences.displayNames && rawText(' / ' + cadetName(attempt.cadetId))),
        element('h3', {}, dataText(attempt.scenario)), badge(STATUSES[attempt.status]), attemptStats(attempt), attemptVisual(attempt),
        element('ol', { class: 'ws-passport-points' }, attempt.scenario.points.map(point => {
          const event = attempt.events.find(item => item.pointId === point.id);
          return element('li', {}, dataText(point), ' / ', badge(event ? event.kind === 'record' ? 'Зафиксировано' : 'Пропущено' : 'Ожидает действия'));
        })), timeline(attempt))), row(go('Наблюдать', 8), button('К разбору', 'review-attempt', { 'data-id': attempt.id }), go('Настройки интерфейса', 14)));
  }

  function commentForm(attempt) {
    const node = form('comment', field('Событие', select('comment', 'eventId', state.drafts.comment.eventId, [['', 'Вся попытка'], ...attempt.events.map(event => [event.id, rawText(stamp(event.seconds) + ' / ' + eventTitle(attempt, event))])], { disabled: lock('review') })),
      field('Комментарий', area('comment', 'text', state.drafts.comment.text, { required: true, disabled: lock('review') })), submit('Сохранить комментарий', lock('review')));
    node.dataset.attemptId = attempt.id;
    return node;
  }

  function observationPanel(attempt) {
    const observations = attempt.events.filter(event=>Object.hasOwn(OBSERVATIONS,event.kind));
    const node = form('observation', field('Вид наблюдения',select('observation','kind',state.drafts.observation.kind,Object.entries(OBSERVATIONS),{disabled:lock('review')})),field('Основание наблюдения',area('observation','text',state.drafts.observation.text,{required:true,disabled:lock('review')})),submit('Зафиксировать наблюдение',lock('review')));
    node.dataset.attemptId=attempt.id;
    return panel('Наблюдения по методике',p('Наблюдение требует пояснения. Новая запись снимает прежнее подтверждение; балл автоматически не штрафуется до утверждения методики.'), observations.length ? table(['Вид наблюдения','Время','Основание наблюдения'],observations.map(event=>[t(OBSERVATIONS[event.kind]),stamp(event.seconds),rawText(event.note)])) : p('Наблюдений пока нет.'),node);
  }

  function moduleResults() {
    const available = visibleAttempts(state);
    if (!available.length) return panel('Нет попыток', empty(), go('Настроить занятие', 6));
    const attempt = available.find(item => item.id === state.selectedAttemptId) || available[0], result = calculateResult(attempt, state.criteria);
    return element('div', {}, attemptSelector(), panel(dataText(attempt.scenario),
      row(badge(STATUSES[attempt.status]), rawText(cadetName(attempt.cadetId)), attempt.seeded && badge('Вымышленный пример'),attempt.termination&&badge('Попытка прервана')), attempt.termination&&p(rawText(attempt.termination.reason)),attemptStats(attempt),
      facts([['Редакция критериев', state.criteriaRevision], ['Версия сценария', 'v' + attempt.scenario.version], ['Дата результата', attempt.endedAt ? new Date(attempt.endedAt).toLocaleString(state.language === 'uz' ? 'uz-Latn' : 'ru-RU') : t('Нет')]]),
      row(button('Подтвердить локальный результат', 'confirm', { disabled: lock('review') || attempt.status !== 'ended', 'data-id': attempt.id }), button('Экспорт CSV', 'export-attempt', { disabled: lock('review') || attempt.endedAt === null, 'data-id': attempt.id }), button('Подготовить повтор','prepare-repeat',{'data-id':attempt.id,disabled:lock('conduct')||attempt.endedAt===null||Boolean(state.activeAttemptId)}))),
      observationPanel(attempt), panel('Доказательства по точкам', table(['Контрольная точка', 'Статус', 'Время', 'Наблюдение'], attempt.scenario.points.map(point => {
        const event = attempt.events.find(item => item.pointId === point.id);
        return [dataText(point), t(event ? event.kind === 'record' ? 'Зафиксировано' : 'Пропущено' : 'Не зафиксировано'), event ? stamp(event.seconds) : t('Нет'), dataText(point, 'description')];
      })), table(['Критерий', 'Доля', 'Вес'], state.criteria.map(criterion => [t(CRITERIA[criterion.id]), Math.round(result.fractions[criterion.id] * 100) + '%', criterion.enabled ? criterion.weight : t('Выключен')]))),
      grid(panel('Временная лента', timeline(attempt), result.missing.length ? element('div', { class: 'ws-missing' }, element('h4', {}, 'Не зафиксированы'), element('ul', {}, result.missing.map(point => element('li', {}, dataText(point))))) : badge('Все точки зафиксированы', 'ws-ok')),
        panel('Комментарий', commentForm(attempt), attempt.comments.length ? element('ul', { class: 'ws-comments' }, attempt.comments.map(comment => element('li', {}, p(commentText(comment), ''), p(comment.eventId ? rawText(t('К событию') + ': ' + eventTitle(attempt, attempt.events.find(event => event.id === comment.eventId) || { title: t('Событие') })) : 'Ко всей попытке')))) : p('Комментариев пока нет.'))));
  }

  function moduleAnalytics() {
    const options={period:state.view.analyticsPeriod,cadetId:state.view.analyticsCadet,confirmed:state.view.analyticsStatus==='confirmed',now:Date.now()};
    const data = analytics(state, state.view.analyticsGroup, state.view.analyticsScenario, options), families = [...new Map(state.scenarios.filter(item=>!isLegacyOverview(item)||state.attempts.some(a=>a.scenario.familyId===item.familyId)).map(item => [item.familyId, item])).values()];
    return element('div', {}, row(field('Группа', select('filter', 'analyticsGroup', state.view.analyticsGroup, groupOptions(true))), field('Сценарий', select('filter', 'analyticsScenario', state.view.analyticsScenario, [['', 'Все сценарии'], ...families.map(item => [item.familyId, dataText(item)])])),field('Участник',select('filter','analyticsCadet',state.view.analyticsCadet,[['','Все участники'],...state.cadets.filter(item=>state.profile.role!=='cadet'||item.id===state.profile.cadetId).map(item=>[item.id,dataText(item,'name')])])),field('Период',select('filter','analyticsPeriod',state.view.analyticsPeriod,[['','Весь период'],['7','7 дней'],['30','30 дней'],['90','90 дней']])),field('Статус',select('filter','analyticsStatus',state.view.analyticsStatus,[['','Все завершенные'],['confirmed','Подтверждено']]))),
      element('div', { class: 'ws-stats ws-four' }, [[data.attempts, 'Попыток'], [data.average ?? t('Нет'), 'Средний демо-балл'], [data.confirmed, 'Подтверждено'], [data.duration ?? t('Нет'), 'Среднее время, сек.']].map(([value, title]) => element('div', {}, element('strong', {}, value), element('small', {}, title)))),
      row(badge(t('Участников')+': '+data.participants),badge(t('Повторных попыток')+': '+data.repeated),badge(t('Исходных примеров')+': '+data.seeded)),
      panel('Динамика попыток',p('Каждая полоса соответствует завершенной попытке. Откройте ее разбор, чтобы проверить события, а не только балл.'),data.rows.length?element('ol',{class:'ws-trend'},data.rows.map(({attempt,result})=>element('li',{},button(rawText(new Date(attempt.endedAt).toLocaleDateString(state.language==='uz'?'uz-Latn':'ru-RU')+' / '+cadetName(attempt.cadetId)),'review-attempt',{'data-id':attempt.id}),element('meter',{min:0,max:100,value:result.score??0},result.score??0),element('strong',{},result.score??t('Нет')),badge(attempt.seeded?'Вымышленный пример':STATUSES[attempt.status])))):empty()),
      panel('Повторная практика',data.progress.length?table(['Участник','Сценарий','Попыток','Первая попытка','Последняя попытка','Изменение','Разбор'],data.progress.map(item=>[rawText(cadetName(item.cadetId)),dataText(item.scenario),item.count,item.first??t('Нет'),item.last??t('Нет'),item.first===null||item.last===null?t('Нет'):(item.last-item.first>0?'+':'')+(item.last-item.first),button('К разбору','review-attempt',{'data-id':item.attemptId})])):p('Для сравнения нужны две попытки одного участника в одном сценарии.')),
      panel('История подготовки', p('Средние значения включают только завершенные локальные попытки. Исходные учебные примеры отмечены в разборе.'), data.rows.length ? table(['Участник', 'Группа', 'Сценарий', 'Демо-балл', 'Разбор'], data.rows.map(({ attempt, result }) => [rawText(cadetName(attempt.cadetId)), rawText(groupName(attempt.groupId)), dataText(attempt.scenario), result.score ?? t('Нет'), button('К разбору', 'review-attempt', { 'data-id': attempt.id })])) : empty()),
      grid(panel('По группам', table(['Группа', 'Попыток', 'Подтверждено', 'Средний демо-балл'], state.groups.filter(item => !state.view.analyticsGroup || item.id === state.view.analyticsGroup).map(group => {
        const values = analytics(state, group.id, state.view.analyticsScenario,options);
        return [dataText(group, 'name'), values.attempts, values.confirmed, values.average ?? t('Нет')];
      }))), panel('По сценариям', table(['Сценарий', 'Попыток', 'Средний демо-балл'], families.filter(item => !state.view.analyticsScenario || item.familyId === state.view.analyticsScenario).map(item => {
        const values = analytics(state, state.view.analyticsGroup, item.familyId,options);
        return [dataText(item), values.attempts, values.average ?? t('Нет')];
      })))),
      panel('Наблюдения преподавателя',p('Количество записей, а не автоматически распознанных нарушений.'),facts(Object.entries(OBSERVATIONS).map(([kind,label])=>[label,data.observations[kind]]))),
      panel('Частые пропуски', data.missing.length ? element('ul', { class: 'ws-bars' }, data.missing.map(([title, count]) => {
        const point = data.rows.flatMap(row => row.attempt.scenario.points).find(item => item.title === title);
        return element('li', {}, element('span', {}, point ? dataText(point) : rawText(title)), element('meter', { min: 0, max: Math.max(1, data.attempts), value: count }, count), element('strong', {}, count));
      })) : p(data.attempts ? 'Пропусков в выбранных попытках нет.' : 'Нет данных по выбранному фильтру.')));
  }

  function exchangeMap(kind, id, value, type = 'text') {
    return input('exchange-map', id, value || '', { type, 'data-kind': kind, disabled: lock('review'), maxlength: 120, 'aria-label': t(kind === 'dates' ? 'Дата результата' : 'Внешний учебный ID') });
  }
  function moduleExchange() {
    const exchange = state.exchange, check = validateExchange(state), validated = exchange.validation?.ok && exchange.validation.fingerprint === check.fingerprint && check.ok;
    const tabs = row(...Object.entries(EXCHANGE_TABS).map(([id, title]) => button(title, 'exchange-tab', { 'data-id': id, 'aria-pressed': exchange.tab === id })));
    let contents;
    if (exchange.tab === 'mapping') {
      contents = element('div', {}, panel('Целевая дисциплина пакета', p('Концептуальный выбор: учебная VR-практика. Курс обучения и дисциплина сопоставляются раздельно.'),
        field('ID дисциплины', input('exchange-discipline', 'disciplineId', exchange.disciplineId, { disabled: lock('review'), maxlength: 120 }))), grid(
        panel('Участники', table(['Учебный код', 'ID участника'], state.cadets.filter(item => state.profile.role !== 'cadet' || item.id === state.profile.cadetId).map(item => [rawText(item.code), exchangeMap('students', item.id, exchange.mappings.students[item.id])]))),
        panel('Группы и курсы', table(['Группа', 'ID группы', 'Курс обучения'], state.groups.map(item => [dataText(item, 'name'), exchangeMap('groups', item.id, exchange.mappings.groups[item.id]), rawText(item.course)]))),
        panel('Курсы обучения', table(['Курс обучения', 'ID курса обучения'], [...new Set(state.groups.map(item => item.course))].map(course => [rawText(course), exchangeMap('courses', course, exchange.mappings.courses[course])])))),
        panel('Версии сценариев', table(['Сценарий', 'Версия', 'Внешний учебный ID'], state.scenarios.map(item => [dataText(item), 'v' + item.version, exchangeMap('scenarios', item.id, exchange.mappings.scenarios[item.id])]))),
        row(button('Записи', 'exchange-tab', { 'data-id': 'records' })));
    } else if (exchange.tab === 'records') {
      const rows = exchangeRows(state).filter(row => (!exchange.groupFilter || row.attempt.groupId === exchange.groupFilter) && (exchange.statusFilter === 'all' || exchange.statusFilter === 'confirmed' && row.attempt.status === 'confirmed' || exchange.statusFilter === 'blocked' && (row.attempt.status !== 'confirmed' || Object.values(row.values).some(value => value === '')) || exchange.statusFilter === 'simulated' && exchange.batches.some(batch => batch.records.some(item => item.id === row.id))));
      contents = panel('Выбор записей',
        row(field('Группа', select('exchange-view', 'groupFilter', exchange.groupFilter, groupOptions(true))), field('Статус', select('exchange-view', 'statusFilter', exchange.statusFilter, [['all', 'Все записи'], ['confirmed', 'Подтверждено'], ['blocked', 'Требует исправления'], ['simulated', 'Есть локальная квитанция']]))),
        rows.length ? table(['Выбрать', 'Учебный код', 'Сценарий', 'Статус', 'Дата результата', 'Действия'], rows.map(row => [
          element('input', { type: 'checkbox', name: 'exchange.select.' + row.id, 'data-slot': 'exchange-select', 'data-field': row.id, checked: exchange.selected.includes(row.id), disabled: lock('review'), 'aria-label': t('Выбрать') + ' ' + row.id }),
          rawText(state.cadets.find(item => item.id === row.attempt.cadetId)?.code), dataText(row.attempt.scenario), t(STATUSES[row.attempt.status]), exchangeMap('dates', row.id, row.values.resultDate, 'date'), button('К разбору', 'review-attempt', { 'data-id': row.id })
        ])) : empty(), row(badge(t('Выбрано') + ': ' + exchange.selected.length), button('Проверить записи', 'validate-exchange', { disabled: lock('review') })));
    } else if (exchange.tab === 'validation') {
      contents = panel('Проверка записей', p('Проверяются подтверждение, актуальная редакция, обязательные поля, дата и уникальность ID.'),
        exchange.validation ? badge(validated ? 'Проверка пройдена' : 'Требует исправления', validated ? 'ws-ok' : 'ws-missed') : p('После изменений нужна новая проверка.'),
        check.errors.length ? table(['Попытка', 'Поле', 'Ошибка'], check.errors.map(error => [error.id || t('Пакет'), t(EXCHANGE_FIELDS[error.field] || 'Статус'), t(error.message)])) : p('Блокирующих ошибок нет.'),
        row(button('Проверить записи', 'validate-exchange', { disabled: lock('review') }), button('Предпросмотр', 'exchange-tab', { 'data-id': 'preview' }), button('Сопоставление', 'exchange-tab', { 'data-id': 'mapping' })));
    } else if (exchange.tab === 'preview') {
      const rows = exchangeRows(state, true);
      contents = panel('Предпросмотр пакета',
        element('div', { class: 'ws-field-checks' }, Object.entries(EXCHANGE_FIELDS).map(([key, title]) => element('label', { class: 'ws-check' }, element('input', { type: 'checkbox', name: 'exchange.field.' + key, 'data-slot': 'exchange-field', 'data-field': key, checked: exchange.fields.includes(key), disabled: lock('review') || !['duration', 'criteriaRevision'].includes(key) }), title))),
        rows.length ? table(['Попытка', ...exchange.fields.map(key => EXCHANGE_FIELDS[key])], rows.map(row => [row.id, ...exchange.fields.map(key => rawText(row.values[key]))])) : empty(),
        element('details', {}, element('summary', {}, 'Концептуальная структура данных'), element('pre', { class: 'ws-payload' }, rawText(JSON.stringify({ mode: 'LOCAL SIMULATION', records: rows.map(row => Object.fromEntries(exchange.fields.map(key => [key, row.values[key]]))) }, null, 2)))),
        !validated && p('Сначала успешно проверьте выбранные записи.'),
        row(button('Проверить записи', 'validate-exchange', { disabled: lock('review') }), button('Симулировать локальный пакет', 'simulate-batch', { class: 'ws-button ws-primary', disabled: lock('review') || !validated }), button('Экспорт CSV', 'export-exchange', { disabled: lock('review') || !validated })));
    } else {
      contents = panel('История пакетов', exchange.batches.length ? table(['Пакет', 'Квитанция', 'Статус', 'Записей', 'Повторов', 'Действия'], exchange.batches.slice().reverse().map(batch => [
        batch.id, batch.receipt, element('div', {}, badge('Локальная симуляция завершена'), badge(batch.status)), batch.records.length, batch.retryCount,
        row(button('Квитанция', 'batch-detail', { 'data-id': batch.id }), button('Повторить симуляцию', 'retry-batch', { 'data-id': batch.id, disabled: lock('review') || !validated || batch.fingerprint !== check.fingerprint }))
      ])) : p('Локальных пакетов пока нет.'), p('Повтор идентичного пакета использует прежнюю квитанцию. Скачивание CSV не меняет статус.'));
    }
    return element('div', {}, panel('Интеграционный стенд E-reyting', row(badge('LOCAL SIMULATION'), badge('API не подключен')),
      p('Изолированное демо: сопоставления, пакет и квитанция создаются только локально. Методы и поля концептуальные до согласования реального API; сетевой отправки нет.')),
      element('nav', { class: 'ws-exchange-tabs', 'aria-label': t('Разделы обмена') }, tabs), contents);
  }

  function moduleMaterials() {
    const materials = state.materials.filter(item => (local(item) + ' ' + local(item, 'body')).toLowerCase().includes(state.view.materialSearch.toLowerCase()));
    const passports=state.scenarios.filter(item=>item.conceptId && (local(item)+' '+local(item,'brief')).toLowerCase().includes(state.view.materialSearch.toLowerCase()));
    return element('div', {}, field('Поиск', input('filter', 'materialSearch', state.view.materialSearch, { type: 'search' })),
      element('div', { class: 'ws-catalog' }, materials.length ? materials.map(item => panel(dataText(item), p(rawText(local(item, 'body').slice(0, 180))), button('Открыть документ', 'preview-material', { 'data-id': item.id }), row(go('Подготовка', 6), go(item.id === 'm2' ? 'Методика' : 'Каталог сценариев', item.id === 'm2' ? 5 : 3)))) : empty()),
      panel('Инструктажи по сценариям',p('Вводная, оцениваемые действия и вопросы для разбора связаны с выбранной версией сценария.'),passports.length?passports.map(item=>element('details',{class:'ws-material-passport'},element('summary',{},dataText(item),' / v'+item.version),p(dataText(item,'brief')),pointsPreview(item),p(dataText(item,'debrief')),row(button('Назначить','select-scenario',{'data-id':item.id,disabled:lock('conduct')}),go('Подготовить занятие',6)))):empty()),
      panel('Добавить заметку', p('Пользовательские заметки сохраняются как точный текст и автоматически не переводятся.'), form('add-material', field('Название', draftInput('material', 'title', { required: true, disabled: lock('edit') })), field('Текст заметки', area('material', 'body', state.drafts.material.body, { required: true, disabled: lock('edit') })), submit('Добавить заметку', lock('edit')))));
  }

  function moduleLanguage() {
    return grid(panel('Язык интерфейса', row(button('RU', 'language-ru', { 'aria-pressed': state.language === 'ru' }), button('UZ', 'language-uz', { 'aria-pressed': state.language === 'uz' })),
      p('Язык синхронизируется с основной презентацией. Роль, попытки и введенные тексты сохраняются. Пользовательские данные не переводятся.'),
      field('Плотность интерфейса', select('preference', 'density', state.preferences.density, [['comfortable', 'Обычная'], ['compact', 'Компактная']]))),
      panel('Общий экран и данные', element('label', { class: 'ws-check' }, element('input', { type: 'checkbox', name: 'preference.displayNames', 'data-slot': 'preference', 'data-field': 'displayNames', checked: state.preferences.displayNames }), 'Показывать псевдоним на общем экране'),
        p('По умолчанию общий экран показывает группу без псевдонима. Настройка не меняет журнал и результаты.'), row(go('Открыть экран группы', 9), go('Материалы', 13), button('Сбросить демо', 'reset'))));
  }

  function moduleAdmin() {
    const audit = state.audit.filter(item => (!state.view.auditRole || item.role === state.view.auditRole) && (t(item.action) + ' ' + t(ROLES[item.role])).toLowerCase().includes(state.view.auditSearch.toLowerCase()));
    return element('div', {}, panel('Локальная матрица доступа', p('Это модель ограничений интерфейса, не аутентификация. Подтверждение закреплено за преподавателем, права за администратором. Сценарии доступны только для чтения при любых правах.'),
      table(['Доступ', ...Object.values(ROLES)], Object.entries(CAPABILITIES).map(([cap, label]) => [t(label), ...Object.keys(ROLES).map(role => element('label', { class: 'ws-check ws-matrix-check' }, element('input', { type: 'checkbox', name: 'grant.' + role + '.' + cap, 'data-slot': 'grant', 'data-role': role, 'data-capability': cap, checked: state.grants[role][cap], disabled: lock('manage') || ['review', 'manage'].includes(cap), 'aria-label': t(ROLES[role]) + ': ' + t(label) }), element('span', { class: 'ws-sr' }, t(ROLES[role]) + ': ' + t(label))))]))),
      panel('Журнал действий', row(field('Поиск', input('filter', 'auditSearch', state.view.auditSearch, { type: 'search' })), field('Роль', select('filter', 'auditRole', state.view.auditRole, [['', 'Все роли'], ...Object.entries(ROLES)]))),
        p('Последние 120 локальных изменений. Журнал фиксирует роль и действие, но не секреты.'), audit.length ? table(['Время', 'Роль', 'Действие'], audit.slice().reverse().map(item => [new Date(item.at).toLocaleString(state.language === 'uz' ? 'uz-Latn' : 'ru-RU'), t(ROLES[item.role]), t(item.action)])) : empty()),
      panel('Состояние компонентов', facts([['Хранилище', storageWarning ? t('Только память') : t('Локальный браузер')], ['Клиент', t('Браузерный тренажер')], ['API E-reyting', t('Не подключен')], ['Версия данных', state.version],['Обновлено локально',new Date(state.updatedAt).toLocaleString(state.language==='uz'?'uz-Latn':'ru-RU')]]),p('Копия содержит локальные учебные данные и введенные заметки. Перед скачиванием проверяется ее структура; импорт и перезапись не выполняются.'),button('Скачать копию демо','backup',{disabled:lock('manage')}),button('Сбросить демо', 'reset')));
  }

  function table(headers, rows) {
    return element('div', { class: 'ws-table-wrap', tabindex: 0, role: 'region', 'aria-label': headers.map(t).join(', ') }, element('table', { class: 'ws-table' }, element('thead', {}, element('tr', {}, headers.map(header => element('th', { scope: 'col' }, t(header))))), element('tbody', {}, rows.map(cells => element('tr', {}, cells.map(cell => element('td', {}, cell)))))));
  }

  function stageTo(stage) {
    if (stage === 'practice' && !state.activeAttemptId) {
      dispatch({ type: 'NAVIGATE', id: 6 }, true, 'Для практики завершите проверку готовности и начните занятие.');
    } else if (stage === 'review' && !visibleAttempts(state).length) {
      dispatch({ type: 'NAVIGATE', id: 6 }, true, 'Пока нет доступных попыток. Начните учебное занятие.');
    } else dispatch({ type: 'NAVIGATE', id: stage === 'practice' ? 7 : stage === 'review' ? 10 : 6 });
  }

  function stageButton(id, label, hint, selected) {
    const node = button('', 'stage', { role: 'tab', 'data-stage': id, 'aria-selected': selected, 'aria-label': `${t(label)}. ${t(hint)}`, 'aria-controls': `${prefix}-panel`, tabindex: selected ? 0 : -1, class: `ws-stage ${selected ? 'is-active' : ''}` });
    node.append(icon(id === 'setup' ? 'calendar-days' : id === 'practice' ? 'eye' : 'history'), element('span', { class: 'ws-stage-copy' }, element('strong', {}, t(label)), element('small', {}, t(hint))));
    return node;
  }

  function workspaceHelp(open) {
    return element('div', { class: 'ws-guidance' }, p('Начните с подготовки: выберите группу, сценарий и подтвердите готовность. Затем пройдите практику и разберите события.'),
      element('details', { class: 'ws-help', 'data-help': '', open },
        element('summary', {}, icon('circle-help'), element('span', {}, t('О программе и демо'))),
        element('div', { class: 'ws-help-body' },
          p('Программа объединяет подготовку VR-занятия, действия курсанта и разбор преподавателя. Здесь доступно локальное браузерное демо на вымышленных данных: без настоящего входа, сервера, шлема и отправки оценок.'),
          element('ol', { class: 'ws-help-steps' },
            element('li', {}, go('Настроить занятие', 6), p('Укажите группу, участника и сценарий. Выполните три проверки готовности.')),
            element('li', {}, button('Практика', 'stage', { 'data-stage': 'practice' }), p('Зафиксируйте действия и пропуски. Преподаватель может наблюдать, ставить паузу и завершать занятие.')),
            element('li', {}, button('Разбор', 'stage', { 'data-stage': 'review' }), p('Изучите временную ленту, добавьте комментарий и подтвердите локальный учебный результат.'))),
          p('В каталоге также есть готовые учебные примеры. Изменения сохраняются только в этом браузере; удалить их можно явной кнопкой сброса.'))));
  }

  const renderers = [null, moduleProfile, moduleGroups, moduleCatalog, null, moduleCriteria, moduleAssignment, modulePractice, moduleTeacher, moduleDisplay, moduleResults, moduleAnalytics, moduleExchange, moduleMaterials, moduleLanguage, moduleAdmin];
  function render() {
    if (destroyed) return;
    const focused = frame.contains(doc.activeElement) ? doc.activeElement : null;
    const focusName = focused?.getAttribute('name');
    const focusAction = focused?.getAttribute('data-action');
    const focusModule = focused?.getAttribute('data-module');
    const position = focused && typeof focused.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
    const scrolls = [...frame.querySelectorAll('[data-scroll]')].map(node => [node.dataset.scroll, node.scrollTop]);
    const helpOpen = Boolean(frame.querySelector('[data-help]')?.open);
    const current = clientModules().find(item => item.id === state.view.moduleId);
    const moduleLabel = item => (state.language === 'uz' ? item.uzTitle || t(item.title) : item.title).replace(/^\s*\d+[.)]\s*/, '');
    const stage = current.id >= 7 && current.id <= 9 ? 'practice' : current.id >= 10 && current.id <= 12 ? 'review' : 'setup';
    const attempt = visibleActive();
    frame.lang = state.language === 'uz' ? 'uz' : 'ru';
    frame.dataset.density = state.preferences.density;
    frame.replaceChildren(element('div', { class: 'ws-shell' },
      element('aside', { class: 'ws-sidebar', 'aria-label': t('Модули рабочего пространства'), 'data-scroll': 'sidebar' },
        element('div', { class: 'ws-brand' }, element('img', { class:'ws-client-logo',src:'./assets/university-logo.webp',width:56,height:56,alt:state.language==='uz'?'Universitet gerbi':'Эмблема университета' }), element('span', { class: 'ws-kicker' }, 'УНИВЕРСИТЕТ / VR'), element('strong', {}, t('Учебное пространство')), p('Только на этом устройстве')),
        element('div', { class: 'ws-mobile-nav' }, field('Модуль', select('module', 'id', current.id, WORKSPACE_GROUPS.flatMap(group => group.ids).map(id => [id, moduleLabel(sourceModules.find(item => item.id === id))]), { 'aria-label': t('Выбрать модуль') }))),
        element('nav', { class: 'ws-desktop-nav', 'aria-label': t('Модули рабочего пространства') }, WORKSPACE_GROUPS.map(group => element('section', { class: 'ws-nav-group' }, element('h3', {}, t(group.title)), group.ids.map(id => {
          const node = button('', 'navigate', { class: `ws-nav-link ${current.id === id ? 'is-active' : ''}`, 'data-module': id, 'aria-current': current.id === id ? 'page' : false });
          node.append(icon(WORKSPACE_ICONS[id]), element('span', {}, moduleLabel(sourceModules.find(item => item.id === id))));
          return node;
        })))),
        element('div', { class: 'ws-sidebar-foot' }, badge('Локальное демо'), button('Сбросить демо', 'reset'))),
      element('div', { class: 'ws-main' },
        element('div', { class: 'ws-topbar' }, element('div', {}, element('strong', { class: 'ws-demo-title' }, t('Демо учебного VR-комплекса')), p('14 модулей / вымышленные данные')),
          row(field('Роль', select('profile', 'role', state.profile.role, Object.entries(ROLES))), state.profile.role !== 'teacher' && button('Режим преподавателя', 'teacher', { class: 'ws-button ws-primary' }), element('div', { class: 'ws-language', role: 'group', 'aria-label': t('Язык интерфейса') }, button('RU', 'language-ru', { 'aria-pressed': state.language === 'ru' }), button('UZ', 'language-uz', { 'aria-pressed': state.language === 'uz' })))),
        element('div', { class: 'ws-stages', role: 'tablist', 'aria-label': t('Этапы занятия') }, stageButton('setup', 'Подготовить', 'Группа, сценарий, готовность', stage === 'setup'), stageButton('practice', 'Практика', 'Действия и наблюдение', stage === 'practice'), stageButton('review', 'Разбор', 'События, комментарий, результат', stage === 'review')),
        workspaceHelp(helpOpen),
        element('div', { class: 'ws-statusline' }, attempt ? row(badge(STATUSES[attempt.status]), element('span', {}, rawText(`${cadetName(attempt.cadetId)} / ${local(attempt.scenario)}`)), element('time', { 'data-elapsed': attempt.id }, stamp(elapsedSeconds(attempt, Date.now())))) : row(badge('Активной сессии нет'), element('span', {}, t('Сохраненных попыток'), ': ', visibleAttempts(state).length))),
        element('div', { class: 'ws-content', 'data-scroll': 'content' },
          element('div', { 'data-notice': '', role: 'status', 'aria-live': 'polite', class: 'ws-notice', hidden: true }),
          state.profile.role !== 'teacher' && p('Некоторые действия ограничены текущей ролью. Кнопка «Режим преподавателя» всегда доступна сверху.', 'ws-translation-note'),
          element('section', { id: `${prefix}-panel`, role: 'tabpanel', 'aria-labelledby': `${prefix}-title`, tabindex: 0 },
            element('div', { class: 'ws-module-heading' }, element('div', {}, element('h2', { id: `${prefix}-title` }, moduleLabel(current)), p(current.id === 5 ? 'Редактирование демонстрационных критериев. Утвержденная методика не подключена.' : state.language === 'uz' ? current.uzDescription || t(current.description) : current.description))), renderers[current.id]())))));
    updateNotices();
    for (const [key, value] of scrolls) {
      const target = [...frame.querySelectorAll('[data-scroll]')].find(node => node.dataset.scroll === key);
      if (target) target.scrollTop = value;
    }
    const target = focusName ? [...frame.querySelectorAll('[name]')].find(node => node.name === focusName) : focusAction ? [...frame.querySelectorAll('[data-action]')].find(node => node.dataset.action === focusAction && (!focusModule || node.dataset.module === focusModule)) : null;
    if (target && !target.disabled) {
      target.focus({ preventScroll: true });
      if (position && ['text', 'search', 'textarea'].includes(target.type)) target.setSelectionRange(...position);
    }
  }

  let localDialog = null;
  function showDialog(title, contents, actionButton = null) {
    localDialog?.remove();
    const previousFocus = doc.activeElement;
    const dialog = element('dialog', { class: 'ws-dialog', 'aria-labelledby': `${prefix}-dialog-title` }, element('div', { class: 'ws-dialog-heading' }, element('h3', { id: `${prefix}-dialog-title` }, title), button('Закрыть', 'close-dialog')), contents, actionButton);
    frame.append(dialog);
    localDialog = dialog;
    const close = () => {
      dialog.remove();
      if (localDialog === dialog) localDialog = null;
      if (!destroyed) render();
      const restoredFocus = previousFocus?.isConnected ? previousFocus : [...frame.querySelectorAll('[data-action]')].find(node => node.dataset.action === previousFocus?.dataset.action && node.dataset.id === previousFocus?.dataset.id);
      restoredFocus?.focus({ preventScroll: true });
    };
    dialog.addEventListener('close', close, { once: true, signal });
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); dialog.close(); }, { signal });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }, { signal });
    dialog.showModal();
  }

  function download(csv, filename, mime='text/csv;charset=utf-8') {
    const blob = new win.Blob([csv], { type: mime });
    const url = win.URL.createObjectURL(blob);
    const anchor = element('a', { href: url, download: filename });
    frame.append(anchor);
    anchor.click();
    anchor.remove();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
  }

  let sceneOpening = false;
  frame.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]');
    if (!target || !frame.contains(target) || target.disabled) return;
    const action = target.dataset.action;
    const moduleId = Number(target.dataset.module);
    if (action === 'navigate') {localDialog?.close();dispatch({ type: 'NAVIGATE', id: moduleId });}
    else if (action === 'stage') stageTo(target.dataset.stage);
    else if (action === 'teacher') dispatch({ type: 'PROFILE', role: 'teacher', cadetId: state.profile.cadetId });
    else if (action.startsWith('language-') || action === 'toggle-language') dispatch({ type: 'LANGUAGE', language: action === 'toggle-language' ? state.language === 'ru' ? 'uz' : 'ru' : action.slice(9) });
    else if (action === 'select-scenario') dispatch({ type: 'SELECT_SCENARIO', id: target.dataset.id }, true, 'Сценарий назначения изменен. Подтвердите готовность заново.');
    else if (action === 'exchange-tab') dispatch({ type: 'EXCHANGE_VIEW', field: 'tab', value: target.dataset.id });
    else if (action === 'validate-exchange') dispatch({ type: 'VALIDATE_EXCHANGE' });
    else if (action === 'simulate-batch') dispatch({ type: 'SIMULATE_BATCH' });
    else if (action === 'retry-batch') dispatch({ type: 'RETRY_BATCH', id: target.dataset.id });
    else if (action === 'export-exchange') {
      if (dispatch({ type: 'EXPORT_EXCHANGE' }, true, 'CSV создан локально. Данные никуда не отправлены.')) download(exchangeCSV(state, toCSV, t), 'university-vr-local-simulation.csv');
    } else if (action === 'batch-detail') {
      const batch = state.exchange.batches.find(item => item.id === target.dataset.id);
      if (batch) showDialog(t('Квитанция'), element('div', {}, row(badge('Локальная симуляция завершена'), badge(batch.status)), facts([['Квитанция', batch.receipt], ['Записей', batch.records.length], ['Повторов', batch.retryCount]]), table(['Попытка', ...batch.fields.map(key => EXCHANGE_FIELDS[key])], batch.records.map(item => [item.id, ...batch.fields.map(key => rawText(item.values[key]))]))));
    } else if (action === 'cadet-detail') {
      const cadet = state.cadets.find(item => item.id === target.dataset.id && (state.profile.role !== 'cadet' || state.profile.cadetId === item.id));
      if (cadet) showDialog(dataText(cadet, 'name'), element('div', {}, facts([['Учебный код', rawText(cadet.code)], ['Группа', rawText(groupName(cadet.groupId))]]), recentRows(visibleAttempts(state).filter(item => item.cadetId === cadet.id)), go('Подготовить занятие', 6)));
    }
    else if (action === 'start') dispatch({ type: 'START' });
    else if (action === 'prepare-repeat') dispatch({type:'PREPARE_REPEAT',id:target.dataset.id});
    else if(action==='backup') {
      const checked=restoreDemoState(JSON.stringify(state));
      if(!checked.warning&&dispatch({type:'BACKUP'},true,'Структура копии проверена. Импорт не выполнялся.')) download(JSON.stringify(state,null,2),'university-vr-local-demo.json','application/json');
    }
    else if (action === 'record' || action === 'skip') dispatch({ type: 'EVENT', pointId: target.dataset.id, kind: action });
    else if (action === 'pause' || action === 'resume' || action === 'end') dispatch({ type: action.toUpperCase() });
    else if (action === 'review-attempt') { if (dispatch({ type: 'SELECT_ATTEMPT', id: target.dataset.id }, false)) dispatch({ type: 'NAVIGATE', id: 10 }); }
    else if (action === 'confirm') {
      if (state.selectedAttemptId !== target.dataset.id) dispatch({ type: 'SELECT_ATTEMPT', id: target.dataset.id }, false);
      dispatch({ type: 'CONFIRM' }, true, 'Локальный учебный результат подтвержден. В E-reyting ничего не отправлено.');
    } else if (action === 'open-scene') {
      const attempt = getAttempt(state);
      if (!attempt || sceneOpening) return;
      try {
        workspaceReducer(state, { type: 'OPEN_SCENE', now: Date.now() });
        sceneOpening = true;
        target.disabled = true;
        if (typeof options.onOpenScene === 'function') await options.onOpenScene(attempt.scenario.sceneId, visualForAttempt(attempt));
        else showDialog(dataText(attempt.scenario), element('div', {}, p(SCENES[attempt.scenario.sceneId]), p('Откроется локальная вводная. Регистрация событий доступна ниже.'), pointsPreview(attempt.scenario)));
        if (!destroyed && state.activeAttemptId === attempt.id) dispatch({ type: 'OPEN_SCENE' }, !localDialog);
      } catch { notice = 'Внешнюю сцену открыть не удалось. Используйте встроенную регистрацию событий; повторный запуск не выполнен.'; noticeError = true; updateNotices(); }
      finally { sceneOpening = false; if (target.isConnected) target.disabled = false; }
    } else if (action === 'preview-material') {
      const material = state.materials.find(item => item.id === target.dataset.id);
      if (material) showDialog(dataText(material), element('div', {}, element('div', { class: 'ws-document' }, dataText(material, 'body')), row(go('Подготовить занятие', 6), go('Методика', 5))));
    } else if (action === 'reset') {
      showDialog(t('Сбросить демо'), p('Все локальные изменения, версии, комментарии и новые попытки будут заменены двумя исходными учебными примерами. Другие данные браузера останутся без изменений.'), row(button('Отмена', 'close-dialog'), button('Удалить локальные изменения', 'confirm-reset', { class: 'ws-button ws-primary' })));
    } else if (action === 'confirm-reset') { localDialog?.close(); dispatch({ type: 'RESET' }, true, 'Восстановлены две вымышленные учебные попытки.'); }
    else if (action === 'close-dialog') localDialog?.close();
    else if (action === 'export-attempt') {
      const csv = attemptCSV(state, target.dataset.id);
      if (dispatch({ type: 'EXPORT' }, true, 'CSV создан локально. Данные никуда не отправлены.')) download(csv, 'university-vr-attempt-demo.csv');
    }
  }, { signal });

  const handleField = event => {
    const target = event.target;
    if (!target.dataset.slot) return;
    const slot = target.dataset.slot;
    const key = target.dataset.field;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const isTextInput = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' && target.type !== 'checkbox';
    if (event.type === 'change' && isTextInput || event.type === 'input' && !isTextInput) return;
    if (slot === 'filter') dispatch({ type: 'FILTER', field: key, value });
    else if (slot === 'module') dispatch({ type: 'NAVIGATE', id: Number(value) });
    else if (slot === 'profile') dispatch({ type: 'PROFILE', role: key === 'role' ? value : state.profile.role, cadetId: key === 'cadetId' ? value : state.profile.cadetId });
    else if (slot === 'assignment') dispatch({ type: 'ASSIGN', field: key, value });
    else if (slot === 'ready') dispatch({ type: 'READY', field: key, value });
    else if (slot === 'preference') dispatch({ type: 'PREFERENCE', field: key, value });
    else if (slot === 'exchange-view') dispatch({ type: 'EXCHANGE_VIEW', field: key, value });
    else if (slot === 'exchange-map') dispatch({ type: 'EXCHANGE_MAP', kind: target.dataset.kind, id: key, value }, false);
    else if (slot === 'exchange-discipline') dispatch({ type: 'EXCHANGE_DISCIPLINE', value }, false);
    else if (slot === 'exchange-select') dispatch({ type: 'EXCHANGE_SELECT', id: key, value });
    else if (slot === 'exchange-field') dispatch({ type: 'EXCHANGE_FIELD', id: key, value });
    else if (slot === 'criterion') dispatch({ type: 'CRITERION', id: target.dataset.id, field: target.hasAttribute('data-criterion-weight') ? 'weight' : key, value });
    else if (slot === 'attempt' || slot === 'display') dispatch({ type: slot === 'display' ? 'SELECT_DISPLAY' : 'SELECT_ATTEMPT', id: value });
    else if (slot === 'grant') dispatch({ type: 'SET_GRANT', role: target.dataset.role, capability: target.dataset.capability, value });
    else dispatch({ type: 'DRAFT', slot, field: key, value }, false);
  };
  frame.addEventListener('input', handleField, { signal });
  frame.addEventListener('change', handleField, { signal });
  frame.addEventListener('submit', event => {
    const action = event.target.dataset.form;
    if (!action) return;
    event.preventDefault();
    const types = { 'add-group': 'ADD_GROUP', 'add-cadet': 'ADD_CADET', 'save-criteria': 'SAVE_CRITERIA', comment: 'COMMENT', observation:'OBSERVATION',abort:'ABORT', 'add-material': 'ADD_MATERIAL' };
    dispatch({ type: types[action], ...(['comment','observation'].includes(action) ? { attemptId: event.target.dataset.attemptId } : {}) }, true, action === 'save-criteria' ? 'Критерии сохранены. Баллы пересчитаны; старые подтверждения сняты.' : 'Изменения сохранены на этом устройстве.');
  }, { signal });
  frame.addEventListener('keydown', event => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...frame.querySelectorAll('[role="tab"]')];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const stage = tabs[index].dataset.stage;
    stageTo(stage);
    frame.querySelector(`[data-stage="${stage}"]`)?.focus();
  }, { signal });
  const receive = rawState => {
    const restoredState = restoreDemoState(rawState);
    if (restoredState.warning) { notice = restoredState.warning; noticeError = true; updateNotices(); return; }
    localDialog?.close();
    state = restoredState.state;
    state.language = getLanguage();
    notice = 'Локальные данные обновлены в другой панели или вкладке.';
    noticeError = false;
    notifyParent();
    render();
  };
  win.addEventListener('storage', event => { if (event.key === STORAGE_KEY) receive(event.newValue); }, { signal });
  win.addEventListener('university-vr-workspace-state', event => { if (event.detail?.source !== prefix) receive(JSON.stringify(event.detail.state)); }, { signal });
  const unsubscribeLanguage = subscribeLanguage(language => {
    if (destroyed || state.language === language) return;
    localDialog?.close();
    state = { ...state, language };
    notifyParent();
    render();
  });
  const timer = win.setInterval(() => {
    frame.querySelectorAll('[data-elapsed]').forEach(node => {
      const attempt = getAttempt(state, node.dataset.elapsed);
      if (attempt) node.textContent = stamp(elapsedSeconds(attempt, Date.now()));
    });
  }, 1000);
  render();
  if (!restored.warning && !storageWarning && (raw === null || JSON.stringify(state) !== raw)) save(); else notifyParent();
  updateNotices();
  return {
    openModule(id) {
      if (destroyed) return false;
      localDialog?.close();
      return dispatch({ type: 'NAVIGATE', id: Number(id) });
    },
    getState() { return copy(state); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      localDialog?.close();
      controller.abort();
      unsubscribeLanguage();
      win.clearInterval(timer);
      frame.remove();
      stylesheet.remove();
    }
  };
}
