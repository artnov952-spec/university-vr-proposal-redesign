import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PANORAMA_MEDIA } from '../panorama/media.js';
import { SCENE_ORDER, SCENES, constrainView } from '../panorama/scene-data.js';
import { scenarioLibrary } from '../scenario-library.js';
import { renderProposal } from '../proposal-template.js';
import { createPresentationDemo, renderPresentationDemo } from '../presentation-demo.js';
import './check-scenario-visuals.mjs';
import './check-proposal-pages.mjs';
import './check-panorama-only.mjs';
import './check-classroom-cards.mjs';
import './check-sales.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'verification'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      assert.ok(entry.isFile(), 'No symlinks or special files in the publication');
      files.push(path);
    }
  }
}
await walk(root);
let resourceLinks = 0;
async function checkReference(file, value) {
  if (!value || /^(https?:|data:|#|mailto:)/.test(value) || value.includes('${')) return;
  assert.ok(!value.startsWith('/'), `Root-relative URL: ${relative(root, file)}`);
  const target = resolve(dirname(file), decodeURIComponent(value.split(/[?#]/)[0]));
  assert.ok(target.startsWith(root + '/'), 'Resource must stay inside the site');
  assert.ok((await stat(target)).isFile(), `Missing resource: ${relative(root, target)}`);
  resourceLinks++;
}
const forbiddenPaths = /(^|\/)(?:\.openai|\.env(?:\..*)?|SESSION\.md|source-assets|obsidian-import)(?:\/|$)|\.(?:pdf|sqlite|db|session|pem|key)$/i;
for (const file of files) {
  assert.ok(!forbiddenPaths.test(relative(root, file)), 'Private source excluded');
  const extension = extname(file);
  if (!['.js', '.css', '.html', '.txt', '.json', '.md'].includes(extension)) continue;
  const text = await readFile(file, 'utf8');
  if (!file.endsWith('check-site.mjs')) {
    assert.ok(!/\/Users\/|appgprj_|appgdep_|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(text), `Private metadata in ${relative(root, file)}`);
    assert.ok(!/(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i.test(text), `Possible embedded credential in ${relative(root, file)}`);
  }
  if (extension === '.html') for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) await checkReference(file, match[1]);
  if (extension === '.css') for (const match of text.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) await checkReference(file, match[1]);
  if (extension === '.js') for (const match of text.matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/g)) await checkReference(file, match[1]);
}
assert.equal(scenarioLibrary.length, 20);
for (const id of ['courtyard', 'entrance', 'traffic', 'market']) {
  assert.equal(scenarioLibrary.filter(item => item.sceneId === id).length, 5);
}
for (const item of scenarioLibrary) assert.equal(item.points.length, 5);
for (const id of SCENE_ORDER) {
  const media = PANORAMA_MEDIA[id];
  const image = await readFile(resolve(root, media.src));
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), media.width);
  assert.equal(image.readUInt32BE(20), media.height);
  assert.equal(SCENES[id].asset, '.' + media.src);
  const view = constrainView(SCENES[id], { yaw: 999, pitch: 999, zoom: 99 });
  assert.ok(Number.isFinite(view.fov) && view.zoom <= 1.8);
}
for (const language of ['ru', 'uz']) {
  const html = renderProposal(language);
  assert.equal((html.match(/id="expand-workspace"/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(html.includes(PANORAMA_MEDIA.courtyard.preview));
  assert.ok(!html.includes('<video'));
  for (let stage = 0; stage < 8; stage++) {
    assert.ok(renderPresentationDemo({ stage, state: createPresentationDemo(), language }).length > 300);
  }
}
assert.match(await readFile(resolve(root, 'index.html'), 'utf8'), /name="robots" content="noindex,nofollow"/);
console.log(JSON.stringify({ result: 'passed', files: files.length, resourceLinks, panoramas: SCENE_ORDER.length, scenarios: scenarioLibrary.length, languages: 2, inlineStages: 8, scope: 'Static integrity and pure local rendering, not browser or external API proof' }, null, 2));
