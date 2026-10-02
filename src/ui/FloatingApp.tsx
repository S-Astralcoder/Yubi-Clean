import React, { useState, useEffect, useMemo } from 'react';
import { GardenerLogo } from './icons/GardenerLogo';
import { 
  X, 
  Trash2, 
  EyeOff, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  RefreshCw, 
  Coins, 
  Square,
  FileJson,
  Sparkles,
  Check,
  Minus
} from 'lucide-react';
import { UserQuota, VideoItem } from '../types';
import { harvester, HarvestProgress } from '../content/harvester';
import { pruner, PruneProgress } from '../content/pruner';
import { exportVideosToCsv, exportVideosToJson } from '../utils/export';
import { VideoReviewTable } from './components/VideoReviewTable';
import { PruneProgressModal } from './components/PruneProgressModal';

interface FloatingAppProps {
  playlistTitle?: string;
  isWatchLater?: boolean;
  isDark?: boolean;
}

export const FloatingApp: React.FC<FloatingAppProps> = ({ 
  playlistTitle = 'Watch Later',
  isWatchLater = true,
  isDark = true
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quota, setQuota] = useState<UserQuota>({
    pointsRemaining: 75,
    pointsTotal: 75,
    tier: 'free'
  });

  const [videosList, setVideosList] = useState<VideoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Harvester Progress State
  const [harvestProgress, setHarvestProgress] = useState<HarvestProgress>({
    total: 0,
    deadCount: 0,
    watchedCount: 0,
    isScanning: false,
    isCompleted: false,
  });

  // Pruner Progress & Modal State
  const [isPruneModalOpen, setIsPruneModalOpen] = useState<boolean>(false);
  const [pruneProgress, setPruneProgress] = useState<PruneProgress>({
    total: 0,
    completed: 0,
    currentTitle: '',
    currentId: '',
    status: 'idle',
  });

  // Subscriptions and storage synchronization
  useEffect(() => {
    // 1. Subscribe to Harvester
    const unsubHarvester = harvester.subscribe((p) => {
      setHarvestProgress(p);
      setVideosList(harvester.getVideos());
    });

    // 2. Subscribe to Pruner
    const unsubPruner = pruner.subscribe((p) => {
      setPruneProgress(p);
    });

    // 3. Load persisted quota and previous scan records
    chrome.storage?.local?.get(['quota', 'videos', 'totalIndexed'], (res: Record<string, any>) => {
      if (res?.quota) {
        setQuota(res.quota as UserQuota);
      }
      if (res?.videos && typeof res?.totalIndexed === 'number') {
        const videos = Object.values(res.videos) as VideoItem[];
        setVideosList(videos);

        let dead = 0;
        let watched = 0;
        videos.forEach((v) => {
          if (v.isUnavailable) dead++;
          else if (v.isWatched || v.watchProgressPercent >= 90) watched++;
        });

        setHarvestProgress((prev) => ({
          ...prev,
          total: res.totalIndexed,
          deadCount: dead,
          watchedCount: watched,
        }));
      }
    });

    // 4. Listen for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.quota && changes.quota.newValue) {
        setQuota(changes.quota.newValue as UserQuota);
      }
      if (changes.videos && changes.videos.newValue) {
        setVideosList(Object.values(changes.videos.newValue) as VideoItem[]);
      }
    };

    chrome.storage?.onChanged?.addListener(storageListener);
    return () => {
      unsubHarvester();
      unsubPruner();
      chrome.storage?.onChanged?.removeListener(storageListener);
    };
  }, []);

  // Compute live selection stats for each category
  const categoryStats = useMemo(() => {
    const deadVideos = videosList.filter((v) => v.isUnavailable);
    const watchedVideos = videosList.filter((v) => v.isWatched || v.watchProgressPercent >= 90);
    const shortsVideos = videosList.filter((v) => v.durationSeconds < 60 && !v.isUnavailable);

    const deadSelectedCount = deadVideos.filter((v) => selectedIds.has(v.id)).length;
    const watchedSelectedCount = watchedVideos.filter((v) => selectedIds.has(v.id)).length;
    const shortsSelectedCount = shortsVideos.filter((v) => selectedIds.has(v.id)).length;

    return {
      dead: {
        total: deadVideos.length,
        selected: deadSelectedCount,
        isAllSelected: deadVideos.length > 0 && deadSelectedCount === deadVideos.length,
        isPartiallySelected: deadSelectedCount > 0 && deadSelectedCount < deadVideos.length,
      },
      watched: {
        total: watchedVideos.length,
        selected: watchedSelectedCount,
        isAllSelected: watchedVideos.length > 0 && watchedSelectedCount === watchedVideos.length,
        isPartiallySelected: watchedSelectedCount > 0 && watchedSelectedCount < watchedVideos.length,
      },
      shorts: {
        total: shortsVideos.length,
        selected: shortsSelectedCount,
        isAllSelected: shortsVideos.length > 0 && shortsSelectedCount === shortsVideos.length,
        isPartiallySelected: shortsSelectedCount > 0 && shortsSelectedCount < shortsVideos.length,
      },
    };
  }, [videosList, selectedIds]);

  // Calculate real-time points required for currently selected videos
  const { deadSelected, standardSelected, requiredPoints } = useMemo(() => {
    let dead = 0;
    let standard = 0;

    for (const id of selectedIds) {
      const item = videosList.find((v) => v.id === id);
      if (item) {
        if (item.isUnavailable) {
          dead++;
        } else {
          standard++;
        }
      }
    }

    const deadPoints = Math.ceil(dead / 5);
    const cost = deadPoints + standard;

    return {
      deadSelected: dead,
      standardSelected: standard,
      requiredPoints: cost,
    };
  }, [videosList, selectedIds]);

  const hasSufficientPoints = quota.pointsRemaining >= requiredPoints;
  const quotaPercent = Math.max(0, Math.min(100, (quota.pointsRemaining / quota.pointsTotal) * 100));

  const handleScanToggle = () => {
    if (harvestProgress.isScanning) {
      harvester.stop();
    } else {
      setSelectedIds(new Set());
      harvester.start();
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectMultiple = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // Category Quick Toggle
  const handleToggleCategory = (category: 'dead' | 'watched' | 'shorts') => {
    let targetVideos: VideoItem[] = [];
    if (category === 'dead') {
      targetVideos = videosList.filter((v) => v.isUnavailable);
    } else if (category === 'watched') {
      targetVideos = videosList.filter((v) => v.isWatched || v.watchProgressPercent >= 90);
    } else if (category === 'shorts') {
      targetVideos = videosList.filter((v) => v.durationSeconds < 60 && !v.isUnavailable);
    }

    const targetIds = targetVideos.map((v) => v.id);
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedIds.has(id));

    handleSelectMultiple(targetIds, !allSelected);
  };

  // Export handlers
  const handleExportCsv = (onlySelected = false) => {
    const listToExport = onlySelected 
      ? videosList.filter((v) => selectedIds.has(v.id))
      : videosList;
    exportVideosToCsv(listToExport, onlySelected ? 'YT_WatchLater_Selected' : 'YT_WatchLater_FullBackup');
  };

  const handleExportJson = () => {
    exportVideosToJson(videosList, 'YT_WatchLater_FullBackup');
  };

  // ── Stage 5: Prune Handlers ──
  const handleOpenPruneModal = () => {
    if (selectedIds.size === 0 || !hasSufficientPoints) return;
    setIsPruneModalOpen(true);
  };

  const handleConfirmStartPrune = async () => {
    // 1. Sort monotonic top-down by DOM index to guarantee downward scrolling
    const targetVideos = videosList
      .filter((v) => selectedIds.has(v.id))
      .sort((a, b) => a.domIndex - b.domIndex);

    // 2. Execute deletion queue
    const { deletedIds } = await pruner.executePrune(targetVideos);

    if (deletedIds.length > 0) {
      // 3. Calculate points consumed by successfully deleted items
      let deadDel = 0;
      let standardDel = 0;
      for (const id of deletedIds) {
        const item = videosList.find((v) => v.id === id);
        if (item?.isUnavailable) deadDel++;
        else standardDel++;
      }
      const pointsConsumed = Math.ceil(deadDel / 5) + standardDel;
      const updatedPoints = Math.max(0, quota.pointsRemaining - pointsConsumed);

      // 4. Update remaining videos list
      const remainingVideos = videosList.filter((v) => !deletedIds.includes(v.id));
      setVideosList(remainingVideos);

      // 5. Clear deleted IDs from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      // 6. Persist updated quota and remaining videos to chrome.storage.local
      const rawRecords: Record<string, VideoItem> = {};
      remainingVideos.forEach((v) => {
        rawRecords[v.id] = v;
      });

      const updatedQuota: UserQuota = {
        ...quota,
        pointsRemaining: updatedPoints,
      };
      setQuota(updatedQuota);

      await chrome.storage?.local?.set({
        quota: updatedQuota,
        videos: rawRecords,
        totalIndexed: remainingVideos.length,
      });

      console.log(`[YT-WL-Gardener] Prune complete. Deducted ${pointsConsumed} pts. Remaining: ${updatedPoints} pts.`);
    }
  };

  // Dynamic theme variables matching native YouTube
  const themeClasses = isDark ? {
    container: 'yt-dark text-[#F1F1F1]',
    fab: 'bg-[#0F0F0F] text-[#F1F1F1] border border-white/20 shadow-yt-fab hover:bg-[#212121]',
    backdrop: 'bg-black/65 backdrop-blur-[3px]',
    modal: 'bg-[#0F0F0F]/98 text-[#F1F1F1] border border-white/15 shadow-yt-modal',
    header: 'border-b border-white/10 bg-[#181818]/90',
    logoContainer: 'bg-[#212121] border border-white/10',
    badge: 'bg-white/10 text-white/90 border border-white/10',
    closeBtn: 'text-neutral-400 hover:text-white hover:bg-white/10',
    card: 'bg-[#1E1E1E]/90 border border-white/10',
    subCard: 'bg-[#181818]/80 border border-white/5',
    barTrack: 'bg-white/10',
    btnPrimary: 'bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-md active:bg-[#AA0000]',
    btnStop: 'bg-[#272727] hover:bg-[#383838] text-white border border-red-500/40',
    btnSecondary: 'bg-[#272727] hover:bg-[#383838] text-white border border-white/10',
    btnChip: 'bg-[#212121] hover:bg-[#2A2A2A] text-neutral-200 border border-white/10',
    footer: 'border-t border-white/10 bg-[#181818]/90 text-neutral-400',
    divider: 'border-white/10',
    mutedText: 'text-[#AAAAAA]',
  } : {
    container: 'yt-light text-[#0F0F0F]',
    fab: 'bg-white text-[#0F0F0F] border border-black/15 shadow-yt-fab hover:bg-[#F2F2F2]',
    backdrop: 'bg-black/35 backdrop-blur-[3px]',
    modal: 'bg-white/98 text-[#0F0F0F] border border-black/15 shadow-yt-modal-light',
    header: 'border-b border-black/10 bg-[#F9F9F9]/90',
    logoContainer: 'bg-[#F2F2F2] border border-black/10',
    badge: 'bg-black/5 text-black/80 border border-black/10',
    closeBtn: 'text-neutral-500 hover:text-black hover:bg-black/5',
    card: 'bg-[#F8F8F8] border border-black/10',
    subCard: 'bg-[#F2F2F2]/80 border border-black/5',
    barTrack: 'bg-black/10',
    btnPrimary: 'bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-sm active:bg-[#AA0000]',
    btnStop: 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-red-600 border border-red-500/40',
    btnSecondary: 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0F0F0F] border border-black/10',
    btnChip: 'bg-[#F2F2F2] hover:bg-[#EAEAEA] text-neutral-800 border border-black/10',
    footer: 'border-t border-black/10 bg-[#F9F9F9]/90 text-neutral-500',
    divider: 'border-black/10',
    mutedText: 'text-[#606060]',
  };

  return (
    <div className={`font-sans antialiased select-none ${themeClasses.container}`}>
      {/* ── 1. Floating Action Button (FAB) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-[9999999] group flex items-center justify-center w-14 h-14 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 ${themeClasses.fab}`}
          title="Open YT-WL-Gardener"
        >
          <GardenerLogo size={32} isDark={isDark} className="transition-transform duration-200 group-hover:rotate-6" />

          {/* Real-time scanning animation badge on FAB */}
          {harvestProgress.isScanning ? (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FF0000] text-[9px] font-bold text-white items-center justify-center">
                •
              </span>
            </span>
          ) : selectedIds.size > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="relative inline-flex rounded-full h-5 w-5 bg-[#FF0000] text-[10px] font-bold text-white items-center justify-center shadow">
                {selectedIds.size}
              </span>
            </span>
          ) : (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF0000] border border-black/20"></span>
            </span>
          )}
        </button>
      )}

      {/* ── 2. Full-Size Centered Dashboard Modal (90% Width / 88% Height) ── */}
      {isOpen && (
        <>
          {/* Ambient Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            className={`fixed inset-0 z-[9999998] transition-opacity duration-200 ${themeClasses.backdrop}`}
          />

          {/* Centered Modal Container */}
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[1360px] h-[88vh] max-h-[920px] z-[9999999] flex flex-col rounded-3xl overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 ease-out ${themeClasses.modal}`}>
            
            {/* Header */}
            <div className={`flex items-center justify-between px-7 py-4.5 ${themeClasses.header}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-2xl ${themeClasses.logoContainer}`}>
                  <GardenerLogo size={30} isDark={isDark} />
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h1 className="text-xl font-bold tracking-tight">
                      YouTube Playlist Gardener
                    </h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${themeClasses.badge}`}>
                      {quota.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-2 text-xs mt-1 ${themeClasses.mutedText}`}>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium">{isWatchLater ? 'Watch Later Playlist' : playlistTitle}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2.5 rounded-full transition-colors duration-150 ${themeClasses.closeBtn}`}
                title="Close Dashboard"
              >
                <X size={22} />
              </button>
            </div>

            {/* Split-Pane Body Layout (Spacious 2 Columns) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* ── Left Sidebar / Control Panel (360px) ── */}
              <div className={`w-[360px] flex-shrink-0 flex flex-col justify-between p-6 space-y-4 overflow-y-auto border-r ${themeClasses.divider}`}>
                
                <div className="space-y-4">
                  {/* Usage Balance Card */}
                  <div className={`p-4 rounded-2xl space-y-3 ${themeClasses.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-red-500/10 text-[#FF0000]">
                          <Coins size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Usage Balance</div>
                          <div className={`text-xs ${themeClasses.mutedText}`}>Free tier credits</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#FF0000]">{quota.pointsRemaining}</span>
                        <span className={`text-xs ${themeClasses.mutedText}`}> / {quota.pointsTotal} pts</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className={`w-full rounded-full h-2 overflow-hidden ${themeClasses.barTrack}`}>
                      <div 
                        className="bg-[#FF0000] h-full rounded-full transition-all duration-300"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>

                    {/* Rates breakdown */}
                    <div className={`flex items-center justify-between pt-1 text-xs border-t ${themeClasses.divider} ${themeClasses.mutedText}`}>
                      <span><strong>1 pt</strong> = 5 Unavailable</span>
                      <span>•</span>
                      <span><strong>1 pt</strong> = 1 Filtered</span>
                    </div>
                  </div>

                  {/* Harvester Scan Controller */}
                  <div className={`p-4 rounded-2xl space-y-3 ${themeClasses.card}`}>
                    <div>
                      <h2 className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles size={15} className="text-[#FF0000]" />
                        Playlist Scanner
                      </h2>
                      <p className={`text-xs mt-1 leading-relaxed ${themeClasses.mutedText}`}>
                        {harvestProgress.isScanning 
                          ? `Harvesting... ${harvestProgress.total} videos indexed.`
                          : harvestProgress.isCompleted
                          ? `Finished: ${harvestProgress.total} videos indexed.`
                          : 'Scan all playlist items to index thumbnails, titles, and watch history.'}
                      </p>
                    </div>

                    <button
                      onClick={handleScanToggle}
                      className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all duration-150 active:scale-[0.99] ${
                        harvestProgress.isScanning ? themeClasses.btnStop : themeClasses.btnPrimary
                      }`}
                    >
                      {harvestProgress.isScanning ? (
                        <>
                          <Square size={14} className="fill-current" />
                          <span>Stop Scanner ({harvestProgress.total} Found)</span>
                        </>
                      ) : harvestProgress.total > 0 ? (
                        <>
                          <RefreshCw size={14} />
                          <span>Re-Scan Playlist ({harvestProgress.total})</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Scan & Index Playlist</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metrics Overview Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className={`p-3 rounded-xl text-center ${themeClasses.subCard}`}>
                      <div className="text-xl font-bold">{harvestProgress.total}</div>
                      <div className={`text-xs uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>Indexed</div>
                    </div>

                    <div className={`p-3 rounded-xl text-center ${themeClasses.subCard}`}>
                      <div className="text-xl font-bold text-red-500">{harvestProgress.deadCount}</div>
                      <div className={`text-xs uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>Unavailable</div>
                    </div>

                    <div className={`p-3 rounded-xl text-center ${themeClasses.subCard}`}>
                      <div className="text-xl font-bold text-emerald-500">{harvestProgress.watchedCount}</div>
                      <div className={`text-xs uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>Watched</div>
                    </div>
                  </div>

                  {/* Reactive Bulk Category Selectors with Visual Checkbox State */}
                  <div className="space-y-2">
                    <div className={`text-xs font-semibold uppercase tracking-wider flex items-center justify-between ${themeClasses.mutedText}`}>
                      <span>Bulk Category Select</span>
                      <span className="text-[10px]">Ticked when active</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Unavailable Selector Card */}
                      <button 
                        onClick={() => handleToggleCategory('dead')}
                        disabled={categoryStats.dead.total === 0}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl text-xs transition-all duration-150 border ${
                          categoryStats.dead.isAllSelected
                            ? 'bg-red-500/20 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                            : categoryStats.dead.isPartiallySelected
                            ? 'bg-red-500/10 border-red-500/50'
                            : themeClasses.btnChip
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title="Toggle selection of all dead/unavailable videos"
                      >
                        <div className={`absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          categoryStats.dead.isAllSelected
                            ? 'bg-red-500 border-red-500 text-white'
                            : categoryStats.dead.isPartiallySelected
                            ? 'bg-red-500/30 border-red-400 text-white'
                            : isDark ? 'border-white/20 bg-transparent' : 'border-black/20 bg-transparent'
                        }`}>
                          {categoryStats.dead.isAllSelected && <Check size={11} strokeWidth={3} />}
                          {categoryStats.dead.isPartiallySelected && <Minus size={11} strokeWidth={3} />}
                        </div>

                        <EyeOff size={18} className="text-red-500 mb-1" />
                        <span className="font-semibold text-white">Unavailable</span>
                        <span className={`text-[11px] font-medium mt-0.5 ${
                          categoryStats.dead.isAllSelected ? 'text-red-400 font-bold' : themeClasses.mutedText
                        }`}>
                          {categoryStats.dead.selected > 0 
                            ? `${categoryStats.dead.selected}/${categoryStats.dead.total}`
                            : `${categoryStats.dead.total}`}
                        </span>
                      </button>

                      {/* Watched Selector Card */}
                      <button 
                        onClick={() => handleToggleCategory('watched')}
                        disabled={categoryStats.watched.total === 0}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl text-xs transition-all duration-150 border ${
                          categoryStats.watched.isAllSelected
                            ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                            : categoryStats.watched.isPartiallySelected
                            ? 'bg-emerald-500/10 border-emerald-500/50'
                            : themeClasses.btnChip
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title="Toggle selection of all 100% watched videos"
                      >
                        <div className={`absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          categoryStats.watched.isAllSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : categoryStats.watched.isPartiallySelected
                            ? 'bg-emerald-500/30 border-emerald-400 text-white'
                            : isDark ? 'border-white/20 bg-transparent' : 'border-black/20 bg-transparent'
                        }`}>
                          {categoryStats.watched.isAllSelected && <Check size={11} strokeWidth={3} />}
                          {categoryStats.watched.isPartiallySelected && <Minus size={11} strokeWidth={3} />}
                        </div>

                        <CheckCircle2 size={18} className="text-emerald-500 mb-1" />
                        <span className="font-semibold text-white">Watched</span>
                        <span className={`text-[11px] font-medium mt-0.5 ${
                          categoryStats.watched.isAllSelected ? 'text-emerald-400 font-bold' : themeClasses.mutedText
                        }`}>
                          {categoryStats.watched.selected > 0 
                            ? `${categoryStats.watched.selected}/${categoryStats.watched.total}`
                            : `${categoryStats.watched.total}`}
                        </span>
                      </button>

                      {/* Shorts Selector Card */}
                      <button 
                        onClick={() => handleToggleCategory('shorts')}
                        disabled={categoryStats.shorts.total === 0}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl text-xs transition-all duration-150 border ${
                          categoryStats.shorts.isAllSelected
                            ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                            : categoryStats.shorts.isPartiallySelected
                            ? 'bg-blue-500/10 border-blue-500/50'
                            : themeClasses.btnChip
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title="Toggle selection of all shorts (<60s)"
                      >
                        <div className={`absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                          categoryStats.shorts.isAllSelected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : categoryStats.shorts.isPartiallySelected
                            ? 'bg-blue-500/30 border-blue-400 text-white'
                            : isDark ? 'border-white/20 bg-transparent' : 'border-black/20 bg-transparent'
                        }`}>
                          {categoryStats.shorts.isAllSelected && <Check size={11} strokeWidth={3} />}
                          {categoryStats.shorts.isPartiallySelected && <Minus size={11} strokeWidth={3} />}
                        </div>

                        <Trash2 size={18} className="text-blue-400 mb-1" />
                        <span className="font-semibold text-white">Shorts</span>
                        <span className={`text-[11px] font-medium mt-0.5 ${
                          categoryStats.shorts.isAllSelected ? 'text-blue-400 font-bold' : themeClasses.mutedText
                        }`}>
                          {categoryStats.shorts.selected > 0 
                            ? `${categoryStats.shorts.selected}/${categoryStats.shorts.total}`
                            : `${categoryStats.shorts.total}`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Safety & Backup Card */}
                <div className={`p-4 rounded-2xl space-y-2.5 ${themeClasses.subCard}`}>
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <ShieldCheck size={17} className="text-emerald-500" />
                    <span>Zero Data Loss Backup</span>
                  </div>
                  <p className={`text-xs leading-normal ${themeClasses.mutedText}`}>
                    Export backup before executing changes.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={videosList.length === 0}
                      onClick={() => handleExportCsv(false)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${themeClasses.btnSecondary}`}
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>

                    <button
                      disabled={videosList.length === 0}
                      onClick={handleExportJson}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${themeClasses.btnSecondary}`}
                      title="Export as JSON"
                    >
                      <FileJson size={14} />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* ── Right Main Area: Large Video Review Table & Purge Controller ── */}
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                
                {/* Cost & Selection Status Alert Banner */}
                {selectedIds.size > 0 && (
                  <div className={`mb-4 p-3.5 rounded-2xl border flex items-center justify-between ${
                    hasSufficientPoints ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-sm font-bold text-white">Selected: {selectedIds.size} videos</span>
                        <div className={`text-xs mt-0.5 ${themeClasses.mutedText}`}>
                          {deadSelected} unavailable ({Math.ceil(deadSelected / 5)} pts) • {standardSelected} standard ({standardSelected} pts)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-base font-bold text-[#FF0000]">{requiredPoints} Points Required</div>
                        <div className="text-xs text-neutral-400">
                          {quota.pointsRemaining - requiredPoints >= 0 
                            ? `${quota.pointsRemaining - requiredPoints} pts remaining after purge`
                            : 'Exceeds balance'}
                        </div>
                      </div>

                      {/* Primary Trigger Button for Stage 5 Purge */}
                      <button
                        onClick={handleOpenPruneModal}
                        disabled={!hasSufficientPoints}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.btnPrimary}`}
                        title={hasSufficientPoints ? 'Proceed to clean selected items' : 'Not enough points'}
                      >
                        <Trash2 size={15} />
                        <span>Clean Selected ({selectedIds.size})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Review Table */}
                <div className="flex-1 overflow-hidden">
                  <VideoReviewTable
                    videos={videosList}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectMultiple={handleSelectMultiple}
                    isDark={isDark}
                  />
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className={`px-7 py-3.5 flex items-center justify-between text-xs ${themeClasses.footer}`}>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-white">
                  {selectedIds.size > 0 ? `${selectedIds.size} Videos Selected` : `${videosList.length} Total Indexed`}
                </span>
                <span>•</span>
                <span>Cost: {requiredPoints} pts</span>
                <span>•</span>
                <span>Available: {quota.pointsRemaining} pts</span>
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>

          </div>

          {/* ── Stage 5: Prune Confirmation & Progress Modal ── */}
          <PruneProgressModal
            isOpen={isPruneModalOpen}
            onClose={() => setIsPruneModalOpen(false)}
            onConfirmStart={handleConfirmStartPrune}
            onPause={() => pruner.pause()}
            onResume={() => pruner.resume()}
            onAbort={() => pruner.abort()}
            onExportCsv={() => handleExportCsv(false)}
            progress={pruneProgress}
            selectedCount={selectedIds.size}
            requiredPoints={requiredPoints}
            pointsRemaining={quota.pointsRemaining}
            isDark={isDark}
          />
        </>
      )}
    </div>
  );
};
