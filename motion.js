export const MOTION = Object.freeze({ reveal: 360, panel: 240, scene: 320, dialog: 280, close: 140, stagger: 45 });

// Motion decorates the existing state; it never delays an action or changes a score.
export function createProposalMotion(win = window, doc = document) {
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const scenes = new WeakMap();
  const modules = new WeakMap();
  const closing = new WeakMap();
  const pendingCloses = new Set();
  const sceneCleanups = new Set();
  let unmount = () => {};
  const enabled = () => !preference.matches && !doc.hidden;
  const visible = node => node?.isConnected && node.getClientRects().length > 0;

  function animate(node, frames, duration = MOTION.panel, delay = 0) {
    if (!enabled() || !visible(node) || !node.animate) return null;
    const animation = node.animate(frames, { duration, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    const record = { node, animation };
    active.add(record);
    const finish = () => { active.delete(record); animation.cancel(); };
    animation.finished.then(finish, finish);
    return animation;
  }
  function cancelWithin(root) {
    for (const record of active) if (root.contains(record.node)) record.animation.cancel();
  }
  function panel(root, stagger = false) {
    if (!visible(root)) return;
    cancelWithin(root);
    const children = [...root.children].filter(node => !node.hidden).slice(0, stagger ? 7 : 1);
    for (const [index, node] of (stagger ? children : [root]).entries()) {
      animate(node, [{ opacity: .35, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], MOTION.panel, index * 30);
    }
  }

  function environment(root, replace, action) {
    scenes.get(root)?.();
    cancelWithin(root);
    const previous = root.querySelector('.scenario-frame');
    const ghost = enabled() && visible(previous) ? previous.cloneNode(false) : null;
    if (ghost) {
      ghost.src = previous.currentSrc || previous.src;
      ghost.className = 'motion-scene-ghost';
      ghost.alt = '';
      ghost.removeAttribute('loading');
      ghost.setAttribute('aria-hidden', 'true');
    }
    replace();
    const status = root.querySelector('.scenario-visual-status');
    if (!enabled()) return;
    const image = root.querySelector('.scenario-frame');
    const imageBox = root.querySelector('.scenario-image');
    if (action === 'case' || action === 'reset') {
      panel(root.querySelector('.environment-story'));
      panel(root.querySelector('.environment-actions'), true);
    } else if (action === 'point') {
      const done = [...root.querySelectorAll('.environment-action.is-done')].at(-1);
      animate(done?.querySelector('b'), [{ transform: 'scale(.65)', opacity: .4 }, { transform: 'scale(1.16)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], 240);
      animate(root.querySelector('.environment-action.is-current'), [{ boxShadow: '0 0 0 4px #71020224' }, { boxShadow: '0 0 0 0px #71020200' }], 450);
      panel(status);
    } else panel(root.querySelector('.environment-review'));

    if (!ghost || !imageBox || ghost.src === image?.src) return;
    imageBox.append(ghost);
    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
      ghost.remove();
      sceneCleanups.delete(cleanup);
      if (scenes.get(root) === cleanup) scenes.delete(root);
    };
    scenes.set(root, cleanup);
    sceneCleanups.add(cleanup);
    // Keep the old frame visible until the next image is decoded, including on slow connections.
    image.loading = 'eager';
    const decoded = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => {
      if (cancelled || !enabled() || !root.isConnected) { cleanup(); return; }
      animate(image, [{ transform: 'scale(1.018)' }, { transform: 'none' }], 420);
      const fade = animate(ghost, [{ opacity: 1 }, { opacity: 0 }], MOTION.scene);
      if (fade) fade.finished.then(cleanup, cleanup); else cleanup();
    });
  }

  function openDialog(dialog) {
    const pending = closing.get(dialog);
    if (pending) { pending.cancelled = true; closing.delete(dialog); pendingCloses.delete(pending); }
    cancelWithin(dialog);
    animate(dialog, [{ opacity: 0, transform: 'translateY(18px) scale(.985)' }, { opacity: 1, transform: 'none' }], MOTION.dialog);
  }
  function closeDialog(dialog) {
    if (!dialog?.open || closing.has(dialog)) return;
    if (!enabled()) { dialog.close(); return; }
    cancelWithin(dialog);
    const pending = { dialog, cancelled: false };
    closing.set(dialog, pending);
    pendingCloses.add(pending);
    const animation = animate(dialog, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px) scale(.995)' }], MOTION.close);
    const finish = () => {
      pendingCloses.delete(pending);
      if (closing.get(dialog) === pending) closing.delete(dialog);
      if (!pending.cancelled && dialog.open) dialog.close();
    };
    if (animation) animation.finished.then(finish, finish); else finish();
  }

  function workspace(frame, id) {
    const previous = modules.get(frame);
    modules.set(frame, id);
    if (previous !== undefined && previous !== id) panel(frame.querySelector('.ws-content [role="tabpanel"]'), true);
  }

  function mountProposal(root) {
    unmount();
    const header = root.querySelector('.header');
    const navigation = root.querySelector('.navigation');
    if (!header || !navigation) return;
    const progress = doc.createElement('span');
    progress.className = 'motion-reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    header.append(progress);
    const marker = doc.createElement('span');
    marker.className = 'motion-nav-marker';
    marker.setAttribute('aria-hidden', 'true');
    navigation.append(marker);
    let raf = 0;
    const update = () => {
      raf = 0;
      if (doc.documentElement.classList.contains('modal-open')) return;
      const total = doc.documentElement.scrollHeight - win.innerHeight;
      progress.style.transform = `scaleX(${Math.max(0, Math.min(1, total > 0 ? win.scrollY / total : 0))})`;
      const selected = navigation.querySelector('a.active') || navigation.querySelector('a');
      if (selected) {
        marker.style.width = `${selected.offsetWidth}px`;
        marker.style.transform = `translateX(${selected.offsetLeft}px)`;
      }
    };
    const schedule = () => { if (!raf) raf = win.requestAnimationFrame(update); };
    const navObserver = new MutationObserver(schedule);
    navObserver.observe(navigation, { subtree: true, attributes: true, attributeFilter: ['class'] });
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
    const observer = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting);
      for (const [index, entry] of entering.entries()) {
        observer.unobserve(entry.target);
        animate(entry.target, [{ opacity: .15, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], MOTION.reveal, Math.min(index, 3) * MOTION.stagger);
      }
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    root.querySelectorAll('.sales-section-heading,.sales-facts>a,.sales-environment,.sales-benefit-grid>article,.sales-workflow>article,.sales-room-photo,.sales-room-plan,.sales-rollout-heading,.sales-rollout>button,.sales-next-layout>div').forEach(node => observer.observe(node));
    update();
    unmount = () => {
      observer.disconnect(); navObserver.disconnect();
      win.removeEventListener('scroll', schedule); win.removeEventListener('resize', schedule);
      win.cancelAnimationFrame(raf);
      progress.remove(); marker.remove();
      cancelWithin(root);
    };
  }
  function stop() {
    for (const record of active) record.animation.cancel();
    for (const cleanup of [...sceneCleanups]) cleanup();
    for (const pending of [...pendingCloses]) {
      pending.cancelled = true;
      closing.delete(pending.dialog);
      pendingCloses.delete(pending);
      if (pending.dialog.open) pending.dialog.close();
    }
  }
  const preferenceChanged = () => { if (preference.matches) stop(); };
  const visibilityChanged = () => { if (doc.hidden) stop(); };
  preference.addEventListener('change', preferenceChanged);
  doc.addEventListener('visibilitychange', visibilityChanged);
  return { panel, environment, openDialog, closeDialog, workspace, mountProposal, destroy() {
    unmount(); stop();
    preference.removeEventListener('change', preferenceChanged);
    doc.removeEventListener('visibilitychange', visibilityChanged);
  } };
}
