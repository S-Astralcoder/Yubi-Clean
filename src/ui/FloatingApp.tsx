import React, { useState, useEffect } from 'react';
import { GardenerLogo } from './icons/GardenerLogo';
import { 
  X, 
  Sparkles, 
  Trash2, 
  EyeOff, 
  CheckCircle2, 
  Download, 
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface FloatingAppProps {
  playlistTitle?: string;
  isWatchLater?: boolean;
}

export const FloatingApp: React.FC<FloatingAppProps> = ({ 
  playlistTitle = 'Watch Later',
  isWatchLater = true 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [itemCount, setItemCount] = useState<number>(0);

  // Read existing storage status if available
  useEffect(() => {
    chrome.storage?.local?.get(['totalIndexed', 'harvesterStatus'], (res: Record<string, any>) => {
      if (typeof res?.totalIndexed === 'number') {
        setItemCount(res.totalIndexed);
      }
      if (res?.harvesterStatus === 'scanning') {
        setIsScanning(true);
      }
    });

    // Listen for storage changes from content script
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.totalIndexed && typeof changes.totalIndexed.newValue === 'number') {
        setItemCount(changes.totalIndexed.newValue);
      }
      if (changes.harvesterStatus) {
        setIsScanning(changes.harvesterStatus.newValue === 'scanning');
      }
    };

    chrome.storage?.onChanged?.addListener(listener);
    return () => {
      chrome.storage?.onChanged?.removeListener(listener);
    };
  }, []);

  return (
    <div className="font-sans antialiased text-neutral-200 select-none">
      {/* ── 1. Floating Action Button (FAB) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999999] group flex items-center justify-center w-14 h-14 rounded-full bg-obsidian-950/90 border border-gold-500/50 hover:border-gold-400 backdrop-blur-md shadow-gold-glow hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
          title="Open YT-WL-Gardener"
        >
          {/* Subtle inner dent ring */}
          <div className="absolute inset-0.5 rounded-full border border-white/5 pointer-events-none" />
          
          <GardenerLogo size={32} className="transition-transform duration-300 group-hover:rotate-6" />

          {/* Glowing pulse indicator dot */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500 border border-obsidian-950"></span>
          </span>
        </button>
      )}

      {/* ── 2. Expandable Sidebar / Drawer ── */}
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[9999998] bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-screen w-96 max-w-[92vw] z-[9999999] flex flex-col bg-obsidian-950/95 backdrop-blur-2xl border-l border-gold-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-300 ease-out">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gold-500/20 bg-obsidian-900/60">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-obsidian-850 border border-gold-500/30 shadow-inner-dent">
                  <GardenerLogo size={24} />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-wide gold-gradient-text">
                    YT Gardener
                  </h1>
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isWatchLater ? 'Watch Later' : playlistTitle}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-gold-300 hover:bg-gold-500/10 border border-transparent hover:border-gold-500/30 transition-all duration-200"
                title="Collapse Panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Action Banner / Status Card */}
              <div className="p-4 rounded-xl bg-obsidian-900/80 border border-gold-500/20 shadow-inner-dent">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-400/90 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-gold-400" />
                    Status
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/30">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Clean your {isWatchLater ? 'Watch Later' : 'playlist'} with safe sequential pruning and zero data loss.
                </p>

                {/* Primary Scan Button (Stage 3 Ready) */}
                <button
                  disabled={isScanning}
                  className="mt-3.5 w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-medium text-xs tracking-wide bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-obsidian-950 shadow-gold-subtle hover:shadow-gold-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                  <span>{isScanning ? 'Scanning Playlist...' : 'Scan & Index Playlist'}</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-obsidian-900/50 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-lg font-bold text-neutral-100">{itemCount}</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Indexed</div>
                </div>

                <div className="p-3 rounded-lg bg-obsidian-900/50 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-lg font-bold text-rose-400">0</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Dead</div>
                </div>

                <div className="p-3 rounded-lg bg-obsidian-900/50 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-lg font-bold text-gold-400">0</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Watched</div>
                </div>
              </div>

              {/* Quick Filter Chips (Stage 4 Preview) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Quick Select Filters</span>
                  <span className="text-[10px] text-neutral-500">Stage 4</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs bg-obsidian-900 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <EyeOff size={13} className="text-rose-400" />
                    <span>Dead / Private</span>
                  </button>

                  <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs bg-obsidian-900 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <CheckCircle2 size={13} className="text-gold-400" />
                    <span>100% Watched</span>
                  </button>

                  <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs bg-obsidian-900 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <Trash2 size={13} className="text-neutral-400" />
                    <span>Shorts (&lt;60s)</span>
                  </button>
                </div>
              </div>

              {/* Safety & Backup Card */}
              <div className="p-3.5 rounded-xl bg-obsidian-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-medium text-neutral-300">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  <span>Zero-Loss Guarantee</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Always export a backup to CSV or Markdown before executing any deletion.
                </p>
                <button
                  disabled={itemCount === 0}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 border border-neutral-700/80 hover:border-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={13} />
                  <span>Backup to CSV</span>
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gold-500/20 bg-obsidian-900/60 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center space-x-1">
                <span>v0.1.0</span>
                <span className="text-neutral-600">•</span>
                <span className="text-gold-400">Pro</span>
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-1 hover:text-gold-300 transition-colors"
              >
                <span>Collapse</span>
                <ChevronRight size={13} />
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
