/**
 * Background Service Worker (Manifest V3)
 * Handles extension lifecycle, tab tracking, storage initialization,
 * and remote license validation heartbeats.
 */

import { paymentService } from '../services/payment';

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[YT-WL-Gardener] Installed or updated:', details.reason);

  // Initialize default extension settings if not already present
  const existing = await chrome.storage.local.get(['settings', 'quota']);
  if (!existing || !existing.settings) {
    await chrome.storage.local.set({
      settings: {
        floatingIconEnabled: true,
        autoScrollSpeedMs: 400,
        deletionDelayMs: 500,
      },
      quota: {
        pointsRemaining: 75,
        pointsTotal: 75,
        tier: 'free',
      },
      videos: {},
      totalIndexed: 0,
      harvesterStatus: 'idle',
      prunerStatus: 'idle',
    });
  } else {
    // Run integrity verification on update
    await paymentService.verifyStorageIntegrity();
  }
});

// Periodic validation heartbeat when browser launches
chrome.runtime.onStartup?.addListener(async () => {
  console.log('[YT-WL-Gardener] Browser startup: verifying storage integrity and license...');
  await paymentService.verifyStorageIntegrity();
  await paymentService.validateStoredLicense();
});

// Listener for tab updates to communicate state changes if needed
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    // Tab ready
  }
});
