(function () {
  var root = document.documentElement;
  function applyLight() {
    root.dataset.theme = 'light'; root.style.colorScheme = 'light';
    document.querySelectorAll('iframe').forEach(function (frame) { frame.contentWindow?.postMessage({ type: 'university-panorama:theme', theme: 'light' }, location.origin); });
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = '#710202';
  }
  // Retire the former preference without changing any saved learning data.
  try { localStorage.setItem('university-vr-proposal-redesign.theme', 'light'); } catch (_) {}
  applyLight(); document.addEventListener('DOMContentLoaded', applyLight);
  window.addEventListener('university-ui-ready', applyLight);
})();
