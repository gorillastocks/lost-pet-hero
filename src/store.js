// The App Store sheet. On an iPhone this asks StoreKit to present it.
// On the web there is no StoreKit, so the game shows its own stub sheet instead.
// Callers must already have passed the parental gate. This file does not check that.
import { Capacitor, registerPlugin } from '@capacitor/core';

export const PRODUCT_ID = 'com.gorillastocks.lostpethero.fullgame';

export function isNativeIOS() {
  try {
    return !!Capacitor?.isNativePlatform?.() && Capacitor.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}

function plugin() {
  try { return registerPlugin('LostPetStore'); } catch { return null; }
}

/** Presents the system purchase sheet on iOS. On the web, reports that the stub should show. */
export async function presentPurchase() {
  if (!isNativeIOS()) return { platform: 'web', opened: false, owned: false };
  const store = plugin();
  if (!store?.purchase) return { platform: 'ios', opened: false, owned: false };
  try {
    const result = await store.purchase();
    return { platform: 'ios', opened: true, owned: !!result?.owned, cancelled: !!result?.cancelled };
  } catch (err) {
    return { platform: 'ios', opened: false, owned: false, error: String(err?.message || err) };
  }
}

export async function restorePurchases() {
  if (!isNativeIOS()) return { platform: 'web', owned: false };
  const store = plugin();
  if (!store?.restore) return { platform: 'ios', owned: false };
  try {
    const result = await store.restore();
    return { platform: 'ios', owned: !!result?.owned };
  } catch {
    return { platform: 'ios', owned: false };
  }
}
