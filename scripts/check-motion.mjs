import assert from 'node:assert/strict';
import { MOTION, createProposalMotion } from '../motion.js';
import { renderVisualStatus } from '../scenario-visuals.js';

assert.ok(MOTION.close < MOTION.panel && MOTION.panel < MOTION.scene);
assert.ok(MOTION.reveal <= 400 && MOTION.stagger <= 50);
const listeners = new Map();
const preference = { matches: true, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
const doc = { hidden: false, addEventListener() {}, removeEventListener() {} };
const win = { matchMedia: () => preference };
const motion = createProposalMotion(win, doc);
let closed = false;
motion.closeDialog({ open: true, close() { closed = true; } });
assert.equal(closed, true, 'Reduced motion never delays dialog closing');
let rendered = 0;
motion.environment({ querySelector: () => null, contains: () => false }, () => rendered++, 'point');
assert.equal(rendered, 1, 'Reduced motion still renders the new state');
for (let step = 0; step <= 5; step++) {
  const markup = renderVisualStatus({ caseId: 'market-01', points: Array.from({ length: step }, (_, index) => index) });
  assert.ok(markup.includes(`--action-progress:${step / 5}`), 'Progress derives from actual completed actions');
}
motion.destroy();
assert.equal(listeners.size, 0);
console.log(JSON.stringify({ motionTiming: MOTION, reducedMotionClose: true, stateRendering: true, progressStates: 6 }));
