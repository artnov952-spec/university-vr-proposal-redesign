import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENE_ORDER, SCENES, resolveViewMode, fullscreenViewMode, constrainView } from '../panorama/scene-data.js';
import { COPY, translate } from '../panorama/locale.js';

const modes = [undefined, null, '', 'original', 'panorama', 'unknown'];
for (const mode of modes) {
  for (const engine of ['panorama', 'flat', 'unavailable']) {
    assert.equal(resolveViewMode(mode, engine, 'original'), 'panorama');
  }
  for (const before of [false, true]) for (const after of [false, true]) {
    assert.equal(fullscreenViewMode(mode, before, after), 'panorama');
  }
}
const html = await readFile(new URL('../panorama/viewer.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../panorama/viewer.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../panorama/panorama.css', import.meta.url), 'utf8');
assert.doesNotMatch(html + js + css, /mode-original|mode-panorama|flat-preview|originalQuality|originalHelp|fullFrame/);
assert.doesNotMatch(js, /(?:mode|engine)\s*=\s*['"](?:original|flat)['"]/);
assert.match(js, /url\.searchParams\.delete\('mode'\)/, 'Old mode links are canonicalized');
assert.match(js, /state\.engine = 'unavailable'; state\.status = 'error'/, 'No flat fallback on WebGL failure');
for (const id of ['zoom-in', 'zoom-out', 'reset', 'auto', 'fullscreen']) assert.ok(html.includes(`id="${id}"`));
for (const language of ['ru', 'uz']) {
  assert.ok(!Object.hasOwn(COPY[language], 'originalMode'));
  assert.ok(!Object.hasOwn(COPY[language], 'flatHelp'));
  for (const key of ['webglUnavailable', 'webglLost']) assert.ok(translate(language, key).length > 40);
}
for (const id of SCENE_ORDER) for (const aspect of [390 / 600, 1440 / 900, 2560 / 1440]) {
  const view = constrainView(SCENES[id], { yaw: 999, pitch: -999, zoom: 1.4 }, aspect);
  assert.ok(view.yaw >= view.limits.yawMin && view.yaw <= view.limits.yawMax);
  assert.ok(view.pitch >= view.limits.pitchMin && view.pitch <= view.limits.pitchMax);
}
console.log(JSON.stringify({ panoramaOnly: true, legacyModeInputs: modes.length, fullscreenTransitions: 24, scenes: SCENE_ORDER.length, languages: 2 }));
