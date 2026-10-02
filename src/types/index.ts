export interface VideoItem {
  id: string;
  title: string;
  channelName: string;
  durationText: string;
  durationSeconds: number;
  watchProgressPercent: number; // 0 to 100
  isUnavailable: boolean; // [Deleted video] or [Private video]
  unavailableReason?: 'deleted' | 'private' | 'blocked' | 'unknown';
  domIndex: number;
}

export type HarvesterStatus = 'idle' | 'scanning' | 'paused' | 'completed' | 'error';

export type PrunerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted' | 'error';

export interface UserQuota {
  pointsRemaining: number;
  pointsTotal: number;
  tier: 'free' | 'deep_clean' | 'pro';
}

export interface StorageSchema {
  videos: Record<string, VideoItem>;
  harvesterStatus: HarvesterStatus;
  prunerStatus: PrunerStatus;
  totalIndexed: number;
  quota: UserQuota;
  settings: {
    floatingIconEnabled: boolean;
    autoScrollSpeedMs: number;
    deletionDelayMs: number;
  };
}

/**
 * Calculates required points:
 * - 5 dead/unavailable videos = 1 point
 * - 1 standard analyzed/filtered video = 1 point
 */
export function calculateRequiredPoints(deadCount: number, standardCount: number): number {
  const deadPoints = Math.ceil(deadCount / 5);
  return deadPoints + standardCount;
}
