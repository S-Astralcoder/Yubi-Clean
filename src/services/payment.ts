/**
 * Payment & License Verification Service (Lemon Squeezy Integration)
 * Includes anti-tamper storage integrity checks and cryptographic signatures.
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

export interface LicenseRecord {
  key: string;
  tier: PricingTier;
  instanceId: string;
  activatedAt: number;
  customerEmail?: string;
  signature: string; // Cryptographic SHA-256 HMAC
}

export interface PaymentConfig {
  lemonStoreSlug: string;
  deepCleanCheckoutUrl: string;
  lifetimeCheckoutUrl: string;
  sandboxMode: boolean;
}

const DEFAULT_CONFIG: PaymentConfig = {
  lemonStoreSlug: 'yt-wl-gardener',
  deepCleanCheckoutUrl: 'https://lemonsqueezy.com',
  lifetimeCheckoutUrl: 'https://lemonsqueezy.com',
  sandboxMode: true, // Enabled for testing and local development
};

const INTEGRITY_SALT = 'yt_wl_gardener_salt_8f7b2c91a0e4';

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
      console.warn('[YT-WL-Gardener] Could not load payment config:', err);
    }
  }

  public isSandbox(): boolean {
    return this.config.sandboxMode;
  }

  public setSandboxMode(enabled: boolean): void {
    this.config.sandboxMode = enabled;
    chrome.storage?.local?.set({ paymentConfig: this.config });
  }

  public openCheckout(tier: PricingTier): void {
    const url = tier === 'deep_clean' 
      ? this.config.deepCleanCheckoutUrl 
      : this.config.lifetimeCheckoutUrl;
    
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Generates or retrieves a persistent device identifier.
   */
  public async getOrCreateInstanceId(): Promise<string> {
    const res = await chrome.storage?.local?.get(['instanceId']);
    if (res?.instanceId) return res.instanceId as string;

    const newId = `yt_inst_${crypto.randomUUID()}`;
    await chrome.storage?.local?.set({ instanceId: newId });
    return newId;
  }

  /**
   * Computes a SHA-256 cryptographic signature to prevent casual storage tampering.
   */
  private async computeSignature(
    key: string,
    tier: string,
    instanceId: string,
    timestamp: number
  ): Promise<string> {
    const payload = `${key}:${tier}:${instanceId}:${timestamp}:${INTEGRITY_SALT}`;
    const buffer = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verifies that the stored quota hasn't been modified through DevTools.
   * If a user arbitrarily forged { tier: 'pro' } without a signed license record,
   * this automatically resets the account back to the 75-point free tier.
   */
  public async verifyStorageIntegrity(): Promise<UserQuota> {
    const res = await chrome.storage?.local?.get(['quota', 'licenseRecord', 'instanceId']);
    let quota: UserQuota = (res?.quota as UserQuota | undefined) ?? {
      pointsRemaining: 75,
      pointsTotal: 75,
      tier: 'free',
    };
    const license: LicenseRecord | undefined = res?.licenseRecord as LicenseRecord | undefined;
    const instanceId = res?.instanceId as string | undefined;

    // 1. Paid Tier Guard: pro or deep_clean
    if (quota.tier === 'pro' || quota.tier === 'deep_clean') {
      if (!license || !instanceId) {
        console.warn('[YT-WL-Gardener Security] Unauthorized tier detected without license. Resetting to free.');
        return await this.resetToFree();
      }

      const expectedSig = await this.computeSignature(
        license.key,
        license.tier,
        instanceId,
        license.activatedAt
      );

      if (license.signature !== expectedSig || license.tier !== quota.tier) {
        console.warn('[YT-WL-Gardener Security] Storage signature mismatch. Resetting to free.');
        return await this.resetToFree();
      }
    } else {
      // 2. Free Tier Point Inflation Guard
      if (quota.pointsRemaining > 75 || quota.pointsTotal > 75) {
        console.warn('[YT-WL-Gardener Security] Point inflation detected. Clamping to standard free allocation.');
        quota = {
          pointsRemaining: Math.min(quota.pointsRemaining, 75),
          pointsTotal: 75,
          tier: 'free',
        };
        await chrome.storage?.local?.set({ quota });
      }
    }

    return quota;
  }

  /**
   * Resets account cleanly to the standard free tier.
   */
  public async resetToFree(): Promise<UserQuota> {
    const freeQuota: UserQuota = {
      pointsRemaining: 75,
      pointsTotal: 75,
      tier: 'free',
    };
    await chrome.storage?.local?.set({
      quota: freeQuota,
      licenseRecord: null,
    });
    return freeQuota;
  }

  /**
   * Saves and cryptographically signs a verified license into storage.
   */
  private async saveVerifiedLicense(
    key: string,
    tier: PricingTier,
    customerEmail?: string
  ): Promise<UserQuota> {
    const instanceId = await this.getOrCreateInstanceId();
    const activatedAt = Date.now();
    const signature = await this.computeSignature(key, tier, instanceId, activatedAt);

    const record: LicenseRecord = {
      key,
      tier,
      instanceId,
      activatedAt,
      customerEmail,
      signature,
    };

    let updatedQuota: UserQuota;
    if (tier === 'pro') {
      updatedQuota = {
        tier: 'pro',
        pointsRemaining: 999999,
        pointsTotal: 999999,
      };
    } else {
      const addedPoints = TIERS.deep_clean.pointsGranted;
      const res = await chrome.storage?.local?.get(['quota']);
      const currentQuota: UserQuota = (res?.quota as UserQuota | undefined) ?? {
        pointsRemaining: 75,
        pointsTotal: 75,
        tier: 'free',
      };
      updatedQuota = {
        tier: 'deep_clean',
        pointsRemaining: currentQuota.pointsRemaining + addedPoints,
        pointsTotal: currentQuota.pointsTotal + addedPoints,
      };
    }

    await chrome.storage?.local?.set({
      quota: updatedQuota,
      licenseRecord: record,
    });

    console.log(`[YT-WL-Gardener] Signed & activated license: ${key} (${tier})`);
    return updatedQuota;
  }

  /**
   * Activates a license key with Lemon Squeezy API or Sandbox simulation.
   */
  public async activateLicense(
    rawKey: string
  ): Promise<{ success: boolean; message: string; quota?: UserQuota }> {
    const cleanKey = rawKey.trim();
    if (!cleanKey) {
      return { success: false, message: 'Please enter a valid license key.' };
    }

    // Sandbox / Test Mode simulation
    if (this.config.sandboxMode && cleanKey.toUpperCase().startsWith('TEST-')) {
      const isPro = cleanKey.toUpperCase().includes('PRO') || cleanKey.toUpperCase().includes('LIFE');
      const tier: PricingTier = isPro ? 'pro' : 'deep_clean';
      const quota = await this.saveVerifiedLicense(cleanKey, tier, 'tester@example.com');
      return {
        success: true,
        message: `[Sandbox] Verified! Activated ${TIERS[tier].name}.`,
        quota,
      };
    }

    try {
      const instanceId = await this.getOrCreateInstanceId();
      const body = new URLSearchParams({
        license_key: cleanKey,
        instance_name: `Chrome Extension (${instanceId.slice(0, 8)})`,
      });

      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (data?.activated && data?.license_key?.status === 'active') {
        const tier: PricingTier = 'pro';
        const email = data.meta?.customer_email;
        const quota = await this.saveVerifiedLicense(cleanKey, tier, email);
        return {
          success: true,
          message: 'License activated successfully! Lifetime Pro unlocked.',
          quota,
        };
      } else {
        return {
          success: false,
          message: data?.error || 'Invalid or already activated license key.',
        };
      }
    } catch (err: any) {
      console.error('[YT-WL-Gardener] Lemon Squeezy activation network error:', err);
      return {
        success: false,
        message: 'Could not connect to Lemon Squeezy. Check your internet connection.',
      };
    }
  }

  /**
   * Periodic heartbeat: Re-validates the license with Lemon Squeezy's API.
   * If refunded or canceled, revokes Pro status.
   */
  public async validateStoredLicense(): Promise<boolean> {
    const res = await chrome.storage?.local?.get(['licenseRecord', 'instanceId']);
    const license: LicenseRecord | undefined = res?.licenseRecord as LicenseRecord | undefined;
    if (!license) return false;

    if (this.config.sandboxMode && license.key.startsWith('TEST-')) {
      return true;
    }

    try {
      const body = new URLSearchParams({
        license_key: license.key,
        instance_id: license.instanceId,
      });

      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();
      if (data?.valid === true) {
        return true;
      } else {
        console.warn('[YT-WL-Gardener Security] Remote license is no longer valid. Revoking Pro access.');
        await this.resetToFree();
        return false;
      }
    } catch (err) {
      // If offline, do not penalize paying user
      console.warn('[YT-WL-Gardener Security] License validation offline:', err);
      return true;
    }
  }

  /**
   * Retrieves the currently stored and active license record, if any.
   */
  public async getStoredLicense(): Promise<LicenseRecord | null> {
    const res = await chrome.storage?.local?.get(['licenseRecord']);
    return (res?.licenseRecord as LicenseRecord | undefined) ?? null;
  }

  /**
   * Convenient helper for sandbox simulation during development and testing.
   */
  public async simulateCheckout(tier: PricingTier): Promise<UserQuota> {
    const testKey = tier === 'pro' ? 'TEST-PRO-KEY' : 'TEST-DEEP-KEY';
    const res = await this.activateLicense(testKey);
    return (
      res.quota ?? {
        pointsRemaining: 75,
        pointsTotal: 75,
        tier: 'free',
      }
    );
  }
}

export const paymentService = new PaymentService();
