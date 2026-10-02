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

export interface StorageSchema {
  videos: Record<string, VideoItem>;
  harvesterStatus: HarvesterStatus;
  prunerStatus: PrunerStatus;
  totalIndexed: number;
  settings: {
    floatingIconEnabled: boolean;
    autoScrollSpeedMs: number;
    deletionDelayMs: number;
  };
}
