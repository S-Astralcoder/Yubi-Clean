import React, { useState } from 'react';
import { UserQuota } from '../../types';
import { paymentService, TIERS, PricingTier } from '../../services/payment';
import { 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: UserQuota;
  isDark?: boolean;
  onQuotaUpdated?: (newQuota: UserQuota) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  quota,
  isDark = true,
  onQuotaUpdated,
}) => {
  const [loadingTier, setLoadingTier] = useState<PricingTier | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPro = quota.tier === 'pro';

  const themeClasses = isDark ? {
    modalBg: 'bg-[#141416]/98 border-white/15 text-[#F1F1F1] shadow-2xl',
    card: 'bg-[#1E1E22] border-white/10 hover:border-white/20',
    cardActive: 'bg-[#25252A] border-[#FF0000] ring-1 ring-[#FF0000]/50',
    cardPopular: 'bg-[#222228] border-amber-500/40 hover:border-amber-500/70',
    muted: 'text-[#AAAAAA]',
    tag: 'bg-white/10 text-neutral-300',
    btnSecondary: 'bg-[#272727] hover:bg-[#383838] text-white border-white/10',
  } : {
    modalBg: 'bg-white/98 border-black/15 text-[#0F0F0F] shadow-2xl',
    card: 'bg-[#F8F8F9] border-black/10 hover:border-black/20',
    cardActive: 'bg-[#F0F0F5] border-[#FF0000] ring-1 ring-[#FF0000]/50',
    cardPopular: 'bg-[#FFFDF7] border-amber-500/40 hover:border-amber-500/70',
    muted: 'text-[#606060]',
    tag: 'bg-black/5 text-neutral-700',
    btnSecondary: 'bg-[#EAEAEA] hover:bg-[#DFDFDF] text-black border-black/10',
  };

  const handleSelectTier = async (tier: PricingTier) => {
    if (tier === 'free' && quota.tier === 'free') return;
    setLoadingTier(tier);
    setSuccessMessage(null);

    try {
      const res = await paymentService.checkout(tier);
      if (res.success && res.quota) {
        onQuotaUpdated?.(res.quota);
        setSuccessMessage(
          tier === 'pro'
            ? 'Lifetime License activated! Unlimited points unlocked.'
            : tier === 'deep_clean'
            ? '1,000 Points added to your account successfully!'
            : 'Reset to Free Tier (75 points).'
        );
      }
    } catch (err: any) {
      console.error('[YT-WL-Gardener] Checkout error:', err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-2xl rounded-3xl border p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 ${themeClasses.modalBg}`}>
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight">Upgrade Points & Capacity</h2>
                {paymentService.isSandbox() && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Sandbox / Test Mode
                  </span>
                )}
              </div>
              <p className={`text-xs ${themeClasses.muted}`}>
                One-time purchase. No monthly recurring fees or hidden subscriptions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Current Balance Bar */}
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${themeClasses.card}`}>
          <div className="flex items-center space-x-2.5">
            <Layers size={18} className="text-[#FF0000]" />
            <span className="text-xs font-semibold">Current Balance:</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-[#FF0000]">
              {isPro ? 'Unlimited (∞)' : `${quota.pointsRemaining} Points`}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase ${themeClasses.tag}`}>
              {quota.tier.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Deep Clean Pass */}
          <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
            quota.tier === 'deep_clean' ? themeClasses.cardActive : themeClasses.cardPopular
          }`}>
            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold tracking-wide uppercase shadow">
              Most Popular
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Zap size={18} className="text-amber-400 fill-amber-400/20" />
                  <h3 className="font-bold text-base">{TIERS.deep_clean.name}</h3>
                </div>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-2xl font-black text-white">{TIERS.deep_clean.priceText}</span>
                  <span className={`text-xs ${themeClasses.muted}`}>one-time</span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${themeClasses.muted}`}>
                  {TIERS.deep_clean.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                {TIERS.deep_clean.features.map((f, i) => (
                  <div key={i} className="flex items-center space-x-2 text-xs">
                    <Check size={13} className="text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectTier('deep_clean')}
              disabled={loadingTier !== null}
              className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loadingTier === 'deep_clean' 
                ? 'Processing...' 
                : paymentService.isSandbox() 
                ? 'Get 1,000 Points (Test Mode)' 
                : 'Purchase Pass ($4.99)'}
            </button>
          </div>

          {/* 2. Lifetime License */}
          <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
            quota.tier === 'pro' ? themeClasses.cardActive : themeClasses.card
          }`}>
            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#FF0000] text-white text-[10px] font-bold tracking-wide uppercase shadow">
              Best Value
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-[#FF0000]" />
                  <h3 className="font-bold text-base">{TIERS.pro.name}</h3>
                </div>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-2xl font-black text-white">{TIERS.pro.priceText}</span>
                  <span className={`text-xs ${themeClasses.muted}`}>lifetime access</span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${themeClasses.muted}`}>
                  {TIERS.pro.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                {TIERS.pro.features.map((f, i) => (
                  <div key={i} className="flex items-center space-x-2 text-xs">
                    <Check size={13} className="text-emerald-400 shrink-0" />
                    <span className="font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectTier('pro')}
              disabled={loadingTier !== null || isPro}
              className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow active:scale-[0.98] disabled:opacity-50 ${
                isPro 
                  ? 'bg-neutral-700 cursor-default' 
                  : 'bg-[#FF0000] hover:bg-[#CC0000]'
              }`}
            >
              {isPro 
                ? 'Active License' 
                : loadingTier === 'pro' 
                ? 'Activating...' 
                : paymentService.isSandbox() 
                ? 'Unlock Lifetime Pro (Test Mode)' 
                : 'Get Lifetime License ($9.99)'}
            </button>
          </div>

        </div>

        {/* Dev / Sandbox Reset Option */}
        {paymentService.isSandbox() && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className={`text-[11px] ${themeClasses.muted}`}>
              Test Mode Controls:
            </span>
            <button
              onClick={() => handleSelectTier('free')}
              className="text-[11px] text-neutral-400 hover:text-white underline"
            >
              Reset to Free Tier (75 pts)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
