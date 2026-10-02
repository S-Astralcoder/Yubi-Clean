import { VideoItem } from '../types';

export interface PruneProgress {
  total: number;
  completed: number;
  currentTitle: string;
  currentId: string;
  status: 'idle' | 'running' | 'paused' | 'aborted' | 'finished' | 'error';
  errorMessage?: string;
}

export type PruneProgressListener = (progress: PruneProgress) => void;

class PrunerEngine {
  private status: 'idle' | 'running' | 'paused' | 'aborted' | 'finished' | 'error' = 'idle';
  private pauseRequested = false;
  private abortRequested = false;
  private listeners: Set<PruneProgressListener> = new Set();
  private currentProgress: PruneProgress = {
    total: 0,
    completed: 0,
    currentTitle: '',
    currentId: '',
    status: 'idle',
  };

  public getStatus(): string {
    return this.status;
  }

  public subscribe(listener: PruneProgressListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProgress);
    return () => this.listeners.delete(listener);
  }

  private notify(update: Partial<PruneProgress>): void {
    this.currentProgress = { ...this.currentProgress, ...update };
    for (const listener of this.listeners) {
      listener(this.currentProgress);
    }
  }

  /**
   * Pauses an active deletion sequence.
   */
  public pause(): void {
    if (this.status === 'running') {
      this.pauseRequested = true;
      this.status = 'paused';
      this.notify({ status: 'paused' });
      console.log('[YT-WL-Gardener] Pruner paused.');
    }
  }

  /**
   * Resumes a paused deletion sequence.
   */
  public resume(): void {
    if (this.status === 'paused') {
      this.pauseRequested = false;
      this.status = 'running';
      this.notify({ status: 'running' });
      console.log('[YT-WL-Gardener] Pruner resumed.');
    }
  }

  /**
   * Aborts the deletion sequence completely.
   */
  public abort(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.abortRequested = true;
      this.pauseRequested = false;
      this.status = 'aborted';
      this.notify({ status: 'aborted' });
      console.log('[YT-WL-Gardener] Pruner aborted by user.');
    }
  }

  /**
   * Executes the sequential, throttled top-down deletion queue.
   */
  public async executePrune(
    targetVideos: VideoItem[],
    options: { throttleDelayMs?: number } = {}
  ): Promise<{ deletedIds: string[]; wasAborted: boolean }> {
    if (this.status === 'running') {
      console.warn('[YT-WL-Gardener] Pruner is already running.');
      return { deletedIds: [], wasAborted: false };
    }

    const throttleDelayMs = options.throttleDelayMs ?? 550;
    this.status = 'running';
    this.pauseRequested = false;
    this.abortRequested = false;

    this.notify({
      total: targetVideos.length,
      completed: 0,
      currentTitle: '',
      currentId: '',
      status: 'running',
    });

    const deletedIds: string[] = [];

    try {
      for (let i = 0; i < targetVideos.length; i++) {
        // 1. Check for abort request
        if (this.abortRequested) {
          console.log('[YT-WL-Gardener] Abort request detected. Stopping queue.');
          break;
        }

        // 2. Check for pause request (wait in loop)
        while (this.pauseRequested && !this.abortRequested) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (this.abortRequested) break;

        const target = targetVideos[i];
        this.notify({
          completed: deletedIds.length,
          currentTitle: target.title,
          currentId: target.id,
        });

        console.log(`[YT-WL-Gardener] (${i + 1}/${targetVideos.length}) Processing: "${target.title}"`);

        // 3. Locate target element in DOM with auto-scroll fallback
        const targetElement = await this.locateTargetElement(target);

        if (!targetElement) {
          console.warn(`[YT-WL-Gardener] Could not locate video in DOM: "${target.title}". Skipping.`);
          continue;
        }

        // 4. Scroll target into center view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 250));

        // 5. Open action menu
        const menuOpened = await this.openActionMenu(targetElement);
        if (!menuOpened) {
          console.warn(`[YT-WL-Gardener] Failed to open menu for: "${target.title}". Skipping.`);
          continue;
        }

        // 6. Find and click "Remove from..." action item
        const removed = await this.clickRemoveAction();
        if (!removed) {
          console.warn(`[YT-WL-Gardener] Could not find "Remove" option for: "${target.title}". Closing menu.`);
          // Click document body to dismiss lingering dropdown
          document.body.click();
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        // 7. Verify removal / detachment
        await this.awaitRemovalOrDisappearance(targetElement);

        deletedIds.push(target.id);
        this.notify({ completed: deletedIds.length });

        // 8. Human-like throttle delay between actions
        await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));
      }

      this.status = this.abortRequested ? 'aborted' : 'finished';
    } catch (err: any) {
      console.error('[YT-WL-Gardener] Pruner encountered an error:', err);
      this.status = 'error';
      this.notify({ errorMessage: err?.message || 'Unknown error occurred during pruning.' });
    } finally {
      this.notify({
        status: this.status,
        currentTitle: '',
        currentId: '',
      });
      console.log(`[YT-WL-Gardener] Pruner ended. Total removed: ${deletedIds.length}/${targetVideos.length}`);
    }

    return { deletedIds, wasAborted: this.abortRequested };
  }

  /**
   * Finds the DOM element for a target video, scrolling down if necessary.
   */
  private async locateTargetElement(target: VideoItem): Promise<HTMLElement | null> {
    let attempts = 0;
    const maxScrollAttempts = 8;

    while (attempts < maxScrollAttempts) {
      // Look for anchor matching Video ID
      const renderers = Array.from(
        document.querySelectorAll<HTMLElement>('ytd-playlist-video-renderer')
      );

      for (const el of renderers) {
        // Method A: Check anchor href containing Video ID
        const anchor = el.querySelector<HTMLAnchorElement>('a#video-title, a#thumbnail');
        if (anchor && target.id && !target.id.startsWith('unavailable-')) {
          const href = anchor.getAttribute('href') || '';
          if (href.includes(target.id)) {
            return el;
          }
        }

        // Method B: For unavailable videos, match text or title
        if (target.isUnavailable) {
          const title = el.querySelector('#video-title')?.textContent?.trim() || '';
          if (
            title.toLowerCase().includes('[deleted video]') ||
            title.toLowerCase().includes('[private video]') ||
            title.toLowerCase().includes('[unavailable video]')
          ) {
            return el;
          }
        }
      }

      // If not found in current visible DOM, scroll down to load more
      window.scrollBy({ top: 800, behavior: 'smooth' });
      await new Promise((resolve) => setTimeout(resolve, 350));
      attempts++;
    }

    return null;
  }

  /**
   * Clicks the 3-dot action menu button on a video renderer.
   */
  private async openActionMenu(rendererEl: HTMLElement): Promise<boolean> {
    const menuBtn = rendererEl.querySelector<HTMLElement>(
      'ytd-menu-renderer yt-icon-button#button, #menu yt-icon-button#button, yt-icon-button.ytd-menu-renderer, #menu button, yt-icon-button'
    );

    if (!menuBtn) return false;

    menuBtn.click();

    // Await dropdown to appear
    const maxWaitMs = 1500;
    const intervalMs = 100;
    let waited = 0;

    while (waited < maxWaitMs) {
      const dropdown = document.querySelector<HTMLElement>(
        'tp-yt-iron-dropdown:not([aria-hidden="true"]), ytd-menu-popup-renderer'
      );
      if (dropdown && dropdown.offsetParent !== null) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      waited += intervalMs;
    }

    return false;
  }

  /**
   * Searches the opened popup menu for "Remove from..." and clicks it.
   */
  private async clickRemoveAction(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 150)); // Allow animation to settle

    // Query all menu items inside visible dropdowns
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        'tp-yt-iron-dropdown:not([aria-hidden="true"]) ytd-menu-service-item-renderer, ytd-menu-popup-renderer ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-service-item-renderer'
      )
    );

    for (const item of items) {
      const text = item.textContent?.toLowerCase().trim() || '';
      if (text.includes('remove from') || text.includes('remove') || text.includes('delete')) {
        item.click();

        // Check if a confirmation dialog pops up
        await new Promise((resolve) => setTimeout(resolve, 200));
        const confirmBtn = document.querySelector<HTMLElement>(
          'yt-confirm-dialog-renderer #confirm-button, yt-button-renderer#confirm-button button'
        );
        if (confirmBtn) {
          confirmBtn.click();
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Waits for the video element to disappear or detach from the DOM.
   */
  private async awaitRemovalOrDisappearance(rendererEl: HTMLElement): Promise<void> {
    const maxWaitMs = 1200;
    const intervalMs = 100;
    let waited = 0;

    while (waited < maxWaitMs) {
      if (!document.contains(rendererEl) || rendererEl.offsetParent === null) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      waited += intervalMs;
    }
  }
}

// Export singleton instance
export const pruner = new PrunerEngine();
