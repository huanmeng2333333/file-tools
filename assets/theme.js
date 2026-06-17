(function() {
  const STORAGE_KEY = 'file-tools-theme';
  const DEFAULT_THEME = 'light';

  function getTheme() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
  }

  function applyTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    document.body.classList.toggle('dark', theme === 'dark');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.dataset.theme = theme;
  }

  window.toggleTheme = function() { console.log("toggleTheme called");
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  document.addEventListener('DOMContentLoaded', () => applyTheme(getTheme()));
})();

