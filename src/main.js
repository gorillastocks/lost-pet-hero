import './style.css';
import { Capacitor } from '@capacitor/core';
import { createApp } from './ui.js';
import { defaultStore, initStorage } from './storage.js';

const root = document.getElementById('app');
const app = createApp(root, defaultStore());

initStorage().then(() => app.showTitle()).catch(() => app.showTitle());

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try { if (Capacitor.isNativePlatform()) return; } catch { /* browser build */ }
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!secure) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

if (document.readyState === 'complete') registerSW();
else window.addEventListener('load', registerSW);
