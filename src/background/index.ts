/**
 * Background Service Worker (Manifest V3)
 * Handles extension lifecycle, tab tracking, and storage initialization.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[YT-WL-Gardener] Installed or updated:', details.reason);

  // Initialize default extension settings if not already present
  const existing = await chrome.storage.local.get('settings');
  if (!existing || !existing.settings) {
    await chrome.storage.local.set({
      settings: {
        floatingIconEnabled: true,
        autoScrollSpeedMs: 400,
        deletionDelayMs: 500,
      },
      videos: {},
      totalIndexed: 0,
      harvesterStatus: 'idle',
      prunerStatus: 'idle',
    });
  }
});

// Listener for tab updates to communicate state changes if needed
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    // Tab ready
  }
});
