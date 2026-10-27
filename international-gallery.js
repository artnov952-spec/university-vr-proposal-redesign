export const COUNTRY_ORDER = ['UK','US','DE','NL','AT','SG'];
export const COUNTRY_SLIDE_DURATION = 8500;

export function adjacentCountry(code, direction=1) {
  const index = COUNTRY_ORDER.indexOf(code);
  if (index < 0) throw new RangeError('Unknown country');
  return COUNTRY_ORDER[(index + (direction < 0 ? -1 : 1) + COUNTRY_ORDER.length) % COUNTRY_ORDER.length];
}

export function countryCanRun(state) {
  return state.playing && state.onscreen && !state.hidden && !state.reduced && !state.suspended && !state.focused && !state.hovered;
}

export function mountInternationalGallery(root) {
  if (!root) return null;
  const uz = root.dataset.language === 'uz';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { playing:false, onscreen:false, hidden:document.hidden, reduced:media.matches, suspended:false, focused:false, hovered:false };
  let selected = COUNTRY_ORDER[0], timer;
  const play = root.querySelector('[data-country-play]');
  const abort = new AbortController();
  const listen = (target,type,fn) => target.addEventListener(type,fn,{signal:abort.signal});
  function sync() {
    clearTimeout(timer);
    const running = countryCanRun(state);
    root.dataset.motion = running ? 'running' : 'paused';
    play.setAttribute('aria-pressed',String(state.playing));
    play.querySelector('span').textContent = state.playing ? (uz?'To‘xtatish':'Пауза') : (uz?'Avtonamoyish':'Автопоказ');
    if (running) timer=setTimeout(()=>select(adjacentCountry(selected),false),COUNTRY_SLIDE_DURATION);
  }
  function select(code, announce=true) {
    if (!COUNTRY_ORDER.includes(code)) return;
    selected=code;
    root.querySelectorAll('[data-evidence-country]').forEach(panel=>{panel.hidden=panel.dataset.evidenceCountry!==code;});
    root.querySelectorAll('[data-country]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.country===code)));
    root.querySelector('#country-slide-count').textContent=String(COUNTRY_ORDER.indexOf(code)+1).padStart(2,'0')+' / 06';
    if(announce)root.querySelector('#country-slide-status').textContent=root.querySelector(`[data-country="${code}"] strong`).textContent;
    sync();
  }
  listen(root,'click',event=>{
    const target=event.target.closest('button');
    if(!target)return;
    if(target.dataset.country)select(target.dataset.country);
    else if(target.hasAttribute('data-country-previous'))select(adjacentCountry(selected,-1));
    else if(target.hasAttribute('data-country-next'))select(adjacentCountry(selected));
    else if(target===play){state.playing=!state.playing;state.focused=false;sync();}
  });
  listen(root,'keydown',event=>{
    const target=event.target.closest('[data-country]');
    if(!target||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const code=event.key==='Home'?COUNTRY_ORDER[0]:event.key==='End'?COUNTRY_ORDER.at(-1):adjacentCountry(target.dataset.country,event.key==='ArrowLeft'?-1:1);
    select(code);root.querySelector(`[data-country="${code}"]`).focus({preventScroll:true});
  });
  listen(root,'focusin',()=>{state.focused=true;sync();});
  listen(root,'focusout',()=>queueMicrotask(()=>{state.focused=root.contains(document.activeElement);sync();}));
  listen(root.querySelector('.international-stage'),'pointerenter',()=>{state.hovered=true;sync();});
  listen(root.querySelector('.international-stage'),'pointerleave',()=>{state.hovered=false;sync();});
  listen(document,'visibilitychange',()=>{state.hidden=document.hidden;sync();});
  listen(media,'change',()=>{state.reduced=media.matches;sync();});
  const observer=new IntersectionObserver(entries=>{state.onscreen=entries[0].isIntersecting;sync();},{threshold:.12});
  observer.observe(root);
  sync();
  return { setSuspended(value){state.suspended=Boolean(value);sync();}, dispose(){clearTimeout(timer);observer.disconnect();abort.abort();} };
}
