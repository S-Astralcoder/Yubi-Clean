import { VideoItem } from '../types';

export interface PruneProgress {
  total: number;
  completed: number;
  failed: number;
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
    failed: 0,
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
   * Dispatches realistic composed pointer and mouse events across Web Component shadow boundaries.
   */
  private dispatchComposedClick(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const eventInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY,
    };

    el.dispatchEvent(new PointerEvent('pointerdown', eventInit));
    el.dispatchEvent(new MouseEvent('mousedown', eventInit));
    el.dispatchEvent(new PointerEvent('pointerup', eventInit));
    el.dispatchEvent(new MouseEvent('mouseup', eventInit));
    el.click();
  }

  /**
   * Executes the sequential, throttled top-down deletion queue.
   */
  public async executePrune(
    targetVideos: VideoItem[],
    options: { throttleDelayMs?: number } = {}
  ): Promise<{ deletedIds: string[]; failedIds: string[]; wasAborted: boolean }> {
    if (this.status === 'running') {
      console.warn('[YT-WL-Gardener] Pruner is already running.');
      return { deletedIds: [], failedIds: [], wasAborted: false };
    }

    const throttleDelayMs = options.throttleDelayMs ?? 600;
    this.status = 'running';
    this.pauseRequested = false;
    this.abortRequested = false;

    this.notify({
      total: targetVideos.length,
      completed: 0,
      failed: 0,
      currentTitle: '',
      currentId: '',
      status: 'running',
      errorMessage: undefined,
    });

    const deletedIds: string[] = [];
    const failedIds: string[] = [];

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
          failed: failedIds.length,
          currentTitle: target.title,
          currentId: target.id,
        });

        console.log(`[YT-WL-Gardener] (${i + 1}/${targetVideos.length}) Processing: "${target.title}"`);

        // 3. Locate target element in DOM with auto-scroll fallback
        const targetElement = await this.locateTargetElement(target);

        if (!targetElement) {
          console.warn(`[YT-WL-Gardener] Could not locate video in DOM: "${target.title}". Skipping.`);
          failedIds.push(target.id);
          this.notify({ failed: failedIds.length });
          continue;
        }

        // 4. Instant scroll target into center view (instant avoid smooth scroll latency)
        targetElement.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 5. Open action menu
        const menuOpened = await this.openActionMenu(targetElement);
        if (!menuOpened) {
          console.warn(`[YT-WL-Gardener] Failed to open menu for: "${target.title}". Skipping.`);
          failedIds.push(target.id);
          this.notify({ failed: failedIds.length });
          continue;
        }

        // 6. Find and click "Remove from..." action item
        const removed = await this.clickRemoveAction();
        if (!removed) {
          console.warn(`[YT-WL-Gardener] Could not find "Remove" option for: "${target.title}". Dismissing.`);
          document.body.click();
          await new Promise((resolve) => setTimeout(resolve, 200));
          failedIds.push(target.id);
          this.notify({ failed: failedIds.length });
          continue;
        }

        // 7. Verify removal / detachment from DOM
        await this.awaitRemovalOrDisappearance(targetElement);

        deletedIds.push(target.id);
        this.notify({ completed: deletedIds.length });

        // 8. Human-like throttle delay between actions
        await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));
      }

      if (this.abortRequested) {
        this.status = 'aborted';
      } else if (deletedIds.length === 0 && targetVideos.length > 0) {
        this.status = 'error';
        this.notify({
          errorMessage: 'YouTube menu items were not detected. Check that you are in Watch Later and have permission to edit this playlist.',
        });
      } else {
        this.status = 'finished';
      }
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
      console.log(`[YT-WL-Gardener] Pruner ended. Removed: ${deletedIds.length}, Failed: ${failedIds.length}`);
    }

    return { deletedIds, failedIds, wasAborted: this.abortRequested };
  }

  /**
   * Finds the DOM element for a target video, scrolling down if necessary.
   */
  private async locateTargetElement(target: VideoItem): Promise<HTMLElement | null> {
    let attempts = 0;
    const maxScrollAttempts = 8;

    while (attempts < maxScrollAttempts) {
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
      window.scrollBy({ top: 800, behavior: 'instant' as ScrollBehavior });
      await new Promise((resolve) => setTimeout(resolve, 300));
      attempts++;
    }

    return null;
  }

  /**
   * Clicks the 3-dot action menu button on a video renderer.
   * Targets the native <button> inside Polymer custom element wrappers.
   */
  private async openActionMenu(rendererEl: HTMLElement): Promise<boolean> {
    // 1. Hover video row to reveal the hidden 3-dot menu button
    rendererEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    rendererEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));

    // 2. Locate native button first, then wrapper
    const nativeBtn = rendererEl.querySelector<HTMLElement>(
      'button[aria-label="Action menu"], #menu button, yt-icon-button#button button, ytd-menu-renderer button'
    );
    const wrapperBtn = rendererEl.querySelector<HTMLElement>(
      'ytd-menu-renderer yt-icon-button#button, #menu yt-icon-button#button, yt-icon-button'
    );
    const targetBtn = nativeBtn || wrapperBtn;

    if (!targetBtn) {
      console.warn('[YT-WL-Gardener] 3-dot action button not found on video row');
      return false;
    }

    // 3. Dispatch composed click
    this.dispatchComposedClick(targetBtn);

    // 4. Await dropdown to appear in the DOM
    const maxWaitMs = 1200;
    const intervalMs = 80;
    let waited = 0;

    while (waited < maxWaitMs) {
      if (this.isDropdownOpen()) {
        return true;
      }

      // Retry click at halfway mark if still not open
      if (waited === 480) {
        this.dispatchComposedClick(targetBtn);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      waited += intervalMs;
    }

    return false;
  }

  /**
   * Checks whether YouTube's action menu dropdown is actively open and visible.
   */
  private isDropdownOpen(): boolean {
    // Check all iron-dropdown elements
    const dropdowns = Array.from(
      document.querySelectorAll<HTMLElement>('tp-yt-iron-dropdown, ytd-popup-container')
    );

    for (const dd of dropdowns) {
      const isHidden = 
        dd.getAttribute('aria-hidden') === 'true' || 
        dd.style.display === 'none' ||
        dd.style.visibility === 'hidden';

      if (!isHidden) {
        // Verify child menu items exist and have rendered layout
        const items = dd.querySelectorAll<HTMLElement>(
          'ytd-menu-service-item-renderer, tp-yt-paper-item, yt-formatted-string'
        );
        for (const item of Array.from(items)) {
          if (item.offsetParent !== null) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Searches the opened popup menu for "Remove from..." and clicks it directly.
   */
  private async clickRemoveAction(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Candidates: paper items and text elements inside dropdown containers
    const candidateSelectors = [
      'tp-yt-iron-dropdown:not([aria-hidden="true"]) yt-formatted-string',
      'tp-yt-iron-dropdown:not([aria-hidden="true"]) tp-yt-paper-item',
      'ytd-popup-container yt-formatted-string',
      'ytd-popup-container tp-yt-paper-item',
      'ytd-menu-popup-renderer yt-formatted-string',
      'ytd-menu-popup-renderer tp-yt-paper-item',
    ];

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(candidateSelectors.join(', '))
    );

    for (const el of elements) {
      // Must be visible on screen
      if (el.offsetParent === null) continue;

      const text = el.textContent?.toLowerCase().trim() || '';

      const isMatch =
        text.includes('remove from') ||
        text.includes('remove') ||
        text.includes('delete') ||
        text.includes('supprimer') ||
        text.includes('entfernen') ||
        text.includes('verwijderen') ||
        text.includes('eliminar');

      if (isMatch) {
        console.log(`[YT-WL-Gardener] Click target matched: "${text}"`);

        // Click the text element
        this.dispatchComposedClick(el);

        // Also click parent paper-item if distinct
        const parentPaper = el.closest<HTMLElement>('tp-yt-paper-item');
        if (parentPaper && parentPaper !== el) {
          this.dispatchComposedClick(parentPaper);
        }

        // Check if YouTube presents a confirmation dialog (e.g. "Remove from playlist?")
        await new Promise((resolve) => setTimeout(resolve, 200));
        const confirmBtn = document.querySelector<HTMLElement>(
          'yt-confirm-dialog-renderer #confirm-button button, yt-confirm-dialog-renderer #confirm-button, yt-button-renderer#confirm-button button'
        );
        if (confirmBtn && confirmBtn.offsetParent !== null) {
          this.dispatchComposedClick(confirmBtn);
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
