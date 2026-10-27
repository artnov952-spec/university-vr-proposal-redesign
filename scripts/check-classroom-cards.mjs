import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderClassroomPlan } from '../classroom-plan.js';
import { proposalContent } from '../proposal-content.js';
import { renderProposal } from '../proposal-template.js';
import { renderEnvironmentExample, environmentIds } from '../proposal-environments.js';
import { scenarioLibrary } from '../scenario-library.js';
import { PANORAMA_MEDIA } from '../panorama/media.js';
import { createPresentationDemo, renderPresentationDemo } from '../presentation-demo.js';

let exampleStates = 0;
for (const language of ['ru', 'uz']) {
  const plan = renderClassroomPlan(language), content = proposalContent(language);
  assert.deepEqual(Object.keys(content.zones).sort(), ['desks', 'intro', 'screen', 'teacher']);
  assert.equal((plan.match(/data-zone="desks"/g) || []).length, 10);
  assert.equal((plan.match(/data-zone="teacher"/g) || []).length, 1);
  assert.equal((plan.match(/data-zone="screen"/g) || []).length, 1);
  assert.deepEqual([...plan.matchAll(/data-seat="(\d+)"/g)].map(match => +match[1]), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal((plan.match(/class="plan-headset"/g) || []).length, 10);
  const proposal = renderProposal(language);
  assert.doesNotMatch(proposal, /data-zone="(?:practice|storage)"|Хранение и зарядка|Зона VR-практики|VR-amaliyot hududi|Saqlash va quvvatlash/);
  const preparation = renderPresentationDemo({ stage: 1, state: createPresentationDemo(), language });
  assert.ok(preparation.includes(language === 'ru' ? 'Рабочее место готово' : 'Ish joyi tayyor'));
  const thumbs = new Set();
  for (const scene of environmentIds) {
    const html = renderEnvironmentExample(scene, { caseId: scene + '-01', points: [], review: false }, language);
    const sources = [...html.matchAll(/class="case-card-thumb"[^>]*><img src="([^"]+)"/g)].map(match => match[1]);
    assert.equal(sources.length, 5);
    assert.equal(new Set(sources).size, 5);
    sources.forEach(src => thumbs.add(src));
  }
  assert.equal(thumbs.size, 20);
  for (const item of scenarioLibrary) for (let count = 0; count <= 5; count++) {
    const html = renderEnvironmentExample(item.sceneId, { caseId: item.id, points: Array.from({ length: count }, (_, i) => i), review: false }, language);
    assert.equal((html.match(/class="action-copy"/g) || []).length, 5);
    assert.equal((html.match(/<\/em><\/span><small>/g) || []).length, 5, 'Every action has a visible explanation');
    assert.equal((html.match(/environment-action is-done/g) || []).length, count);
    assert.equal((html.match(/environment-action is-current/g) || []).length, count < 5 ? 1 : 0);
    assert.ok(!/undefined|NaN/.test(html));
    exampleStates++;
  }
}
assert.ok(PANORAMA_MEDIA.classroom.src.endsWith('classroom-quality-r13.png'));
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
assert.match(app, /id==='teacher'[\s\S]*data-inline-component="teacher"/);
assert.match(app, /id==='screen'[\s\S]*data-inline-component="display"/);
console.log(JSON.stringify({ classroomStations: 10, distinctRoomControls: 12, caseThumbnails: 20, exampleStates, actionDescriptions: 'all five in every state', languages: 2 }));
