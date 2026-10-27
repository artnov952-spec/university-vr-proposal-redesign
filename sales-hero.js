import { SCENARIO_FRAMES } from './scenario-visuals.js?v=sales20261027-r7local';
import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';

export const HERO_DURATION = 10000;
export const heroFrameAt = elapsed => {
  const time = Math.max(0, Math.min(HERO_DURATION, Number.isFinite(elapsed) ? elapsed : 0));
  return { index: Math.min(4, Math.floor(time / 2000)), progress: time / HERO_DURATION, complete: time === HERO_DURATION };
};
export const heroCanRun = ({ playing, ready, hidden, onscreen, suspended, reduced }) => Boolean(playing && ready && !hidden && onscreen && !suspended && !reduced);

export function mountSalesHero(root, language = 'ru', options = {}) {
  if (!root) return null;
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const item = scenarioLibrary.find(entry => entry.id === 'entrance-01');
  const frames = SCENARIO_FRAMES[item.id];
  const layers = [...root.querySelectorAll('[data-hero-layer]')];
  const find = id => root.querySelector('#' + id);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const listener = new AbortController(), reasons = new Set();
  let elapsed = 0, playing = false, ready = false, onscreen = false, started = false;
  let disposed = false, animation = 0, lastStamp = null, activeLayer = 0, painted = 0, loading;
  let lastCaption = '';
  const local = (entry, field) => entry[language === 'uz' ? 'uz' + field[0].toUpperCase() + field.slice(1) : field];
  const canRun = () => heroCanRun({ playing, ready, hidden: document.hidden, onscreen, suspended: reasons.size > 0, reduced: media.matches });

  function render(caption = true) {
    if (disposed) return;
    const frame = heroFrameAt(elapsed);
    root.dataset.heroStep = String(started ? frame.index + 1 : 0);
    root.dataset.heroPlaying = String(canRun());
    find('hero-film-progress').style.width = `${frame.progress * 100}%`;
    if (painted !== frame.index) {
      activeLayer = 1 - activeLayer;
      layers[activeLayer].src = frames[frame.index].src;
      layers[activeLayer].alt = local(item.points[frame.index], 'title');
      layers[activeLayer].setAttribute('aria-hidden', 'false');
      layers[1 - activeLayer].setAttribute('aria-hidden', 'true');
      layers[activeLayer].classList.add('is-active'); layers[1 - activeLayer].classList.remove('is-active');
      painted = frame.index; caption = true;
    }
    if (caption) {
      find('hero-film-phase').textContent = frame.complete ? t('Пример оценки', 'Baho namunasi') : started ? t('Курсант действует', 'Kursant harakat qiladi') : t('Учебная ситуация', 'O‘quv vaziyati');
      find('hero-film-count').textContent = frame.complete ? '100 / 100' : `${started ? frame.index + 1 : 0} / 5`;
      find('hero-film-caption').textContent = frame.complete ? t('Каждое действие можно разобрать.', 'Har bir amalni tahlil qilish mumkin.') : started ? local(item.points[frame.index], 'title') : local(item, 'title');
      find('hero-film-detail').textContent = frame.complete ? t('Пять действий зафиксированы. Преподаватель видит, как получен результат.', 'Beshta amal qayd etildi. O‘qituvchi natija qanday olinganini ko‘radi.') : started ? local(item.points[frame.index], 'description') : t('Увидеть. Выбрать действие. Разобрать результат.', 'Ko‘rish. Amalni tanlash. Natijani tahlil qilish.');
      const captionKey = `${started}:${frame.index}:${frame.complete}`;
      if (lastCaption && lastCaption !== captionKey) options.onFrameChange?.();
      lastCaption = captionKey;
    }
    find('hero-play').setAttribute('aria-pressed', String(playing));
    const playText = media.matches ? t('Следующий кадр', 'Keyingi kadr') : playing && !ready ? t('Загружаем сцену…', 'Sahna yuklanmoqda…') : playing ? t('Приостановить', 'To‘xtatish') : frame.complete ? t('Смотреть еще раз', 'Yana ko‘rish') : started ? t('Продолжить показ', 'Namoyishni davom ettirish') : t('Смотреть 10 секунд', '10 soniya ko‘rish');
    const playLabel = find('hero-play').querySelector('span');
    if (playLabel.textContent !== playText) playLabel.textContent = playText;
  }
  function tick(stamp) {
    animation = 0;
    if (!canRun()) { lastStamp = null; return; }
    if (lastStamp !== null) elapsed = Math.min(HERO_DURATION, elapsed + Math.min(100, stamp - lastStamp));
    lastStamp = stamp;
    if (elapsed === HERO_DURATION) {
      playing = false; lastStamp = null;
      find('hero-film-status').textContent = t('Показ завершен. Попробуйте ситуацию ниже.', 'Namoyish tugadi. Quyidagi vaziyatni sinab ko‘ring.');
    }
    render(elapsed === HERO_DURATION);
    if (canRun()) animation = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(animation); animation = 0; lastStamp = null;
    render();
    if (canRun()) animation = requestAnimationFrame(tick);
  }
  function preload() {
    if (loading) return loading;
    loading = Promise.all(frames.map(frame => new Promise((resolve, reject) => {
      const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'auto';
      const finish = error => { clearTimeout(timeout); image.onload = image.onerror = null; listener.signal.removeEventListener('abort', abort); error ? reject(error) : resolve(image); };
      const abort = () => { image.removeAttribute('src'); finish(new DOMException('Aborted', 'AbortError')); };
      const timeout = setTimeout(() => finish(new Error('Preview image timeout')), 30000);
      image.onload = () => finish(); image.onerror = () => finish(new Error('Preview image unavailable'));
      listener.signal.addEventListener('abort', abort, { once: true });
      image.src = new URL(frame.src, import.meta.url).href;
    }))).then(() => { if (!disposed) ready = true; }).catch(error => { loading = null; throw error; });
    return loading;
  }
  async function start() {
    if (disposed) return;
    started = true; playing = true; render();
    try { await preload(); if (!disposed) sync(); }
    catch { if (!disposed) { playing = false; find('hero-film-status').textContent = t('Показ не загрузился. Можно попробовать ситуацию ниже.', 'Namoyish yuklanmadi. Quyidagi vaziyatni sinab ko‘rish mumkin.'); sync(); } }
  }
  find('hero-play').addEventListener('click', () => {
    if (media.matches) {
      started = true;
      elapsed = heroFrameAt(elapsed).complete ? 0 : Math.min(HERO_DURATION, elapsed + 2000);
      render(); return;
    }
    if (playing) { playing = false; sync(); }
    else { if (elapsed === HERO_DURATION) elapsed = 0; start(); }
  }, { signal: listener.signal });
  document.addEventListener('visibilitychange', sync, { signal: listener.signal });
  media.addEventListener('change', () => { if (media.matches) playing = false; sync(); }, { signal: listener.signal });
  const observer = new IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    if (onscreen && !started && !media.matches && !document.hidden && !reasons.size) start(); else sync();
  }, { threshold: .08 });
  observer.observe(root);
  render();
  return {
    setSuspended(reason, value) { if (disposed) return; value ? reasons.add(reason) : reasons.delete(reason); sync(); },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(animation); observer.disconnect(); listener.abort(); }
  };
}
