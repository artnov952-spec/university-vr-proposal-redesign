// Conceptual local contract only. This module has no transport or credentials.
export const EXCHANGE_TABS = { mapping: 'Сопоставление', records: 'Записи', validation: 'Проверка', preview: 'Предпросмотр', history: 'История пакетов' };
export const EXCHANGE_FIELDS = Object.freeze({ studentId: 'ID участника', groupId: 'ID группы', courseId: 'ID курса обучения', disciplineId: 'ID дисциплины', scenarioVersion: 'Версия сценария', resultDate: 'Дата результата', score: 'Демо-балл', duration: 'Секунды', criteriaRevision: 'Редакция критериев' });
export const REQUIRED_FIELDS = ['studentId', 'groupId', 'courseId', 'disciplineId', 'scenarioVersion', 'resultDate', 'score'];

export function createExchange(attempts = []) {
  return {
    tab: 'mapping', groupFilter: '', statusFilter: 'all', disciplineId: 'LOCAL-DISCIPLINE-VR-PRACTICE', selected: attempts.filter(item => item.status === 'confirmed').map(item => item.id),
    fields: Object.keys(EXCHANGE_FIELDS),
    mappings: { students: { c1: 'LOCAL-STUDENT-01', c2: 'LOCAL-STUDENT-02' }, groups: { g1: 'LOCAL-GROUP-101' }, courses: { '1': 'LOCAL-COURSE-1' }, scenarios: { 'courtyard-v1': 'LOCAL-COURTYARD-v1', 'entrance-v1': 'LOCAL-ENTRANCE-v1' }, dates: Object.fromEntries(attempts.filter(item => item.endedAt !== null).map(item => [item.id, new Date(item.endedAt).toISOString().slice(0, 10)])) },
    validation: null, batches: [], lastReceiptId: null
  };
}

export function exchangeRows(state, selectedOnly = false) {
  const exchange = state.exchange;
  const m = exchange.mappings;
  return state.attempts.filter(item => (state.profile.role !== 'cadet' || item.cadetId === state.profile.cadetId) && (!selectedOnly || exchange.selected.includes(item.id))).map(attempt => {
    const group = state.groups.find(item => item.id === attempt.groupId);
    return { id: attempt.id, attempt, values: { studentId: m.students[attempt.cadetId] || '', groupId: m.groups[attempt.groupId] || '', courseId: m.courses[group?.course] || '', disciplineId: exchange.disciplineId || '', scenarioVersion: m.scenarios[attempt.scenario.id] || '', resultDate: m.dates[attempt.id] || '', score: attempt.confirmation?.score ?? '', duration: attempt.endedAt === null ? '' : Math.max(0, Math.floor((attempt.endedAt - attempt.startedAt - attempt.pausedMs) / 1000)), criteriaRevision: state.criteriaRevision } };
  });
}

export function validateExchange(state) {
  const rows = exchangeRows(state, true);
  const errors = [];
  if (!rows.length) errors.push({ id: '', code: 'empty', message: 'Выберите хотя бы одну запись.' });
  if (rows.length !== state.exchange.selected.length) errors.push({ id: '', code: 'unavailable', message: 'Выбранная запись недоступна.' });
  if (!REQUIRED_FIELDS.every(key => state.exchange.fields.includes(key))) errors.push({ id: '', code: 'fields', message: 'Обязательные поля нельзя исключить.' });
  for (const row of rows) {
    const attempt = row.attempt;
    if (attempt.status !== 'confirmed' || !attempt.confirmation || attempt.confirmation.criteriaRevision !== state.criteriaRevision || !Number.isFinite(attempt.confirmation.score)) errors.push({ id: row.id, code: 'confirmation', message: 'Результат не подтвержден в текущей редакции.' });
    for (const key of REQUIRED_FIELDS.filter(key => key !== 'score')) {
      if (!String(row.values[key]).trim()) errors.push({ id: row.id, code: key, message: 'Не заполнено сопоставление.', field: key });
    }
    const date = row.values.resultDate;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) errors.push({ id: row.id, code: 'date', message: 'Укажите корректную дату результата.' });
    if (attempt.endedAt === null) errors.push({ id: row.id, code: 'unfinished', message: 'Сначала завершите попытку.' });
  }
  // External identities must not collapse distinct local entities.
  for (const [kind, localKey, externalKey] of [['students', 'cadetId', 'studentId'], ['groups', 'groupId', 'groupId'], ['scenarios', 'scenario', 'scenarioVersion']]) {
    const seen = new Map();
    for (const row of rows) {
      const value = row.values[externalKey];
      const local = kind === 'scenarios' ? row.attempt.scenario.id : row.attempt[localKey];
      if (value && seen.has(value) && seen.get(value) !== local) errors.push({ id: row.id, code: 'collision', message: 'Разные записи сопоставлены с одним внешним ID.', field: externalKey });
      if (value) seen.set(value, local);
    }
  }
  return { ok: !errors.length, errors, rows, fingerprint: exchangeFingerprint(state) };
}

export function exchangeFingerprint(state) {
  // Canonical payload, not a security hash. Language, UI filters and order do not change identity.
  return JSON.stringify({ fields: state.exchange.fields.slice().sort(), rows: exchangeRows(state, true).map(row => ({ id: row.id, values: row.values, status: row.attempt.status, confirmedAt: row.attempt.confirmation?.at ?? null })).sort((a, b) => a.id.localeCompare(b.id)) });
}

export function exchangeCSV(state, toCSV, label = value => value) {
  const validation = validateExchange(state);
  if (!validation.ok || state.exchange.validation?.fingerprint !== validation.fingerprint || !state.exchange.validation.ok) throw new Error('Сначала успешно проверьте выбранные записи.');
  return toCSV([
    ['LOCAL SIMULATION', ...state.exchange.fields.map(key => label(EXCHANGE_FIELDS[key]))],
    ...validation.rows.map(row => [row.id, ...state.exchange.fields.map(key => row.values[key])])
  ]);
}
