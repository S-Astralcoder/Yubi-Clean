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
  RefreshCw,
  Coins,
  Info
} from 'lucide-react';
import { UserQuota } from '../types';

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
  const [quota, setQuota] = useState<UserQuota>({
    pointsRemaining: 75,
    pointsTotal: 75,
    tier: 'free'
  });

  // Read existing storage status if available
  useEffect(() => {
    chrome.storage?.local?.get(['totalIndexed', 'harvesterStatus', 'quota'], (res: Record<string, any>) => {
      if (typeof res?.totalIndexed === 'number') {
        setItemCount(res.totalIndexed);
      }
      if (res?.harvesterStatus === 'scanning') {
        setIsScanning(true);
      }
      if (res?.quota) {
        setQuota(res.quota as UserQuota);
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
      if (changes.quota && changes.quota.newValue) {
        setQuota(changes.quota.newValue as UserQuota);
      }
    };

    chrome.storage?.onChanged?.addListener(listener);
    return () => {
      chrome.storage?.onChanged?.removeListener(listener);
    };
  }, []);

  const quotaPercent = Math.max(0, Math.min(100, (quota.pointsRemaining / quota.pointsTotal) * 100));

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

      {/* ── 2. Grammarly-Style Floating Card Modal ── */}
      {isOpen && (
        <>
          {/* Ambient blurred backdrop overlay to focus on the modal */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[9999998] bg-black/45 backdrop-blur-[3px] transition-opacity duration-300"
          />

          {/* Floating Rounded Modal (42% width, 86% height, anchored right with margin) */}
          <div className="fixed top-1/2 -translate-y-1/2 right-6 h-[86vh] w-[42vw] min-w-[440px] max-w-[620px] z-[9999999] flex flex-col rounded-2xl overflow-hidden bg-[#0D0D10]/95 backdrop-blur-2xl border border-gold-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.18)] animate-in fade-in zoom-in-95 duration-250 ease-out">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold-500/20 bg-obsidian-900/70">
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-xl bg-obsidian-850 border border-gold-500/30 shadow-inner-dent">
                  <GardenerLogo size={26} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg font-bold tracking-wide gold-gradient-text">
                      YT Gardener
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gold-500/15 text-gold-300 border border-gold-500/30">
                      {quota.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isWatchLater ? 'Watch Later Playlist' : playlistTitle}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full text-neutral-400 hover:text-gold-300 hover:bg-gold-500/10 border border-transparent hover:border-gold-500/30 transition-all duration-200"
                title="Close"
              >
                <X size={19} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Usage & Points Balance Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-obsidian-900/90 to-obsidian-850/80 border border-gold-500/30 shadow-inner-dent space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      <Coins size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Usage Balance</div>
                      <div className="text-[11px] text-neutral-400">Available video cleanup credits</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-gold-400">{quota.pointsRemaining}</span>
                    <span className="text-xs text-neutral-500"> / {quota.pointsTotal} pts</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-neutral-800">
                  <div 
                    className="bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-gold-subtle"
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>

                {/* Pricing Rules Legend */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400 border-t border-neutral-800/80">
                  <span className="flex items-center gap-1 text-gold-400/90 font-medium">
                    <Info size={12} />
                    Rates:
                  </span>
                  <span><strong>1 pt</strong> = 5 Dead/Private Videos</span>
                  <span className="text-neutral-600">•</span>
                  <span><strong>1 pt</strong> = 1 Filtered Video</span>
                </div>
              </div>

              {/* Action Banner / Scan Controller */}
              <div className="p-4 rounded-xl bg-obsidian-900/70 border border-gold-500/20 shadow-inner-dent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-400/90 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-gold-400" />
                    Harvester Status
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/30">
                    Ready to Index
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Smoothly scan and index all items in your {isWatchLater ? 'Watch Later' : 'playlist'} before reviewing and purging.
                </p>

                {/* Primary Scan Button (Stage 3 Ready) */}
                <button
                  disabled={isScanning}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-xs tracking-wide bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-obsidian-950 shadow-gold-subtle hover:shadow-gold-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
                  <span>{isScanning ? 'Scanning Playlist...' : 'Scan & Index Playlist'}</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-xl bg-obsidian-900/60 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-xl font-bold text-neutral-100">{itemCount}</div>
                  <div className="text-[11px] text-neutral-400 uppercase tracking-wider mt-0.5">Indexed</div>
                </div>

                <div className="p-3.5 rounded-xl bg-obsidian-900/60 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-xl font-bold text-rose-400">0</div>
                  <div className="text-[11px] text-neutral-400 uppercase tracking-wider mt-0.5">Dead / Private</div>
                </div>

                <div className="p-3.5 rounded-xl bg-obsidian-900/60 border border-neutral-800 text-center shadow-inner-dent">
                  <div className="text-xl font-bold text-gold-400">0</div>
                  <div className="text-[11px] text-neutral-400 uppercase tracking-wider mt-0.5">100% Watched</div>
                </div>
              </div>

              {/* Filter Chips & Rules Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Quick Filter Categories</span>
                  <span className="text-[10px] text-neutral-500">Stage 4 Preview</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-obsidian-900/80 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <EyeOff size={14} className="text-rose-400" />
                      <span>Dead & Unavailable</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">1 pt / 5 items</span>
                  </button>

                  <button className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-obsidian-900/80 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={14} className="text-gold-400" />
                      <span>100% Completed</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">1 pt / item</span>
                  </button>

                  <button className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-obsidian-900/80 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Trash2 size={14} className="text-neutral-400" />
                      <span>Shorts (&lt;60s)</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">1 pt / item</span>
                  </button>

                  <button className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-obsidian-900/80 border border-neutral-800 hover:border-gold-500/40 text-neutral-300 hover:text-gold-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Partially Watched</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">1 pt / item</span>
                  </button>
                </div>
              </div>

              {/* Safety & Backup Card */}
              <div className="p-4 rounded-xl bg-obsidian-900/50 border border-neutral-800 space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-200">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Zero Data Loss Protection</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Export your full playlist to CSV or JSON before initiating any deletion sequence.
                </p>
                <button
                  disabled={itemCount === 0}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-medium bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 border border-neutral-700/80 hover:border-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                  <span>Export Playlist Backup (CSV)</span>
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gold-500/20 bg-obsidian-900/70 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center space-x-2">
                <span className="text-neutral-300 font-medium">YT-WL-Gardener</span>
                <span className="text-neutral-600">•</span>
                <span className="text-gold-400">75 Points Free</span>
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-1 hover:text-gold-300 transition-colors"
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
