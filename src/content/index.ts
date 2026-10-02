/**
 * Content Script Baseline
 * Injected into youtube.com to initialize DOM observer and UI host.
 */

console.log('[YT-WL-Gardener] Content script loaded on:', window.location.href);

// Watch for YouTube internal SPA navigation
window.addEventListener('yt-navigate-finish', (event) => {
  console.log('[YT-WL-Gardener] YouTube SPA navigation detected:', window.location.href, event);
});
