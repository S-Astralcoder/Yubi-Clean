import React, { useState, useEffect } from 'react';
import { GardenerLogo } from './icons/GardenerLogo';
import { 
  X, 
  Trash2, 
  EyeOff, 
  CheckCircle2, 
  Download, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  Square
} from 'lucide-react';
import { UserQuota } from '../types';
import { harvester, HarvestProgress } from '../content/harvester';

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

  const [harvestProgress, setHarvestProgress] = useState<HarvestProgress>({
    total: 0,
    deadCount: 0,
    watchedCount: 0,
    isScanning: false,
    isCompleted: false,
  });

  // Subscribe to harvester progress and load storage state
  useEffect(() => {
    // 1. Subscribe to live harvester updates
    const unsubscribe = harvester.subscribe((p) => {
      setHarvestProgress(p);
    });

    // 2. Load persisted quota and previous scan records
    chrome.storage?.local?.get(['quota', 'videos', 'totalIndexed'], (res: Record<string, any>) => {
      if (res?.quota) {
        setQuota(res.quota as UserQuota);
      }
      if (res?.videos && typeof res?.totalIndexed === 'number') {
        const videos = Object.values(res.videos) as any[];
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

    // 3. Listen for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.quota && changes.quota.newValue) {
        setQuota(changes.quota.newValue as UserQuota);
      }
    };

    chrome.storage?.onChanged?.addListener(storageListener);
    return () => {
      unsubscribe();
      chrome.storage?.onChanged?.removeListener(storageListener);
    };
  }, []);

  const quotaPercent = Math.max(0, Math.min(100, (quota.pointsRemaining / quota.pointsTotal) * 100));

  const handleScanToggle = () => {
    if (harvestProgress.isScanning) {
      harvester.stop();
    } else {
      harvester.start();
    }
  };

  // Dynamic theme variables matching native YouTube
  const themeClasses = isDark ? {
    container: 'yt-dark text-[#F1F1F1]',
    fab: 'bg-[#0F0F0F] text-[#F1F1F1] border border-white/20 shadow-yt-fab hover:bg-[#212121]',
    backdrop: 'bg-black/55 backdrop-blur-[2px]',
    modal: 'bg-[#0F0F0F]/95 text-[#F1F1F1] border border-white/15 shadow-yt-modal',
    header: 'border-b border-white/10 bg-[#181818]/80',
    logoContainer: 'bg-[#212121] border border-white/10',
    badge: 'bg-white/10 text-white/90 border border-white/10',
    closeBtn: 'text-neutral-400 hover:text-white hover:bg-white/10',
    card: 'bg-[#1E1E1E]/80 border border-white/10',
    subCard: 'bg-[#181818]/60 border border-white/5',
    barTrack: 'bg-white/10',
    btnPrimary: 'bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-md active:bg-[#AA0000]',
    btnStop: 'bg-[#272727] hover:bg-[#383838] text-white border border-red-500/40',
    btnSecondary: 'bg-[#272727] hover:bg-[#383838] text-white border border-white/10',
    btnChip: 'bg-[#212121] hover:bg-[#2A2A2A] text-neutral-200 border border-white/10',
    footer: 'border-t border-white/10 bg-[#181818]/80 text-neutral-400',
    mutedText: 'text-[#AAAAAA]',
  } : {
    container: 'yt-light text-[#0F0F0F]',
    fab: 'bg-white text-[#0F0F0F] border border-black/15 shadow-yt-fab hover:bg-[#F2F2F2]',
    backdrop: 'bg-black/25 backdrop-blur-[2px]',
    modal: 'bg-white/95 text-[#0F0F0F] border border-black/15 shadow-yt-modal-light',
    header: 'border-b border-black/10 bg-[#F9F9F9]/80',
    logoContainer: 'bg-[#F2F2F2] border border-black/10',
    badge: 'bg-black/5 text-black/80 border border-black/10',
    closeBtn: 'text-neutral-500 hover:text-black hover:bg-black/5',
    card: 'bg-[#F8F8F8] border border-black/10',
    subCard: 'bg-[#F2F2F2]/70 border border-black/5',
    barTrack: 'bg-black/10',
    btnPrimary: 'bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-sm active:bg-[#AA0000]',
    btnStop: 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-red-600 border border-red-500/40',
    btnSecondary: 'bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#0F0F0F] border border-black/10',
    btnChip: 'bg-[#F2F2F2] hover:bg-[#EAEAEA] text-neutral-800 border border-black/10',
    footer: 'border-t border-black/10 bg-[#F9F9F9]/80 text-neutral-500',
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
          ) : (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF0000] border border-black/20"></span>
            </span>
          )}
        </button>
      )}

      {/* ── 2. Native YouTube Floating Modal (Grammarly-Style 42% W / 86% H) ── */}
      {isOpen && (
        <>
          {/* Subtle Ambient Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            className={`fixed inset-0 z-[9999998] transition-opacity duration-200 ${themeClasses.backdrop}`}
          />

          {/* Floating Rounded Panel */}
          <div className={`fixed top-1/2 -translate-y-1/2 right-6 h-[86vh] w-[42vw] min-w-[440px] max-w-[620px] z-[9999999] flex flex-col rounded-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 ease-out ${themeClasses.modal}`}>
            
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 ${themeClasses.header}`}>
              <div className="flex items-center space-x-3.5">
                <div className={`p-2 rounded-xl ${themeClasses.logoContainer}`}>
                  <GardenerLogo size={26} isDark={isDark} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg font-bold tracking-tight">
                      YT Gardener
                    </h1>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${themeClasses.badge}`}>
                      {quota.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs mt-0.5 ${themeClasses.mutedText}`}>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isWatchLater ? 'Watch Later' : playlistTitle}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-full transition-colors duration-150 ${themeClasses.closeBtn}`}
                title="Close"
              >
                <X size={19} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Clean Usage Balance Box */}
              <div className={`p-4 rounded-xl space-y-3 ${themeClasses.card}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-[#FF0000]">
                      <Coins size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Usage Balance</div>
                      <div className={`text-xs ${themeClasses.mutedText}`}>Remaining cleanup points</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-[#FF0000]">{quota.pointsRemaining}</span>
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
                <div className={`flex items-center justify-between pt-1 text-[11px] border-t border-black/5 dark:border-white/5 ${themeClasses.mutedText}`}>
                  <span><strong>1 pt</strong> = 5 Unavailable Videos</span>
                  <span>•</span>
                  <span><strong>1 pt</strong> = 1 Filtered Video</span>
                </div>
              </div>

              {/* Action Banner / Harvester Controller */}
              <div className={`p-4 rounded-xl space-y-3 ${themeClasses.card}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">Playlist Harvester</h2>
                    <p className={`text-xs mt-0.5 ${themeClasses.mutedText}`}>
                      {harvestProgress.isScanning 
                        ? `Auto-scrolling and indexing... Found ${harvestProgress.total} items so far.`
                        : harvestProgress.isCompleted
                        ? `Harvest complete! ${harvestProgress.total} videos indexed and categorized.`
                        : 'Scan and index playlist items to identify dead videos, watched content, and durations.'}
                    </p>
                  </div>
                </div>

                {/* Primary Scan / Stop Toggle Button */}
                <button
                  onClick={handleScanToggle}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-xs tracking-wide transition-all duration-150 active:scale-[0.99] ${
                    harvestProgress.isScanning ? themeClasses.btnStop : themeClasses.btnPrimary
                  }`}
                >
                  {harvestProgress.isScanning ? (
                    <>
                      <Square size={14} className="fill-current" />
                      <span>Stop Scanning ({harvestProgress.total} Indexed)</span>
                    </>
                  ) : harvestProgress.total > 0 ? (
                    <>
                      <RefreshCw size={14} />
                      <span>Re-Scan Playlist ({harvestProgress.total} Items)</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Scan & Index Playlist</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className={`p-3.5 rounded-xl text-center ${themeClasses.subCard}`}>
                  <div className="text-xl font-bold">{harvestProgress.total}</div>
                  <div className={`text-[11px] uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>Indexed</div>
                </div>

                <div className={`p-3.5 rounded-xl text-center ${themeClasses.subCard}`}>
                  <div className="text-xl font-bold text-red-500">{harvestProgress.deadCount}</div>
                  <div className={`text-[11px] uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>Unavailable</div>
                </div>

                <div className={`p-3.5 rounded-xl text-center ${themeClasses.subCard}`}>
                  <div className="text-xl font-bold text-emerald-500">{harvestProgress.watchedCount}</div>
                  <div className={`text-[11px] uppercase tracking-wider mt-0.5 ${themeClasses.mutedText}`}>100% Watched</div>
                </div>
              </div>

              {/* Filter Categories Preview (Stage 4) */}
              <div className="space-y-2.5">
                <div className={`text-xs font-semibold uppercase tracking-wider flex items-center justify-between ${themeClasses.mutedText}`}>
                  <span>Quick Filters</span>
                  <span className="text-[10px]">Stage 4 Preview</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${themeClasses.btnChip}`}>
                    <div className="flex items-center space-x-2">
                      <EyeOff size={14} className="text-red-500" />
                      <span>Dead / Private</span>
                    </div>
                    <span className={`text-[10px] ${themeClasses.mutedText}`}>
                      {harvestProgress.deadCount} items
                    </span>
                  </button>

                  <button className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${themeClasses.btnChip}`}>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span>100% Completed</span>
                    </div>
                    <span className={`text-[10px] ${themeClasses.mutedText}`}>
                      {harvestProgress.watchedCount} items
                    </span>
                  </button>

                  <button className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${themeClasses.btnChip}`}>
                    <div className="flex items-center space-x-2">
                      <Trash2 size={14} />
                      <span>Shorts (&lt;60s)</span>
                    </div>
                    <span className={`text-[10px] ${themeClasses.mutedText}`}>Stage 4</span>
                  </button>

                  <button className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${themeClasses.btnChip}`}>
                    <div className="flex items-center space-x-2">
                      <RefreshCw size={14} />
                      <span>Partially Watched</span>
                    </div>
                    <span className={`text-[10px] ${themeClasses.mutedText}`}>Stage 4</span>
                  </button>
                </div>
              </div>

              {/* Safety & Backup Card */}
              <div className={`p-4 rounded-xl space-y-2.5 ${themeClasses.subCard}`}>
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Zero Data Loss Protection</span>
                </div>
                <p className={`text-[11px] leading-normal ${themeClasses.mutedText}`}>
                  Export your full playlist to CSV or JSON before initiating any deletion sequence.
                </p>
                <button
                  disabled={harvestProgress.total === 0}
                  className={`w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${themeClasses.btnSecondary}`}
                >
                  <Download size={14} />
                  <span>Export Playlist Backup (CSV)</span>
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className={`px-6 py-3.5 flex items-center justify-between text-xs ${themeClasses.footer}`}>
              <span className="flex items-center space-x-2">
                <span className="font-medium">YT-WL-Gardener</span>
                <span>•</span>
                <span>{quota.pointsRemaining} Points Available</span>
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-1 hover:text-white transition-colors ${themeClasses.mutedText}`}
              >
                <span>Dismiss</span>
                <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
