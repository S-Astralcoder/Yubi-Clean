import React, { useEffect, useState } from 'react';
import { GardenerLogo } from '../ui/icons/GardenerLogo';
import { UpgradeModal } from '../ui/components/UpgradeModal';
import { UserQuota, StorageSchema } from '../types';
import { paymentService } from '../services/payment';
import { 
  Sparkles, 
  ExternalLink, 
  Zap, 
  Settings as SettingsIcon, 
  Layers,
  RotateCcw
} from 'lucide-react';

export const PopupApp: React.FC = () => {
  const [isOnPlaylist, setIsOnPlaylist] = useState<boolean>(false);
  const [isWatchLater, setIsWatchLater] = useState<boolean>(false);
  const [quota, setQuota] = useState<UserQuota>({
    pointsRemaining: 75,
    pointsTotal: 75,
    tier: 'free',
  });
  const [settings, setSettings] = useState<StorageSchema['settings']>({
    floatingIconEnabled: true,
    autoScrollSpeedMs: 400,
    deletionDelayMs: 500,
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // Load state and detect current tab
  useEffect(() => {
    // 1. Detect if active tab is YouTube Playlist
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        try {
          const parsed = new URL(activeTab.url);
          const hasPlaylist = parsed.pathname.includes('/playlist') && Boolean(parsed.searchParams.get('list'));
          setIsOnPlaylist(hasPlaylist);
          setIsWatchLater(parsed.searchParams.get('list') === 'WL');
        } catch {
          setIsOnPlaylist(false);
        }
      }
    });

    // 2. Load stored quota and settings
    chrome.storage?.local?.get(['quota', 'settings'], (res: Record<string, any>) => {
      if (res?.quota) setQuota(res.quota as UserQuota);
      if (res?.settings) setSettings(res.settings as StorageSchema['settings']);
    });

    // 3. Listen for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.quota?.newValue) {
        setQuota(changes.quota.newValue as UserQuota);
      }
      if (changes.settings?.newValue) {
        setSettings(changes.settings.newValue as StorageSchema['settings']);
      }
    };

    chrome.storage?.onChanged?.addListener(storageListener);
    return () => chrome.storage?.onChanged?.removeListener(storageListener);
  }, []);

  // Toggle floating action button
  const handleToggleFloatingIcon = async () => {
    const updated = {
      ...settings,
      floatingIconEnabled: !settings.floatingIconEnabled,
    };
    setSettings(updated);
    await chrome.storage?.local?.set({ settings: updated });
  };

  // Open YouTube Watch Later tab
  const handleOpenWatchLater = () => {
    chrome.tabs?.create({ url: 'https://www.youtube.com/playlist?list=WL' });
  };

  // Quick sandbox helper to add test points
  const handleAddTestPoints = async (amount: number) => {
    const updated: UserQuota = {
      ...quota,
      pointsRemaining: quota.pointsRemaining + amount,
      pointsTotal: quota.pointsTotal + amount,
    };
    setQuota(updated);
    await chrome.storage?.local?.set({ quota: updated });
  };

  // Reset quota to initial free tier
  const handleResetFree = async () => {
    const updated: UserQuota = {
      pointsRemaining: 75,
      pointsTotal: 75,
      tier: 'free',
    };
    setQuota(updated);
    await chrome.storage?.local?.set({ quota: updated });
  };

  const isPro = quota.tier === 'pro';

  return (
    <div className="w-[360px] min-h-[480px] bg-[#0F0F0F] text-[#F1F1F1] flex flex-col p-4 space-y-4">
      
      {/* ── 1. HEADER ── */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <GardenerLogo size={24} />
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none text-white">
              YT-WL-Gardener
            </h1>
            <span className="text-[10px] text-neutral-400 font-mono">v0.1.0 • Purger</span>
          </div>
        </div>

        {paymentService.isSandbox() && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Sandbox Mode
          </span>
        )}
      </div>

      {/* ── 2. ACTIVE TAB STATUS BANNER ── */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
        isOnPlaylist ? 'bg-[#1E1E22] border-emerald-500/30' : 'bg-[#1A1A1D] border-white/10'
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${
            isOnPlaylist ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-neutral-600'
          }`} />
          <div>
            <div className="text-xs font-semibold text-white">
              {isOnPlaylist 
                ? (isWatchLater ? 'Watch Later Playlist' : 'YouTube Playlist Detected') 
                : 'No Playlist Active'}
            </div>
            <div className="text-[10px] text-neutral-400">
              {isOnPlaylist 
                ? 'In-page cleaner button is ready' 
                : 'Navigate to YouTube Watch Later'}
            </div>
          </div>
        </div>

        {!isOnPlaylist && (
          <button
            onClick={handleOpenWatchLater}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white bg-[#FF0000] hover:bg-[#CC0000] transition-colors shadow"
          >
            <span>Open WL</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* ── 3. USAGE & TIER BALANCE CARD ── */}
      <div className="p-3.5 rounded-2xl bg-[#1E1E22] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
            <Layers size={15} className="text-[#FF0000]" />
            <span>Quota Balance</span>
          </div>

          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
            isPro ? 'bg-[#FF0000]/20 text-[#FF0000] border border-[#FF0000]/30' : 'bg-white/10 text-neutral-300'
          }`}>
            {quota.tier.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-black text-white">
              {isPro ? 'Unlimited (∞)' : `${quota.pointsRemaining} pts`}
            </div>
            <div className="text-[11px] text-neutral-400">
              {isPro ? 'Lifetime Pro License Active' : `Out of ${quota.pointsTotal} total allocated`}
            </div>
          </div>

          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-all shadow active:scale-[0.98]"
          >
            <Sparkles size={12} className="fill-current" />
            <span>Upgrade</span>
          </button>
        </div>
      </div>

      {/* ── 4. SETTINGS & TOGGLES ── */}
      <div className="p-3.5 rounded-2xl bg-[#1E1E22] border border-white/10 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
          <SettingsIcon size={15} />
          <span>Extension Settings</span>
        </div>

        {/* Floating Action Button Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-medium text-white">In-Page Floating Button</div>
            <div className="text-[10px] text-neutral-400">
              Display cleaner button on playlist pages
            </div>
          </div>

          <button
            onClick={handleToggleFloatingIcon}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.floatingIconEnabled ? 'bg-[#FF0000]' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.floatingIconEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── 5. SANDBOX / TEST MODE CONTROLS ── */}
      {paymentService.isSandbox() && (
        <div className="p-3 rounded-2xl bg-[#16161A] border border-amber-500/20 space-y-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-400">
            <Zap size={13} />
            <span>Sandbox Test Controls</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleAddTestPoints(100)}
              className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-[11px] font-medium transition-colors"
            >
              +100 Points
            </button>

            <button
              onClick={handleResetFree}
              className="flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white text-[11px] font-medium transition-colors"
            >
              <RotateCcw size={11} />
              <span>Reset Free</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 6. FOOTER ── */}
      <div className="pt-1 text-center">
        <p className="text-[10px] text-neutral-500">
          Cleaned playlists sync directly to your YouTube account.
        </p>
      </div>

      {/* Upgrade / Pricing Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        quota={quota}
        isDark={true}
        onQuotaUpdated={(newQuota) => setQuota(newQuota)}
      />

    </div>
  );
};
