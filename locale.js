export const LANGUAGE_KEY = 'university-vr-proposal-redesign.language';
const listeners = new Set();
let language = 'ru';
try { const saved = globalThis.localStorage?.getItem(LANGUAGE_KEY); if (saved === 'uz' || saved === 'ru') language = saved; } catch {}
export function getLanguage() { return language; }
export function setLanguage(value) {
  if (!['ru', 'uz'].includes(value) || value === language) return;
  language = value;
  try { globalThis.localStorage?.setItem(LANGUAGE_KEY, value); } catch {}
  listeners.forEach(callback => callback(value));
}
export function subscribeLanguage(callback) { listeners.add(callback); return () => listeners.delete(callback); }
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === LANGUAGE_KEY && ['ru', 'uz'].includes(event.newValue) && event.newValue !== language) {
    language = event.newValue;
    listeners.forEach(callback => callback(language));
  }
});
