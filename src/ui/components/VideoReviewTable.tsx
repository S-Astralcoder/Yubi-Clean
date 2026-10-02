import React, { useState, useMemo } from 'react';
import { VideoItem } from '../../types';
import { 
  Check, 
  Search, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Filter,
  X
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
    searchBg: 'bg-[#1E1E1E] border-white/10 text-white placeholder-neutral-500 focus:border-red-500',
    itemHover: 'hover:bg-white/5',
    itemSelected: 'bg-white/10',
    textMuted: 'text-[#AAAAAA]',
    border: 'border-white/10',
    chipActive: 'bg-white text-black font-semibold',
    chipInactive: 'bg-[#212121] text-neutral-300 hover:bg-[#2A2A2A] border border-white/10',
  } : {
    searchBg: 'bg-[#F2F2F2] border-black/10 text-black placeholder-neutral-400 focus:border-red-500',
    itemHover: 'hover:bg-black/5',
    itemSelected: 'bg-black/10',
    textMuted: 'text-[#606060]',
    border: 'border-black/10',
    chipActive: 'bg-black text-white font-semibold',
    chipInactive: 'bg-[#F2F2F2] text-neutral-800 hover:bg-[#EAEAEA] border border-black/10',
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={17} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
          <input
            type="text"
            placeholder="Search playlist by title or channel name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none border transition-all ${themeClasses.searchBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${themeClasses.textMuted} hover:text-white`}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs transition-colors ${
                activeFilter === 'all' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              All ({videos.length})
            </button>

            <button
              onClick={() => setActiveFilter('dead')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                activeFilter === 'dead' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <EyeOff size={13} className="text-red-500" />
              <span>Unavailable</span>
            </button>

            <button
              onClick={() => setActiveFilter('watched')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                activeFilter === 'watched' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Watched</span>
            </button>

            <button
              onClick={() => setActiveFilter('shorts')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                activeFilter === 'shorts' ? themeClasses.chipActive : themeClasses.chipInactive
              }`}
            >
              <Clock size={13} />
              <span>Shorts</span>
            </button>
          </div>

          <button
            onClick={handleSelectAllVisible}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border border-transparent hover:border-white/10 ${themeClasses.textMuted} hover:text-white transition-colors`}
          >
            {isAllVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
          </button>
        </div>
      </div>

      {/* Video Scrollable List with Large Clear Previews */}
      <div className={`flex-1 min-h-[300px] overflow-y-auto rounded-2xl border divide-y ${themeClasses.border} ${isDark ? 'divide-white/5' : 'divide-black/5'}`}>
        {filteredVideos.length === 0 ? (
          <div className={`py-16 text-center text-sm ${themeClasses.textMuted}`}>
            <Filter size={28} className="mx-auto mb-2.5 opacity-40" />
            No videos match the selected filter.
          </div>
        ) : (
          filteredVideos.map((video) => {
            const isSelected = selectedIds.has(video.id);

            return (
              <div
                key={video.id}
                onClick={() => onToggleSelect(video.id)}
                className={`flex items-center space-x-4 px-4 py-3 cursor-pointer transition-colors duration-150 ${
                  isSelected ? themeClasses.itemSelected : themeClasses.itemHover
                }`}
              >
                {/* Large Checkbox */}
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-md border transition-colors flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#FF0000] border-[#FF0000] text-white'
                      : isDark
                      ? 'border-white/30 bg-transparent'
                      : 'border-black/30 bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </div>

                {/* Large 16:9 Thumbnail Preview (112px x 64px) */}
                <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 border border-white/5">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                      ▶
                    </div>
                  )}

                  {/* Red progress bar at bottom of thumbnail */}
                  {video.watchProgressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                      <div
                        className="h-full bg-[#FF0000]"
                        style={{ width: `${video.watchProgressPercent}%` }}
                      />
                    </div>
                  )}

                  {/* Duration overlay badge */}
                  {video.durationText && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-white">
                      {video.durationText}
                    </span>
                  )}
                </div>

                {/* Video Title and Metadata */}
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-sm font-semibold text-neutral-100 leading-snug line-clamp-2" title={video.title}>
                    {video.title}
                  </h3>
                  <div className={`flex items-center space-x-2 text-xs mt-1 ${themeClasses.textMuted}`}>
                    <span className="truncate max-w-[200px] font-medium">{video.channelName}</span>
                    {video.watchProgressPercent > 0 && (
                      <>
                        <span>•</span>
                        <span className={video.isWatched ? 'text-emerald-400 font-medium' : ''}>
                          {video.watchProgressPercent}% watched
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badges & External Link */}
                <div className="flex-shrink-0 flex items-center space-x-2">
                  {video.isUnavailable && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                      UNAVAILABLE
                    </span>
                  )}
                  {video.isWatched && !video.isUnavailable && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      WATCHED
                    </span>
                  )}
                  {video.id && !video.id.startsWith('unavailable-') && (
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors ${themeClasses.textMuted}`}
                      title="Open video in new tab"
                    >
                      <ExternalLink size={15} />
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
