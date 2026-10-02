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
      } else if (item.watchProgressPercent >= 99) {
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
    const delayMs = options.delayMs ?? 400;

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

        // Check continuation spinner to determine if more items exist
        const hasContinuation = Boolean(
          document.querySelector('ytd-continuation-item-renderer')
        );

        // If no new items discovered after 4 scroll attempts, assume bottom reached
        if (stalledCount >= 4 && !hasContinuation) {
          console.log('[YT-WL-Gardener] Reached end of playlist (no more items to load).');
          break;
        }

        // 2. Perform smooth scroll downward to trigger next batch
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
