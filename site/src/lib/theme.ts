/**
 * The header's theme toggle. Client-side: imports nothing from the data layer.
 * The choice is stored per browser and applied before paint by
 * public/theme-init.js; without a choice the theme follows the system.
 */
type Theme = 'light' | 'dark';

const KEY = 'fep-theme';

export function initThemeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');

  const chosen = (): Theme | undefined => {
    const value = root.dataset.theme;
    return value === 'light' || value === 'dark' ? value : undefined;
  };
  const current = (): Theme => chosen() ?? (system.matches ? 'dark' : 'light');

  const sync = () => {
    button.setAttribute('aria-pressed', String(current() === 'dark'));
    // The browser chrome follows a media query; a manual choice has to override it.
    const bg = getComputedStyle(root).getPropertyValue('--fep-bg').trim();
    if (chosen() && bg) {
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
        meta.content = bg;
      });
    }
  };

  button.addEventListener('click', () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    sync();
  });
  system.addEventListener('change', sync);

  sync();
  button.hidden = false;
}
