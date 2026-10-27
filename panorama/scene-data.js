// One-point CG previews. Portal anchors were checked against the rendered images.
// Each supplied image covers 180 horizontal / 90 vertical degrees, not a room.
import { PANORAMA_MEDIA } from './media.js?v=sales20261027-r7local';
export const SCENE_ORDER = Object.freeze(['courtyard', 'entrance', 'traffic', 'market', 'classroom']);
const shared = { angle: 180, verticalAngle: 90, wrap: false, initialYaw: 0, initialPitch: 0, zoomMin: .9, zoomMax: 1.8 };
export const SCENES = {
  courtyard: { ...shared, id: 'courtyard', label: 'Махалля', asset: '.' + PANORAMA_MEDIA.courtyard.src,
    hotspots: [{ id: 'courtyard-door', label: 'Перейти в подъезд', yaw: -30, pitch: -5, target: 'entrance', calibrated: true }] },
  entrance: { ...shared, id: 'entrance', label: 'Подъезд', asset: '.' + PANORAMA_MEDIA.entrance.src,
    hotspots: [{ id: 'entrance-exit', label: 'Перейти во двор', yaw: -60, pitch: -4, target: 'courtyard', calibrated: true }] },
  traffic: { ...shared, id: 'traffic', label: 'Перекресток', asset: '.' + PANORAMA_MEDIA.traffic.src,
    hotspots: [] },
  market: { ...shared, id: 'market', label: 'Базар', asset: '.' + PANORAMA_MEDIA.market.src,
    hotspots: [] },
  classroom: { ...shared, id: 'classroom', label: 'Учебный класс', asset: '.' + PANORAMA_MEDIA.classroom.src,
    hotspots: [{ id: 'teaching-area', label: 'Зона преподавателя', yaw: 0, pitch: 17, calibrated: true,
      description: 'Назначение занятия, наблюдение за выполнением и разбор результатов.',
      info: { kind: 'teaching', moduleId: 8 } }] },
};
const RAD = Math.PI / 180;
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const normalizeYaw = n => ((n + 180) % 360 + 360) % 360 - 180;
export const getScene = id => { if (!Object.hasOwn(SCENES, id)) throw new RangeError(`Unknown panorama: ${id}`); return SCENES[id]; };
// Start wider so the finite source is not unnecessarily magnified on entry.
export const baseFov = aspect => aspect < 1.1 ? 65 : 60;
export const zoomFov = (base, zoom) => 2 * Math.atan(Math.tan(base * RAD / 2) / zoom) / RAD;

// Legacy mode arguments cannot re-enable the removed flat presentation.
export const resolveViewMode = () => 'panorama';
export const fullscreenViewMode = () => resolveViewMode();

export function viewLimits(scene, fov, aspect, pitch = 0) {
  const halfV = fov * RAD / 2;
  const pitchMax = Math.max(0, scene.verticalAngle / 2 - fov / 2 - .35);
  const safePitch = clamp(pitch, -pitchMax, pitchMax) * RAD;
  // At nonzero pitch the upper corners extend further in longitude than mid-edge.
  const cornerH = Math.atan2(Math.tan(halfV) * aspect,
    Math.cos(safePitch) - Math.abs(Math.tan(halfV) * Math.sin(safePitch))) / RAD;
  const yawMax = Math.max(0, scene.angle / 2 - cornerH - .35);
  return { yawMin: -yawMax, yawMax, pitchMin: -pitchMax, pitchMax };
}

export function constrainView(scene, value, aspect = 16 / 9) {
  const zoom = clamp(finite(value.zoom, 1), scene.zoomMin, scene.zoomMax);
  const fov = zoomFov(baseFov(aspect), zoom);
  const pitchLimits = viewLimits(scene, fov, aspect);
  const pitch = clamp(finite(value.pitch, scene.initialPitch), pitchLimits.pitchMin, pitchLimits.pitchMax);
  const limits = viewLimits(scene, fov, aspect, pitch);
  const yaw = scene.wrap && scene.angle === 360 ? normalizeYaw(finite(value.yaw, 0))
    : clamp(finite(value.yaw, scene.initialYaw), limits.yawMin, limits.yawMax);
  return { yaw, pitch, zoom, fov, limits };
}

export function directionAt(yaw, pitch) {
  const y = yaw * RAD, p = pitch * RAD;
  return [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
}

export function textureUV(scene, yaw, pitch) {
  return { u: .5 + yaw / scene.angle, v: .5 - pitch / scene.verticalAngle,
    inside: Math.abs(yaw) <= scene.angle / 2 && Math.abs(pitch) <= scene.verticalAngle / 2 };
}

export function projectHotspot(anchor, view, width, height, padding = 28) {
  if (!(width > 0 && height > 0)) return { visible: false, x: null, y: null, depth: 0 };
  const a = directionAt(anchor.yaw, anchor.pitch), y = view.yaw * RAD, p = view.pitch * RAD;
  const right = [Math.cos(y), 0, Math.sin(y)];
  const up = [-Math.sin(y) * Math.sin(p), Math.cos(p), Math.cos(y) * Math.sin(p)];
  const forward = directionAt(view.yaw, view.pitch);
  const dot = b => a.reduce((sum, n, i) => sum + n * b[i], 0);
  const depth = dot(forward);
  if (depth <= 1e-7) return { visible: false, x: null, y: null, depth };
  const tangent = Math.tan(view.fov * RAD / 2);
  const x = width / 2 * (1 + dot(right) / (depth * tangent * width / height));
  const sy = height / 2 * (1 - dot(up) / (depth * tangent));
  return { x, y: sy, depth, visible: x >= padding && x <= width - padding && sy >= padding && sy <= height - padding };
}

export function inspectDimensions(width, height) {
  if (!(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0)) throw new RangeError('Invalid image dimensions');
  const aspectValid = Math.abs(width - 2 * height) <= 1;
  return { width, height, ratio: width / height, aspectValid,
    warning: aspectValid ? '' : 'Пропорции исходника отличаются от 2:1. Изображение может искажаться.' };
}
