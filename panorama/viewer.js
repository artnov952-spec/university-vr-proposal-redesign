import { SCENES, SCENE_ORDER, getScene, constrainView, directionAt, projectHotspot, inspectDimensions, clamp, resolveViewMode, fullscreenViewMode } from './scene-data.js?v=sales20261027-r7local';
import { LANGUAGES, normalizeLanguage, translate, localizeScene, applyViewerLanguage } from './locale.js?v=sales20261027-r7local';
import { normalizeVisualContext, scenarioVisualState, loadScenarioFrame } from '../scenario-visuals.js?v=sales20261027-r7local';

export const normalizeTheme = () => 'light';

export function readParentCommand(event, parentWindow, origin) {
  if (!event || !parentWindow || typeof origin !== 'string' || !origin || origin === 'null' || event.origin !== origin || event.source !== parentWindow) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.hasOwn(data, 'type')) return null;
  if (data.type === 'university-panorama:theme' && Object.hasOwn(data, 'theme') && ['light', 'dark'].includes(data.theme)) return { type: 'theme', theme: normalizeTheme(data.theme) };
  if (data.type === 'university-panorama:set-scene' && Object.hasOwn(data, 'sceneId') && SCENE_ORDER.includes(data.sceneId)) return { type: 'scene', sceneId: data.sceneId };
  if (data.type === 'university-panorama:language' && Object.hasOwn(data, 'language') && LANGUAGES.includes(data.language)) return { type: 'language', language: data.language };
  if (data.type === 'university-panorama:scenario') {
    const context=normalizeVisualContext(data);
    return context ? {type:'scenario',context} : null;
  }
  for (const type of ['suspend', 'resume', 'dispose']) if (data.type === `university-panorama:${type}`) return { type };
  return null;
}

export function postToParent(message, { self = window, parentWindow = window.parent, origin = location.origin } = {}) {
  try {
    if (parentWindow === self || origin === 'null' || parentWindow.location.origin !== origin) return false;
    parentWindow.postMessage(message, origin); return true;
  } catch { return false; }
}

function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    const clean = () => { image.onload = image.onerror = null; signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); image.removeAttribute('src'); reject(new DOMException('Aborted', 'AbortError')); };
    image.onload = () => { clean(); resolve(image); };
    image.onerror = () => { clean(); reject(new Error('Image unavailable')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    image.src = url;
  });
}

/** Partial spherical image preview. Coordinates never translate or imply a room.
 * Options: sceneId, language, hotspotLayer, reducedMotion,
 * onChange(state), onInfo(anchor), onMount(api) before the initial image loads.
 * API getState(): mode is always panorama; engine is WebGL availability.
 * Native dimensions never imply added source detail.
 * Parent suspend/resume must bracket hidden embeds; dispose is terminal on close.
 */
export async function mountPanorama(canvas, options = {}) {
  if (!canvas?.parentElement) throw new TypeError('mountPanorama requires a mounted canvas');
  const host = canvas.parentElement, listener = new AbortController();
  let language = normalizeLanguage(options.language), warningKeys = [], messageKey = 'preparing', messageValues = {}, messageHotspotId;
  const text = (key, values) => translate(language, key, values);
  const reduced = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = options.hotspotLayer || Object.assign(document.createElement('div'), { className: 'hotspots' });
  if (!options.hotspotLayer) host.append(layer);
  let THREE, renderer, scene, camera, mesh, geometry, material, texture, image;
  let scenarioContext = normalizeVisualContext(options.scenarioContext);
  let disposed = false, requestId = 0, imageRequest, animation, autoFrame = 0, lastStamp = null, autoDirection = 1;
  let width = 1, height = 1, requestedScene = SCENE_ORDER.includes(options.sceneId) ? options.sceneId : 'courtyard';
  const suspensionReasons = new Set(document.hidden ? ['document'] : []);
  const state = { sceneId: requestedScene, pendingId: null, status: 'loading', engine: 'panorama',
    mode: resolveViewMode(options.mode), suspended: suspensionReasons.size > 0,
    yaw: 0, pitch: 0, zoom: 1, autoRotate: false, reducedMotion: reduced,
    nativeWidth: null, nativeHeight: null, aspectValid: null, warning: '', message: '' };
  let config = getScene(requestedScene), hotspotButtons = [], hotspotEvents = new AbortController();
  const notify = () => { if (!disposed) options.onChange?.(getState()); };
  const getState = () => ({ ...state, language, scenario: scenarioVisualState(scenarioContext)?.sceneId === state.sceneId ? {caseId:scenarioContext.caseId,step:scenarioVisualState(scenarioContext).step} : null,
    warning: warningKeys.map(key => text(key)).join(' '),
    message: messageHotspotId ? localizeScene(config, language).hotspots.find(anchor => anchor.id === messageHotspotId)?.description || '' : messageKey ? text(messageKey, messageValues) : '',
    angle: config.angle, verticalAngle: config.verticalAngle, wrap: config.wrap,
    anchorsCalibrated: config.hotspots.every(h => h.calibrated),
    fov: constrainView(config, state, width / height).fov, label: localizeScene(config, language).label,
    limits: { ...constrainView(config, state, width / height).limits }, width, height });
  try {
    THREE = await import('three');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#172c36');
    camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  } catch {
    state.engine = 'unavailable'; state.status = 'error'; canvas.hidden = true;
    messageKey = 'webglUnavailable';
  }
  function syncView() {
    const next = constrainView(config, state, width / height);
    Object.assign(state, { yaw: next.yaw, pitch: next.pitch, zoom: next.zoom });
    if (camera) {
      camera.fov = next.fov; camera.aspect = width / height; camera.updateProjectionMatrix();
      camera.position.set(0, 0, 0); camera.lookAt(...directionAt(state.yaw, state.pitch)); camera.updateMatrixWorld(true);
    }
    return next;
  }
  function draw() {
    if (disposed) return;
    host.dataset.viewMode = state.mode;
    canvas.hidden = state.engine !== 'panorama';
    const view = syncView();
    if (renderer && !state.suspended && state.engine === 'panorama') renderer.render(scene, camera);
    for (const { button, anchor } of hotspotButtons) {
      const p = projectHotspot(anchor, { ...state, fov: view.fov }, width, height, 70);
      button.hidden = state.suspended || state.engine !== 'panorama' || state.status !== 'ready' || !p.visible;
      if (!button.hidden) { button.style.left = `${p.x}px`; button.style.top = `${p.y}px`; }
    }
  }
  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width || host.clientWidth); height = Math.max(1, rect.height || host.clientHeight);
    if (state.engine === 'panorama' && !state.suspended) renderer?.setSize(Math.round(width), Math.round(height), false);
    draw(); notify();
  }
  function setView(value) { if (disposed) return; const next = constrainView(config, { ...state, ...value }, width / height); Object.assign(state, { yaw: next.yaw, pitch: next.pitch, zoom: next.zoom }); draw(); notify(); }
  function zoom(delta) { if (state.engine === 'panorama' && state.mode === 'panorama') setView({ zoom: state.zoom + delta }); }
  function reset() { setAutoRotate(false); setView({ yaw: config.initialYaw, pitch: config.initialPitch, zoom: 1 }); }
  function clearPointers() {
    for (const id of pointers.keys()) if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    pointers.clear(); previous = pinch = null; canvas.classList.remove('is-dragging');
  }
  function setMode(value) { return resolveViewMode(value); }
  function setSuspended(reason, value) {
    if (disposed) return;
    if (value) suspensionReasons.add(reason); else suspensionReasons.delete(reason);
    const next = suspensionReasons.size > 0;
    if (state.suspended === next) return;
    state.suspended = next;
    if (next) {
      clearPointers(); animation?.cancel(); animation = null; canvas.style.opacity = '1';
      setAutoRotate(false);
    }
    resize();
  }
  function autoTick(stamp) {
    if (document.hidden) { setSuspended('document', true); return; }
    if (!state.autoRotate || state.suspended || disposed) return;
    if (lastStamp !== null) {
      const bounds = constrainView(config, state, width / height).limits;
      let yaw = state.yaw + autoDirection * Math.min(.1, (stamp - lastStamp) / 1000) * 2;
      if (yaw >= bounds.yawMax || yaw <= bounds.yawMin) { autoDirection *= -1; yaw = clamp(yaw, bounds.yawMin, bounds.yawMax); }
      setView({ yaw });
    }
    lastStamp = stamp;
    if (state.autoRotate && !state.suspended && !disposed) autoFrame = requestAnimationFrame(autoTick);
  }
  function setAutoRotate(value) {
    if (disposed) return;
    state.autoRotate = Boolean(value) && !document.hidden && !state.suspended && !state.reducedMotion && state.mode === 'panorama' && state.engine === 'panorama' && state.status === 'ready';
    cancelAnimationFrame(autoFrame); lastStamp = null;
    if (state.autoRotate) autoFrame = requestAnimationFrame(autoTick);
    notify();
  }
  function makeHotspots() {
    hotspotEvents.abort(); hotspotEvents = new AbortController();
    layer.replaceChildren(); hotspotButtons = [];
    for (const anchor of localizeScene(config, language).hotspots) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'hotspot'; button.textContent = anchor.label;
      button.setAttribute('aria-label', anchor.label); button.dataset.hotspot = anchor.id; button.hidden = true;
      button.addEventListener('focus', () => setAutoRotate(false), { signal: hotspotEvents.signal });
      button.addEventListener('click', () => {
        if (anchor.target) setScene(anchor.target);
        else {
          setAutoRotate(false); messageHotspotId = anchor.id; notify();
          if (anchor.info) options.onInfo?.({ ...anchor.info, trigger: button, sceneId: config.id });
        }
      }, { signal: hotspotEvents.signal });
      layer.append(button); hotspotButtons.push({ button, anchor });
    }
  }
  function setLanguage(value) {
    if (disposed) return language;
    language = normalizeLanguage(value, language);
    const localized = localizeScene(config, language);
    for (const { button, anchor } of hotspotButtons) {
      const label = localized.hotspots.find(item => item.id === anchor.id).label;
      button.textContent = label; button.setAttribute('aria-label', label);
    }
    notify(); return language;
  }
  async function fade(surface, from, to, duration, token) {
    if (state.suspended || state.reducedMotion || !surface.animate) { surface.style.opacity = String(to); return; }
    const own = surface.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease-out', fill: 'forwards' });
    animation = own;
    await own.finished.catch(() => {});
    if (animation === own) { if (token === requestId) surface.style.opacity = String(to); own.cancel(); animation = null; }
  }
  async function setScene(id, preserveView = false) {
    if (disposed || state.engine !== 'panorama') return false;
    const previousView = {yaw:state.yaw,pitch:state.pitch,zoom:state.zoom};
    if (id !== requestedScene) scenarioContext = null;
    const next = getScene(id), token = ++requestId; requestedScene = id;
    imageRequest?.abort(); imageRequest = new AbortController();
    animation?.cancel(); animation = null; canvas.style.opacity = '1';
    clearPointers(); setAutoRotate(false); state.pendingId = id; state.status = 'loading';
    messageKey = 'loadingImage'; messageHotspotId = null; draw(); notify();
    try {
      const url = new URL(next.asset, import.meta.url);
      if (url.origin !== location.origin) throw new Error('Only same-origin image assets are allowed');
      const loaded = await loadImage(url.href, imageRequest.signal);
      const dimensions = inspectDimensions(loaded.naturalWidth, loaded.naturalHeight);
      const visual = scenarioVisualState(scenarioContext);
      const rendered = visual?.sceneId === id ? await loadScenarioFrame(loaded, scenarioContext) : loaded;
      if (disposed || token !== requestId) return false;
      if (image) await fade(canvas, 1, 0, 100, token);
      if (disposed || token !== requestId || state.engine !== 'panorama') return false;
      config = next; image = loaded;
      if (state.engine === 'panorama') {
        const nextGeometry = new THREE.SphereGeometry(50, 128, 64, 0, next.angle * Math.PI / 180,
          (90 - next.verticalAngle / 2) * Math.PI / 180, next.verticalAngle * Math.PI / 180);
        nextGeometry.scale(-1, 1, 1); nextGeometry.rotateY((next.angle * Math.PI / 180 + Math.PI) / 2);
        const nextTexture = new THREE.Texture(rendered); nextTexture.colorSpace = THREE.SRGBColorSpace; nextTexture.needsUpdate = true;
        nextTexture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
        const nextMaterial = new THREE.MeshBasicMaterial({ map: nextTexture });
        if (mesh) scene.remove(mesh);
        texture?.dispose(); material?.dispose(); geometry?.dispose();
        texture = nextTexture; material = nextMaterial; geometry = nextGeometry; mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
      }
      warningKeys = dimensions.aspectValid ? [] : ['aspectWarning'];
      if (renderer && Math.max(dimensions.width, dimensions.height) > renderer.capabilities.maxTextureSize) warningKeys.push('textureWarning');
      messageKey = ''; messageHotspotId = null;
      Object.assign(state, { sceneId: id, pendingId: null, status: 'ready', nativeWidth: dimensions.width, nativeHeight: dimensions.height,
        aspectValid: dimensions.aspectValid, ...(preserveView ? previousView : {yaw:next.initialYaw,pitch:next.initialPitch,zoom:1}) });
      makeHotspots(); draw(); notify(); await fade(canvas, 0, 1, 180, token); return !disposed && token === requestId;
    } catch (error) {
      if (disposed || token !== requestId || error.name === 'AbortError') return false;
      Object.assign(state, { pendingId: null, status: 'error' });
      messageKey = 'loadError'; messageValues = { asset: next.asset.split('/').pop() }; messageHotspotId = null;
      draw(); notify(); return false;
    }
  }
  async function setScenario(value) {
    const context=normalizeVisualContext(value), visual=scenarioVisualState(context);
    if (!context || visual.sceneId !== requestedScene || disposed) return false;
    if (JSON.stringify(context) === JSON.stringify(scenarioContext)) return true;
    scenarioContext=context;
    return setScene(requestedScene,true);
  }
  const pointers = new Map(); let previous, pinch;
  canvas.addEventListener('pointerdown', e => {
    if (state.suspended || state.mode !== 'panorama' || state.engine !== 'panorama' || state.status !== 'ready') return;
    setAutoRotate(false); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); previous = { x: e.clientX, y: e.clientY }; canvas.classList.add('is-dragging');
    if (pointers.size === 2) { const p = [...pointers.values()]; pinch = { distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), zoom: state.zoom }; }
  }, { signal: listener.signal });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const p = [...pointers.values()], distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinch.distance > 0) setView({ zoom: pinch.zoom * distance / pinch.distance });
    } else if (pointers.size === 1 && previous) {
      const speed = getState().fov / height;
      setView({ yaw: state.yaw - (e.clientX - previous.x) * speed, pitch: state.pitch + (e.clientY - previous.y) * speed });
    }
    previous = { x: e.clientX, y: e.clientY };
  }, { signal: listener.signal });
  function release(e) { pointers.delete(e.pointerId); pinch = null; previous = pointers.values().next().value; if (!pointers.size) canvas.classList.remove('is-dragging'); }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, release, { signal: listener.signal });
  canvas.addEventListener('wheel', e => { if (state.suspended || state.mode !== 'panorama' || state.status !== 'ready') return; e.preventDefault(); setAutoRotate(false); zoom(-clamp(e.deltaY, -100, 100) * .0015); }, { passive: false, signal: listener.signal });
  canvas.addEventListener('keydown', e => {
    if (state.suspended || state.mode !== 'panorama' || state.status !== 'ready') return;
    const step = e.shiftKey ? 10 : 4;
    const keys = { ArrowLeft: { yaw: state.yaw - step }, ArrowRight: { yaw: state.yaw + step }, ArrowUp: { pitch: state.pitch + step }, ArrowDown: { pitch: state.pitch - step } };
    if (keys[e.key]) { e.preventDefault(); setAutoRotate(false); setView(keys[e.key]); }
    else if (['+', '=', '-', 'Home'].includes(e.key)) { e.preventDefault(); setAutoRotate(false); if (e.key === 'Home') reset(); else zoom(e.key === '-' ? -.1 : .1); }
  }, { signal: listener.signal });
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); clearPointers(); state.engine = 'unavailable'; state.status = 'error'; state.pendingId = null;
    requestId++; imageRequest?.abort(); setAutoRotate(false);
    animation?.cancel(); animation = null; canvas.style.opacity = '1';
    warningKeys = []; messageKey = 'webglLost'; messageHotspotId = null; draw(); notify();
  }, { signal: listener.signal });
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', e => { state.reducedMotion = e.matches; if (e.matches) { animation?.cancel(); canvas.style.opacity = '1'; setAutoRotate(false); } notify(); }, { signal: listener.signal });
  const observer = new ResizeObserver(resize); observer.observe(host);
  document.addEventListener('visibilitychange', () => setSuspended('document', document.hidden), { signal: listener.signal });
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    const entry = entries.find(item => item.target === host);
    if (entry) setSuspended('viewport', !entry.isIntersecting);
  }) : null;
  visibilityObserver?.observe(host);
  function dispose() {
    if (disposed) return; disposed = true; requestId++; imageRequest?.abort(); animation?.cancel();
    state.autoRotate = false; state.suspended = true;
    cancelAnimationFrame(autoFrame); observer.disconnect(); visibilityObserver?.disconnect(); listener.abort(); hotspotEvents.abort(); clearPointers(); layer.replaceChildren();
    texture?.dispose(); material?.dispose(); geometry?.dispose(); renderer?.dispose(); scene?.clear();
    if (!options.hotspotLayer) layer.remove(); image = null;
  }
  const api = { setScene, setScenario, setView, setMode, zoom, reset, setAutoRotate, setLanguage, resize, dispose, getState,
    suspend: () => setSuspended('parent', true), resume: () => setSuspended('parent', false), retry: () => setScene(requestedScene) };
  options.onMount?.(api);
  resize(); await setScene(requestedScene);
  return api;
}

export async function bootViewer() {
  const $ = id => document.getElementById(id), query = new URLSearchParams(location.search);
  const selected = SCENE_ORDER.includes(query.get('scene')) ? query.get('scene') : 'courtyard';
  const initialVisual = normalizeVisualContext({caseId:query.get('case'),points:query.get('points') ? query.get('points').split(',').map(Number) : []});
  let queuedVisual = initialVisual;
  const embed = query.get('embed') === '1', events = new AbortController();
  if (query.has('mode')) { const url = new URL(location.href); url.searchParams.delete('mode'); history.replaceState(null, '', url); }
  let language = normalizeLanguage(query.get('lang')), moduleStatusKey = '', fullscreenDenied = false, disposed = false, viewerReady = false;
  let api, mountLanguage, disposeWorld, parentSuspended = false, lastAnnouncement = '', sentId, queuedScene, infoReturnFocus, infoScene;
  const text = (key, values) => translate(language, key, values);
  const panel = $('teaching-info');
  function setTheme(value) {
    const theme = normalizeTheme(value);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = 'light'; return theme;
  }
  setTheme(query.get('theme'));
  applyViewerLanguage(document, language);
  $('current-label').textContent = localizeScene(getScene(selected), language).label;
  function closeInfo() { if (panel.open) panel.close(); }
  function disposeViewer() { if (disposed) return; disposed = true; events.abort(); closeInfo(); infoReturnFocus = null; disposeWorld?.(); }
  window.addEventListener('pagehide', disposeViewer, { once: true, signal: events.signal });
  function openInfo(info) {
    if (info.kind !== 'teaching' || info.moduleId !== 8) return;
    infoReturnFocus = info.trigger; infoScene = info.sceneId; moduleStatusKey = ''; $('module-status').textContent = '';
    if (!panel.open) panel.showModal(); $('info-close').focus({ preventScroll: true });
  }
  $('info-close').addEventListener('click', closeInfo, { signal: events.signal });
  panel.addEventListener('close', () => {
    if (infoReturnFocus?.isConnected && !infoReturnFocus.hidden) infoReturnFocus.focus({ preventScroll: true });
    else $('panorama-canvas').focus({ preventScroll: true });
    infoReturnFocus = null;
  }, { signal: events.signal });
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const r = panel.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeInfo();
  }, { signal: events.signal });
  panel.addEventListener('cancel', event => { event.preventDefault(); closeInfo(); }, { signal: events.signal });
  $('open-module').addEventListener('click', () => {
    const sent = postToParent({ type: 'university-panorama:module', moduleId: 8 });
    moduleStatusKey = sent ? 'moduleSent' : 'moduleStandalone';
    $('module-status').textContent = text(moduleStatusKey);
  }, { signal: events.signal });
  // Parent commands also work while the renderer or initial image is loading.
  window.addEventListener('message', event => {
    const command = readParentCommand(event, parent, location.origin);
    if (!command) return;
    if (command.type === 'theme') setTheme(command.theme);
    if (command.type === 'language') setLanguage(command.language);
    if (command.type === 'scenario') { queuedVisual=command.context; if(api) api.setScenario(command.context); }
    if (command.type === 'suspend') { parentSuspended = true; api?.suspend(); }
    if (command.type === 'resume') { parentSuspended = false; api?.resume(); }
    if (command.type === 'dispose') disposeViewer();
    if (command.type === 'scene') {
      closeInfo(); if (viewerReady) api.setScene(command.sceneId); else queuedScene = command.sceneId;
    }
  }, { signal: events.signal });
  const cards = new Map();
  for (const [index, id] of SCENE_ORDER.entries()) {
    const config = localizeScene(SCENES[id], language), button = document.createElement('button'); button.type = 'button'; button.className = 'scene-card';
    button.dataset.scene = id; button.setAttribute('aria-label', text('openScene', { label: config.label }));
    if (!embed) {
      const thumb = new Image(); thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
      thumb.onerror = () => { thumb.hidden = true; }; thumb.src = new URL(config.asset, import.meta.url).href; button.append(thumb);
    }
    for (const [text, className] of [[String(index + 1).padStart(2, '0'), 'scene-number'], [config.label, 'scene-name'], ['', 'scene-dot']]) {
      const span = document.createElement('span'); span.className = className; span.textContent = text; if (!text) span.setAttribute('aria-hidden', 'true'); button.append(span);
    }
    button.addEventListener('click', () => api?.setScene(id), { signal: events.signal }); $('scene-gallery').append(button); cards.set(id, button);
  }
  function updateFullscreen() {
    const active = Boolean(document.fullscreenElement);
    $('fullscreen').setAttribute('aria-pressed', String(active));
    $('fullscreen').textContent = text(active ? 'exitFullscreen' : 'fullscreen');
    return active;
  }
  function setLanguage(value) {
    if (disposed) return language;
    const restoreFullscreenError = fullscreenDenied;
    language = normalizeLanguage(value, language);
    applyViewerLanguage(document, language);
    for (const [id, button] of cards) {
      const label = localizeScene(getScene(id), language).label;
      button.querySelector('.scene-name').textContent = label;
      button.setAttribute('aria-label', text('openScene', { label }));
    }
    $('module-status').textContent = moduleStatusKey ? text(moduleStatusKey) : '';
    updateFullscreen();
    if (api) mountLanguage(language);
    else $('current-label').textContent = localizeScene(getScene(selected), language).label;
    if (restoreFullscreenError) { fullscreenDenied = true; $('asset-note').textContent = text('fullscreenError'); }
    return language;
  }
  function update(state) {
    const visual=state.status==='ready' && state.scenario ? scenarioVisualState({caseId:state.scenario.caseId,points:Array.from({length:state.scenario.step},(_,i)=>i)}) : null;
    $('scenario-note').hidden=!visual;
    if(visual) $('scenario-note').textContent=(language==='uz'?visual.item.uzTitle:visual.item.title)+' · '+visual.step+'/5'+(visual.step?' · '+visual.item.points[visual.step-1][language==='uz'?'uzTitle':'title']:'');
    $('viewport').dataset.scenarioCase=visual?.caseId || '';
    $('viewport').dataset.scenarioStep=visual?String(visual.step):'';
    fullscreenDenied = false;
    if (panel.open && (state.pendingId || state.sceneId !== infoScene)) closeInfo();
    $('current-label').textContent = state.label;
    $('angle-label').textContent = `${state.angle}° CG`;
    $('native-size').textContent = state.nativeWidth ? text('dimensions', { width: state.nativeWidth, height: state.nativeHeight }) : text('waitingImage');
    $('zoom-label').value = `${state.zoom.toFixed(1)}×`;
    $('auto').setAttribute('aria-pressed', String(state.autoRotate));
    const controlsDisabled = state.suspended || state.engine !== 'panorama' || state.status !== 'ready';
    $('zoom-in').disabled = controlsDisabled || state.zoom >= 1.8;
    $('zoom-out').disabled = controlsDisabled || state.zoom <= .9;
    $('reset').disabled = controlsDisabled; $('auto').disabled = controlsDisabled || state.reducedMotion;
    $('load-panel').hidden = state.status === 'ready'; $('load-message').textContent = state.message;
    $('retry').hidden = state.status !== 'error' || state.engine !== 'panorama'; $('viewport').setAttribute('aria-busy', String(state.status === 'loading'));
    $('asset-note').textContent = state.warning || state.message || text(!getScene(state.sceneId).hotspots.length ? 'noTransitions' : state.anchorsCalibrated ? 'calibrated' : 'preliminary');
    $('view-help').hidden = state.engine !== 'panorama';
    $('quality-note').textContent = text('panoramaQuality');
    for (const [id, button] of cards) { button.setAttribute('aria-current', String(id === state.sceneId)); button.classList.toggle('is-pending', id === state.pendingId); }
    const announcement = state.status === 'ready' ? `${state.label}. ${text('announcement')} ${state.warning}` : state.message;
    if (announcement !== lastAnnouncement) { $('announcement').textContent = announcement; lastAnnouncement = announcement; }
    if (state.status === 'ready' && sentId !== state.sceneId) {
      sentId = state.sceneId; const url = new URL(location.href); url.searchParams.set('scene', state.sceneId); history.replaceState(null, '', url);
      // Same-origin parent integration only. No wildcard destinations or private data.
      postToParent({ type: 'university-panorama:scene', sceneId: state.sceneId, engine: state.engine, nativeWidth: state.nativeWidth, nativeHeight: state.nativeHeight });
    }
  }
  api = await mountPanorama($('panorama-canvas'), { sceneId: selected, language, scenarioContext:initialVisual, hotspotLayer: $('hotspots'),
    onMount: mounted => {
      api = mounted; mountLanguage = api.setLanguage; disposeWorld = api.dispose;
      api.dispose = disposeViewer; window.__panorama = api;
      if (disposed) { disposeWorld(); return; }
      if (parentSuspended) api.suspend();
      mountLanguage(language);
    }, onChange: update, onInfo: openInfo });
  if (disposed) return api;
  viewerReady = true;
  api.setLanguage = setLanguage;
  api.setTheme = setTheme;
  for (const [id, action] of [['zoom-in', () => api.zoom(.1)], ['zoom-out', () => api.zoom(-.1)], ['reset', api.reset], ['auto', () => api.setAutoRotate(!api.getState().autoRotate)], ['retry', api.retry]]) $(id).addEventListener('click', action, { signal: events.signal });
  $('fullscreen').disabled = !$('panorama-app').requestFullscreen;
  $('fullscreen').addEventListener('click', () => {
    fullscreenDenied = false;
    const failed = () => { if (!disposed) { fullscreenDenied = true; $('asset-note').textContent = text('fullscreenError'); } };
    try {
      const request = document.fullscreenElement ? document.exitFullscreen() : $('panorama-app').requestFullscreen();
      request?.catch(failed);
    } catch { failed(); }
  }, { signal: events.signal });
  document.addEventListener('fullscreenchange', () => {
    updateFullscreen();
    api.setMode(fullscreenViewMode()); api.resize();
  }, { signal: events.signal });
  updateFullscreen();
  if (queuedScene && queuedScene !== api.getState().sceneId) api.setScene(queuedScene);
  if (queuedVisual && JSON.stringify(queuedVisual)!==JSON.stringify(initialVisual)) api.setScenario(queuedVisual);
  return api;
}
if (typeof window !== 'undefined' && document.getElementById('panorama-app')) {
  window.__panoramaReady = bootViewer().catch(error => {
    document.getElementById('load-message').textContent = translate(document.documentElement.lang, 'bootError');
    console.error('[panorama]', error); throw error;
  });
}
