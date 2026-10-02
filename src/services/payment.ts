/**
 * Payment & Monetization Service
 * Supports ExtensionPay protocol with local Sandbox / Test Mode for developer verification.
 */

import { UserQuota } from '../types';

export type PricingTier = 'free' | 'deep_clean' | 'pro';

export interface TierDetails {
  id: PricingTier;
  name: string;
  priceText: string;
  priceUsd: number;
  pointsGranted: number; // 75, 1000, or -1 (unlimited)
  description: string;
  features: string[];
  popular?: boolean;
}

export const TIERS: Record<PricingTier, TierDetails> = {
  free: {
    id: 'free',
    name: 'Free Tier',
    priceText: '$0',
    priceUsd: 0,
    pointsGranted: 75,
    description: 'Generous initial allocation to clean your immediate high-priority videos.',
    features: [
      '75 Video Points included',
      'Remove dead & unavailable videos (5 videos / 1 pt)',
      '100% Watched video detection',
      'Instant CSV & JSON backup export',
      'Throttled sequential DOM removal',
    ],
  },
  deep_clean: {
    id: 'deep_clean',
    name: 'Deep Clean Pass',
    priceText: '$4.99',
    priceUsd: 4.99,
    pointsGranted: 1000,
    popular: true,
    description: 'Perfect for purging a massive multi-year playlist backlog in one go.',
    features: [
      '+1,000 Cleaning Points',
      'Process up to 1,000 videos',
      'Top-down queue optimization',
      'Zero-data-loss export before deletion',
      'One-time payment (no subscription)',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Lifetime License',
    priceText: '$9.99',
    priceUsd: 9.99,
    pointsGranted: -1, // Unlimited
    description: 'Permanent unrestricted cleanup for avid YouTube collectors and power users.',
    features: [
      'Unlimited Points forever (∞)',
      'Unlimited playlist cleans',
      'All upcoming features & updates',
      'Priority execution mode',
      'Lifetime license (single purchase)',
    ],
  },
};

export interface PaymentConfig {
  extensionPayId: string;
  sandboxMode: boolean;
}

const DEFAULT_CONFIG: PaymentConfig = {
  extensionPayId: 'yt-wl-gardener',
  sandboxMode: true, // Enabled by default for local development & testing
};

class PaymentService {
  private config: PaymentConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const res = await chrome.storage?.local?.get(['paymentConfig']);
      if (res?.paymentConfig) {
        this.config = { ...this.config, ...res.paymentConfig };
      }
    } catch (err) {
      console.warn('[YT-WL-Gardener] Could not load payment config from storage:', err);
    }
  }

  public isSandbox(): boolean {
    return this.config.sandboxMode;
  }

  public setSandboxMode(enabled: boolean): void {
    this.config.sandboxMode = enabled;
    chrome.storage?.local?.set({ paymentConfig: this.config });
  }

  public getExtensionPayUrl(tier: PricingTier): string {
    const extId = encodeURIComponent(this.config.extensionPayId);
    return `https://extensionpay.com/extension/${extId}/?plan=${tier}`;
  }

  /**
   * Applies a tier upgrade to chrome.storage.local
   */
  public async applyTierUpgrade(targetTier: PricingTier): Promise<UserQuota> {
    const res = await chrome.storage?.local?.get(['quota']);
    const currentQuota: UserQuota = (res?.quota as UserQuota | undefined) ?? {
      pointsRemaining: 75,
      pointsTotal: 75,
      tier: 'free',
    };

    let updatedQuota: UserQuota;

    if (targetTier === 'pro') {
      updatedQuota = {
        tier: 'pro',
        pointsRemaining: 999999, // Treated as unlimited in UI
        pointsTotal: 999999,
      };
    } else if (targetTier === 'deep_clean') {
      const addedPoints = TIERS.deep_clean.pointsGranted;
      updatedQuota = {
        tier: 'deep_clean',
        pointsRemaining: currentQuota.pointsRemaining + addedPoints,
        pointsTotal: currentQuota.pointsTotal + addedPoints,
      };
    } else {
      // Reset to free
      updatedQuota = {
        tier: 'free',
        pointsRemaining: 75,
        pointsTotal: 75,
      };
    }

    await chrome.storage?.local?.set({ quota: updatedQuota });
    console.log(`[YT-WL-Gardener] Tier upgraded to ${targetTier}:`, updatedQuota);
    return updatedQuota;
  }

  /**
   * Initiates payment flow for a selected tier.
   * In sandbox mode, immediately credits the account.
   * In live mode, opens ExtensionPay hosted checkout.
   */
  public async checkout(tier: PricingTier): Promise<{ success: boolean; simulated: boolean; quota?: UserQuota }> {
    if (this.config.sandboxMode) {
      const updated = await this.applyTierUpgrade(tier);
      return { success: true, simulated: true, quota: updated };
    }

    // Live ExtensionPay window
    const url = this.getExtensionPayUrl(tier);
    if (chrome.tabs?.create) {
      await chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }

    return { success: true, simulated: false };
  }
}

export const paymentService = new PaymentService();
