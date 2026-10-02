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

    // 4. Watch Progress
    const progressEl = el.querySelector<HTMLElement>('#progress, .ytd-thumbnail-overlay-resume-playback-renderer');
    let watchProgressPercent = 0;
    if (progressEl) {
      const widthStyle = progressEl.style.width;
      if (widthStyle) {
        const parsedWidth = parseFloat(widthStyle);
        if (!isNaN(parsedWidth)) {
          watchProgressPercent = Math.min(100, Math.max(0, Math.round(parsedWidth)));
        }
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
