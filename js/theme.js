export const APPEARANCE_STORAGE_KEY = 'withinReachAppearance';

const THEME_META_SELECTOR = 'meta[name="theme-color"]';
const THEME_MEDIA = '(prefers-color-scheme: dark)';

const THEME_COLORS = {
  light: '#e6dccd',
  dark: '#181915',
};

const ICONS = {
  light: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.1"></circle>
      <path d="M12 2.75v2.1M12 19.15v2.1M4.75 12h2.1M17.15 12h2.1M5.95 5.95l1.48 1.48M16.57 16.57l1.48 1.48M18.05 5.95l-1.48 1.48M7.43 16.57l-1.48 1.48"></path>
    </svg>
  `,
  dark: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14.7 4.8c-1.3.42-2.42 1.28-3.17 2.42a7.02 7.02 0 0 0-.7 6.18 7 7 0 0 0 4.55 4.37 7.72 7.72 0 0 1-2.67.47c-4.08 0-7.39-3.3-7.39-7.37 0-3.32 2.22-6.24 5.4-7.13.58-.17 1.18-.27 1.79-.3.79-.03 1.56.08 2.19.36Z"></path>
    </svg>
  `,
};

function resolveSystemTheme() {
  return window.matchMedia(THEME_MEDIA).matches ? 'dark' : 'light';
}

export function getSavedAppearance() {
  const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : null;
}

export function resolveAppearance() {
  return getSavedAppearance() || resolveSystemTheme();
}

export function setDocumentTheme(theme) {
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolvedTheme;

  const meta = document.querySelector(THEME_META_SELECTOR);
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[resolvedTheme]);
  }

  return resolvedTheme;
}

export function persistAppearance(theme) {
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, theme);
}

export function syncThemeToggle(button) {
  if (!button) return;

  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  button.dataset.theme = theme;
  button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  button.setAttribute('aria-pressed', String(theme === 'dark'));

  const icon = button.querySelector('[data-theme-toggle-icon]');
  if (icon) {
    icon.innerHTML = ICONS[theme];
  }

  const srText = button.querySelector('[data-theme-toggle-text]');
  if (srText) {
    srText.textContent = `Switch to ${nextTheme} mode`;
  }
}

export function initializeThemeToggle(button, options = {}) {
  if (!button) return;

  const holdDelay = Number(options.holdDelay) || 1050;
  let holdTimer = null;
  let holdTriggered = false;

  syncThemeToggle(button);

  const clearHoldTimer = () => {
    if (!holdTimer) return;
    window.clearTimeout(holdTimer);
    holdTimer = null;
  };

  const handleHoldStart = () => {
    if (typeof options.onHold !== 'function' || holdTimer) return;

    holdTriggered = false;
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      holdTriggered = true;
      options.onHold();
    }, holdDelay);
  };

  const handleHoldEnd = () => {
    clearHoldTimer();
  };

  if (typeof options.onHold === 'function') {
    button.addEventListener('pointerdown', handleHoldStart);
    button.addEventListener('pointerup', handleHoldEnd);
    button.addEventListener('pointercancel', handleHoldEnd);
    button.addEventListener('pointerleave', handleHoldEnd);
  }

  button.addEventListener('click', (event) => {
    if (holdTriggered) {
      event.preventDefault();
      holdTriggered = false;
      return;
    }

    const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    persistAppearance(nextTheme);
    setDocumentTheme(nextTheme);
    syncThemeToggle(button);
  });

  const mediaQuery = window.matchMedia(THEME_MEDIA);
  const handleSystemChange = () => {
    if (getSavedAppearance()) return;

    setDocumentTheme(resolveAppearance());
    syncThemeToggle(button);
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleSystemChange);
  }
}
