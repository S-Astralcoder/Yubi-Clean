import { VideoItem } from '../types';

/**
 * Parses time string (e.g., "12:34", "1:02:15", "45") into total seconds.
 */
export function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Extracts Video ID from a YouTube URL or href string.
 */
export function extractVideoId(urlOrHref: string): string | null {
  if (!urlOrHref) return null;
  const match = urlOrHref.match(/[?&]v=([^&]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Short URL format /shorts/ID or /embed/ID
  const altMatch = urlOrHref.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }
  return null;
}

/**
 * Checks if a video title or row indicates it is deleted, private, or unavailable.
 */
export function checkIsUnavailable(title: string, rawElement: HTMLElement): { isUnavailable: boolean; reason?: 'deleted' | 'private' | 'blocked' | 'unknown' } {
  const lowerTitle = title.toLowerCase().trim();
  
  if (lowerTitle.includes('[deleted video]') || lowerTitle === 'deleted video') {
    return { isUnavailable: true, reason: 'deleted' };
  }
  if (lowerTitle.includes('[private video]') || lowerTitle === 'private video') {
    return { isUnavailable: true, reason: 'private' };
  }
  if (lowerTitle.includes('[unavailable video]') || lowerTitle === 'unavailable video') {
    return { isUnavailable: true, reason: 'blocked' };
  }

  // Check element attributes or missing anchor links
  if (rawElement.hasAttribute('is-empty') || !rawElement.querySelector('a#video-title')) {
    return { isUnavailable: true, reason: 'unknown' };
  }

  return { isUnavailable: false };
}

/**
 * Extracts structured VideoItem metadata from a `ytd-playlist-video-renderer` element.
 */
export function extractVideoMetadata(el: HTMLElement, domIndex: number): VideoItem | null {
  try {
    // 1. Title and Anchor
    const titleEl = el.querySelector<HTMLAnchorElement>('#video-title, a.ytd-playlist-video-renderer');
    const rawTitle = titleEl?.textContent?.trim() || titleEl?.getAttribute('title')?.trim() || '';
    const href = titleEl?.getAttribute('href') || '';
    const videoId = extractVideoId(href) || `unavailable-${domIndex}`;

    // 2. Channel Name
    const channelEl = el.querySelector('#channel-name a, .ytd-channel-name a, #byline-container a, #byline');
    const channelName = channelEl?.textContent?.trim() || 'Unknown Channel';

    // 3. Duration
    const durationEl = el.querySelector(
      'ytd-thumbnail-overlay-time-status-renderer #text, badge-shape .badge-shape-wiz__text, #time-status #text'
    );
    const durationText = durationEl?.textContent?.trim() || '';
    const durationSeconds = parseDurationToSeconds(durationText);

    // 4. Watch Progress & Completion Detection
    let watchProgressPercent = 0;
    let isWatched = false;

    // Check 4a: Explicit YouTube "WATCHED" overlay badge
    const watchedOverlay = el.querySelector(
      'ytd-thumbnail-overlay-playback-status-renderer, ytd-thumbnail-overlay-playback-status-renderer yt-formatted-string, #text.ytd-thumbnail-overlay-playback-status-renderer'
    );
    if (watchedOverlay && watchedOverlay.textContent?.trim().toUpperCase().includes('WATCHED')) {
      isWatched = true;
      watchProgressPercent = 100;
    }

    // Check 4b: Thumbnail / Link aria-label indicating watched status
    const thumbnailLink = el.querySelector<HTMLAnchorElement>('a#thumbnail, a.ytd-thumbnail');
    const ariaLabel = (thumbnailLink?.getAttribute('aria-label') || titleEl?.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('watched') || ariaLabel.includes('100%') || ariaLabel.includes('completed')) {
      isWatched = true;
      watchProgressPercent = 100;
    }

    // Check 4c: Resume playback progress bar inside thumbnail
    // Note: Must explicitly target #progress, NOT the parent container!
    const progressEl = el.querySelector<HTMLElement>(
      'ytd-thumbnail-overlay-resume-playback-renderer #progress, #progress.ytd-thumbnail-overlay-resume-playback-renderer, div#progress'
    );
    if (progressEl) {
      const rawStyle = progressEl.getAttribute('style') || progressEl.style.width || '';
      const match = rawStyle.match(/width:\s*([\d.]+)%/i);
      if (match && match[1]) {
        const parsed = parseFloat(match[1]);
        if (!isNaN(parsed)) {
          watchProgressPercent = Math.min(100, Math.max(0, Math.round(parsed)));
        }
      } else if (progressEl.style.width) {
        const parsed = parseFloat(progressEl.style.width);
        if (!isNaN(parsed)) {
          watchProgressPercent = Math.min(100, Math.max(0, Math.round(parsed)));
        }
      }

      // If progress is >= 90%, it's effectively completed (YouTube credits/outro)
      if (watchProgressPercent >= 90) {
        isWatched = true;
      }
    }

    // 5. Availability Status
    const { isUnavailable, reason } = checkIsUnavailable(rawTitle, el);

    // 6. Thumbnail
    const imgEl = el.querySelector<HTMLImageElement>('yt-image img, #img');
    const thumbnailUrl = imgEl?.src || (videoId && !videoId.startsWith('unavailable-') ? `https://i.yt.com/vi/${videoId}/hqdefault.jpg` : undefined);

    return {
      id: videoId,
      title: rawTitle || (isUnavailable ? `[Unavailable Video]` : 'Untitled Video'),
      channelName,
      durationText,
      durationSeconds,
      watchProgressPercent,
      isWatched,
      isUnavailable,
      unavailableReason: reason,
      domIndex,
      thumbnailUrl,
    };
  } catch (err) {
    console.error('[YT-WL-Gardener] Error parsing video element:', err);
    return null;
  }
}
