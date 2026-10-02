import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FloatingApp } from '../ui/FloatingApp';
import styleText from './style.css?inline';

const HOST_ELEMENT_ID = 'yt-wl-gardener-host';
let reactRootInstance: Root | null = null;
let lastKnownUrl = '';

/**
 * Checks if the current page URL is a supported YouTube playlist.
 */
function isPlaylistUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/playlist')) return false;
    const listId = parsed.searchParams.get('list');
    return Boolean(listId && listId.length > 0);
  } catch {
    return false;
  }
}

/**
 * Extracts the playlist identifier or title information.
 */
function getPlaylistInfo(url: string): { isWatchLater: boolean; listId: string } {
  try {
    const parsed = new URL(url);
    const listId = parsed.searchParams.get('list') || '';
    return {
      isWatchLater: listId === 'WL',
      listId,
    };
  } catch {
    return { isWatchLater: false, listId: '' };
  }
}

/**
 * Mounts the isolated React UI inside a Shadow DOM container.
 */
function mountUI(): void {
  // If host already exists, don't duplicate
  if (document.getElementById(HOST_ELEMENT_ID)) {
    return;
  }

  // Create custom host element
  const host = document.createElement('div');
  host.id = HOST_ELEMENT_ID;
  host.style.position = 'relative';
  host.style.zIndex = '2147483647'; // Maximum z-index above YouTube elements

  // Attach isolated Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject Tailwind + custom glassmorphic theme styles into Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = styleText;
  shadowRoot.appendChild(styleEl);

  // Create React mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = 'yt-wl-gardener-root';
  shadowRoot.appendChild(mountPoint);

  // Append host to DOM
  document.body.appendChild(host);

  // Mount React
  const info = getPlaylistInfo(window.location.href);
  reactRootInstance = createRoot(mountPoint);
  reactRootInstance.render(
    React.createElement(FloatingApp, {
      isWatchLater: info.isWatchLater,
      playlistTitle: info.isWatchLater ? 'Watch Later' : `Playlist: ${info.listId}`,
    })
  );

  console.log('[YT-WL-Gardener] Mounted FAB and Drawer in Shadow DOM');
}

/**
 * Cleans up and unmounts the React root and host element when navigating away.
 */
function unmountUI(): void {
  const host = document.getElementById(HOST_ELEMENT_ID);
  if (host) {
    if (reactRootInstance) {
      reactRootInstance.unmount();
      reactRootInstance = null;
    }
    host.remove();
    console.log('[YT-WL-Gardener] Unmounted UI cleanly');
  }
}

/**
 * Orchestrates mounting/unmounting based on current URL.
 */
function handleUrlChange(): void {
  const currentUrl = window.location.href;
  if (currentUrl === lastKnownUrl) return;
  lastKnownUrl = currentUrl;

  // Check user settings if the floating button is disabled
  chrome.storage?.local?.get(['settings'], (res: Record<string, any>) => {
    const isEnabled = res?.settings?.floatingIconEnabled ?? true;
    if (!isEnabled) {
      unmountUI();
      return;
    }

    if (isPlaylistUrl(currentUrl)) {
      mountUI();
    } else {
      unmountUI();
    }
  });
}

// 1. Initial execution on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleUrlChange);
} else {
  handleUrlChange();
}

// 2. YouTube custom SPA navigation event
window.addEventListener('yt-navigate-finish', () => {
  handleUrlChange();
});

// 3. Browser history navigation fallback
window.addEventListener('popstate', () => {
  handleUrlChange();
});

// 4. Fallback interval check for pushState edge cases (lightweight URL comparison)
setInterval(() => {
  if (window.location.href !== lastKnownUrl) {
    handleUrlChange();
  }
}, 1000);
