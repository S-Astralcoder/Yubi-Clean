import { VideoItem, HarvesterStatus } from '../types';
import { extractVideoMetadata } from './dom-utils';

export interface HarvestProgress {
  total: number;
  deadCount: number;
  watchedCount: number;
  isScanning: boolean;
  isCompleted: boolean;
}

export type ProgressListener = (progress: HarvestProgress) => void;

class HarvesterEngine {
  private status: HarvesterStatus = 'idle';
  private stopRequested: boolean = false;
  private videosMap: Map<string, VideoItem> = new Map();
  private listeners: Set<ProgressListener> = new Set();

  public getStatus(): HarvesterStatus {
    return this.status;
  }

  public getVideos(): VideoItem[] {
    return Array.from(this.videosMap.values());
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.calculateProgress());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const progress = this.calculateProgress();
    for (const listener of this.listeners) {
      listener(progress);
    }
  }

  private calculateProgress(): HarvestProgress {
    let deadCount = 0;
    let watchedCount = 0;

    for (const item of this.videosMap.values()) {
      if (item.isUnavailable) {
        deadCount++;
      } else if (item.isWatched) {
        watchedCount++;
      }
    }

    return {
      total: this.videosMap.size,
      deadCount,
      watchedCount,
      isScanning: this.status === 'scanning',
      isCompleted: this.status === 'completed',
    };
  }

  /**
   * Starts incremental playlist scanning and virtual scroll harvesting.
   */
  public async start(options: { maxItems?: number; delayMs?: number } = {}): Promise<VideoItem[]> {
    if (this.status === 'scanning') {
      console.warn('[YT-WL-Gardener] Harvester is already running.');
      return this.getVideos();
    }

    this.status = 'scanning';
    this.stopRequested = false;
    this.videosMap.clear();
    this.notify();

    const maxItems = options.maxItems ?? 5000;
    const delayMs = options.delayMs ?? 450;

    console.log('[YT-WL-Gardener] Starting playlist harvesting...');

    let stalledCount = 0;
    let previousSize = 0;

    try {
      while (!this.stopRequested) {
        // 1. Scan currently mounted video elements
        const videoElements = Array.from(
          document.querySelectorAll<HTMLElement>('ytd-playlist-video-renderer')
        );

        videoElements.forEach((el, index) => {
          const item = extractVideoMetadata(el, this.videosMap.size + index);
          if (item && !this.videosMap.has(item.id)) {
            this.videosMap.set(item.id, item);
          }
        });

        // Broadcast progress to UI
        this.notify();

        // Check if maximum threshold reached
        if (this.videosMap.size >= maxItems) {
          console.log(`[YT-WL-Gardener] Target item threshold (${maxItems}) reached.`);
          break;
        }

        // Check if new items were discovered in this cycle
        if (this.videosMap.size === previousSize) {
          stalledCount++;
        } else {
          stalledCount = 0;
          previousSize = this.videosMap.size;
        }

        // Check if browser has reached bottom of document
        const scrollPos = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
        const isAtBottom = scrollPos >= maxScroll - 150;

        // Check if YouTube has an ACTIVE continuation spinner running
        const activeSpinner = document.querySelector(
          'ytd-continuation-item-renderer tp-yt-paper-spinner[active], ytd-continuation-item-renderer #spinner[active], tp-yt-paper-spinner.ytd-continuation-item-renderer[active]'
        );
        const hasActiveSpinner = Boolean(activeSpinner);

        // Reliable completion check:
        // A: Stalled at the bottom of the page with no active spinner
        if (stalledCount >= 2 && isAtBottom && !hasActiveSpinner) {
          console.log('[YT-WL-Gardener] Reached end of playlist (bottom reached, spinner inactive).');
          break;
        }

        // B: Stalled for 3 cycles and no active spinner anywhere
        if (stalledCount >= 3 && !hasActiveSpinner) {
          console.log('[YT-WL-Gardener] Reached end of playlist (no new items and no active spinner).');
          break;
        }

        // C: Absolute failsafe: stalled for 5 cycles regardless of DOM state
        if (stalledCount >= 5) {
          console.log('[YT-WL-Gardener] Stalled for 5 cycles. Harvesting complete.');
          break;
        }

        // 2. Perform scroll downward to trigger next batch
        window.scrollBy({ top: 1200, behavior: 'smooth' });

        // 3. Sleep to allow YouTube's continuation loader to fetch & mount
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      this.status = this.stopRequested ? 'idle' : 'completed';
    } catch (err) {
      console.error('[YT-WL-Gardener] Harvester encountered an error:', err);
      this.status = 'error';
    } finally {
      this.notify();

      // Persist results to chrome.storage.local
      const rawRecords: Record<string, VideoItem> = {};
      this.videosMap.forEach((v, k) => {
        rawRecords[k] = v;
      });

      chrome.storage?.local?.set({
        videos: rawRecords,
        totalIndexed: this.videosMap.size,
        harvesterStatus: this.status,
      });

      console.log(`[YT-WL-Gardener] Harvesting finished. Total indexed: ${this.videosMap.size}`);
    }

    return this.getVideos();
  }

  /**
   * Gracefully requests the harvester to stop scrolling.
   */
  public stop(): void {
    if (this.status === 'scanning') {
      this.stopRequested = true;
      this.status = 'idle';
      this.notify();
      console.log('[YT-WL-Gardener] Stop requested by user.');
    }
  }
}

// Export singleton instance
export const harvester = new HarvesterEngine();
