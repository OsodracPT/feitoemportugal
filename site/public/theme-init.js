// Loaded as a blocking script from <head> (an external file: the CSP allows no
// inline script) so a saved theme is applied before the first paint. The toggle
// itself lives in site/src/lib/theme.ts.
try {
  var theme = localStorage.getItem('fep-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch (e) {
  // Storage blocked: the theme simply follows the system.
}
