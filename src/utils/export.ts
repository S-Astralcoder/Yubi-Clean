import { VideoItem } from '../types';

/**
 * Escapes a string field for valid CSV format.
 */
function escapeCsvField(field: string | number | boolean | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const str = String(field);
  // If field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports video items to a formatted CSV file and initiates browser download.
 */
export function exportVideosToCsv(videos: VideoItem[], filenamePrefix = 'YT_WatchLater_Backup'): void {
  if (!videos || videos.length === 0) {
    console.warn('[YT-WL-Gardener] No videos to export.');
    return;
  }

  const headers = [
    'Video ID',
    'Title',
    'Channel',
    'Duration',
    'Duration (Seconds)',
    'Watch Progress (%)',
    'Status',
    'Video URL',
  ];

  const rows = videos.map((v) => {
    const status = v.isUnavailable ? `Unavailable (${v.unavailableReason || 'dead'})` : v.isWatched ? 'Watched' : 'Unwatched';
    const videoUrl = v.id && !v.id.startsWith('unavailable-') ? `https://www.youtube.com/watch?v=${v.id}` : '';
    return [
      escapeCsvField(v.id),
      escapeCsvField(v.title),
      escapeCsvField(v.channelName),
      escapeCsvField(v.durationText),
      escapeCsvField(v.durationSeconds),
      escapeCsvField(v.watchProgressPercent),
      escapeCsvField(status),
      escapeCsvField(videoUrl),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n'); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Exports video items to a formatted JSON file and initiates browser download.
 */
export function exportVideosToJson(videos: VideoItem[], filenamePrefix = 'YT_WatchLater_Backup'): void {
  if (!videos || videos.length === 0) return;

  const jsonContent = JSON.stringify(videos, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.json`);
}

/**
 * Helper to trigger browser download of a generated Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
