import React, { useState, useMemo } from 'react';
import { VideoItem } from '../../types';
import { 
  Check, 
  Search, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Filter
} from 'lucide-react';

interface VideoReviewTableProps {
  videos: VideoItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMultiple: (ids: string[], select: boolean) => void;
  isDark?: boolean;
}

export const VideoReviewTable: React.FC<VideoReviewTableProps> = ({
  videos,
  selectedIds,
  onToggleSelect,
  onSelectMultiple,
  isDark = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'dead' | 'watched' | 'shorts'>('all');

  // Filter videos based on active category & search query
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      // 1. Category Filter
      if (activeFilter === 'dead' && !v.isUnavailable) return false;
      if (activeFilter === 'watched' && !v.isWatched && v.watchProgressPercent < 90) return false;
      if (activeFilter === 'shorts' && v.durationSeconds >= 60) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = v.title.toLowerCase().includes(query);
        const channelMatch = v.channelName.toLowerCase().includes(query);
        return titleMatch || channelMatch;
      }

      return true;
    });
  }, [videos, activeFilter, searchQuery]);

  // Bulk actions for visible filtered list
  const handleSelectAllVisible = () => {
    const visibleIds = filteredVideos.map((v) => v.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    onSelectMultiple(visibleIds, !allSelected);
  };

  const isAllVisibleSelected = filteredVideos.length > 0 && filteredVideos.every((v) => selectedIds.has(v.id));

  const themeClasses = isDark ? {
    searchBg: 'bg-[#181818] border-white/10 text-white placeholder-neutral-500 focus:border-red-500',
    itemHover: 'hover:bg-white/5',
    itemSelected: 'bg-white/10',
    textMuted: 'text-[#AAAAAA]',
    border: 'border-white/10',
    chipActive: 'bg-white text-black font-medium',
    chipInactive: 'bg-[#212121] text-neutral-300 hover:bg-[#2A2A2A] border border-white/10',
  } : {
    searchBg: 'bg-[#F2F2F2] border-black/10 text-black placeholder-neutral-400 focus:border-red-500',
    itemHover: 'hover:bg-black/5',
    itemSelected: 'bg-black/10',
    textMuted: 'text-[#606060]',
    border: 'border-black/10',
    chipActive: 'bg-black text-white font-medium',
    chipInactive: 'bg-[#F2F2F2] text-neutral-800 hover:bg-[#EAEAEA] border border-black/10',
  };

  return (
    <div className="space-y-3">
      {/* Search Bar & Filter Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
          <input
            type="text"
            placeholder="Search by title or channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${themeClasses.searchBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${themeClasses.textMuted} hover:text-white`}
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                activeFilter === 'all' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              All ({videos.length})
            </button>

            <button
              onClick={() => setActiveFilter('dead')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                activeFilter === 'dead' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <EyeOff size={12} className="text-red-500" />
              <span>Unavailable</span>
            </button>

            <button
              onClick={() => setActiveFilter('watched')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                activeFilter === 'watched' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Watched</span>
            </button>

            <button
              onClick={() => setActiveFilter('shorts')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                activeFilter === 'shorts' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <Clock size={12} />
              <span>Shorts</span>
            </button>
          </div>

          <button
            onClick={handleSelectAllVisible}
            className={`text-[11px] font-medium whitespace-nowrap hover:underline ${themeClasses.textMuted}`}
          >
            {isAllVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
          </button>
        </div>
      </div>

      {/* Video Scrollable List */}
      <div className={`max-h-[36vh] overflow-y-auto rounded-xl border divide-y ${themeClasses.border} ${isDark ? 'divide-white/5' : 'divide-black/5'}`}>
        {filteredVideos.length === 0 ? (
          <div className={`py-8 text-center text-xs ${themeClasses.textMuted}`}>
            <Filter size={20} className="mx-auto mb-2 opacity-50" />
            No videos match the selected filter.
          </div>
        ) : (
          filteredVideos.map((video) => {
            const isSelected = selectedIds.has(video.id);

            return (
              <div
                key={video.id}
                onClick={() => onToggleSelect(video.id)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 cursor-pointer transition-colors duration-150 ${
                  isSelected ? themeClasses.itemSelected : themeClasses.itemHover
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                    isSelected
                      ? 'bg-[#FF0000] border-[#FF0000] text-white'
                      : isDark
                      ? 'border-white/30 bg-transparent'
                      : 'border-black/30 bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={11} strokeWidth={3} />}
                </div>

                {/* Thumbnail Preview */}
                <div className="relative w-14 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                      ▶
                    </div>
                  )}

                  {/* Red progress bar at bottom of thumbnail */}
                  {video.watchProgressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                      <div
                        className="h-full bg-[#FF0000]"
                        style={{ width: `${video.watchProgressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-xs font-medium truncate" title={video.title}>
                      {video.title}
                    </p>
                  </div>
                  <div className={`flex items-center space-x-2 text-[11px] mt-0.5 ${themeClasses.textMuted}`}>
                    <span className="truncate max-w-[120px]">{video.channelName}</span>
                    {video.durationText && (
                      <>
                        <span>•</span>
                        <span>{video.durationText}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex-shrink-0 flex items-center space-x-1.5">
                  {video.isUnavailable && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                      DEAD
                    </span>
                  )}
                  {video.isWatched && !video.isUnavailable && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      WATCHED
                    </span>
                  )}
                  {video.id && !video.id.startsWith('unavailable-') && (
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1 rounded hover:text-white transition-colors ${themeClasses.textMuted}`}
                      title="Open in YouTube tab"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
