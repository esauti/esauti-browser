import type { BrowserClientOptions, TrackerLoadOptions } from './types';
import { debugLog, normalizeBaseUrl } from './utils';

declare global {
  interface Window {
    mt?: (...args: any[]) => any;
    esauti_start_tracking?: (extra?: Record<string, unknown>) => Promise<void>;
    esauti_is_tracking_loaded?: () => boolean;
  }
}

function scriptExists(src: string): boolean {
  return !!document.querySelector(
    `script[data-esauti-tracker="1"][src="${CSS.escape(src)}"]`
  );
}

function isTrackerLoaded(): boolean {
  return typeof window.mt === 'function';
}

export function installConsentGate(opts: BrowserClientOptions): void {
  if (typeof window === 'undefined') return;

  window.esauti_is_tracking_loaded = () => isTrackerLoaded();

  window.esauti_start_tracking = async (
    extraAttrs: Record<string, unknown> = {}
  ) => {
    // no-op: BrowserClient will override with an instance-aware implementation.
    debugLog(
      opts.debug,
      'esauti_start_tracking called but no client instance is attached.',
      extraAttrs
    );
  };
}

export async function loadTrackerScript(
  baseUrl: string,
  loadOpts: TrackerLoadOptions,
  debug?: boolean
): Promise<void> {
  const b = normalizeBaseUrl(baseUrl);
  const trackingScriptUrl = loadOpts.trackingScriptUrl || `${b}/mtc.js`;
  if (typeof document === "undefined" || typeof window === "undefined") return;

  // 1) Ensure the global tracking object name is set
  const trackingObjectName = "mt";
  (window as any).MauticTrackingObject = trackingObjectName;

  // 2) Ensure mt() exists as a queue function BEFORE loading mtc.js
  const w = window as any;
  if (typeof w[trackingObjectName] !== "function") {
    w[trackingObjectName] = function (...args: any[]) {
      (w[trackingObjectName].q = w[trackingObjectName].q || []).push(args);
    };
  } else {
    // Ensure it has a queue array if already present
    w[trackingObjectName].q = w[trackingObjectName].q || [];
  }

  // If mtc.js already loaded, we’re done
  if (typeof w.mt === "function" && w.mt !== w[trackingObjectName]) {
    // In rare cases mt is replaced; still fine
  }

  // Avoid inserting duplicates
  const exists = !!document.querySelector(
    `script[data-esauti-tracker="1"][src="${CSS.escape(trackingScriptUrl)}"]`
  );
  if (exists) {
    debugLog(debug, "Tracker script already injected:", trackingScriptUrl);
    loadOpts.onLoaded?.();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const a = document.createElement("script");
    a.async = true;
    a.src = trackingScriptUrl;
    a.dataset.esautiTracker = "1";

    a.onload = () => {
      debugLog(debug, "Tracker loaded:", trackingScriptUrl);
      loadOpts.onLoaded?.();
      resolve();
    };
    a.onerror = () => reject(new Error(`Failed to load tracker: ${trackingScriptUrl}`));

    // Match Mautic behavior: insert before first script tag if possible
    const m = document.getElementsByTagName("script")[0];
    if (m?.parentNode) {
      m.parentNode.insertBefore(a, m);
    } else {
      // fallback
      (loadOpts.inject === "body" ? document.body : document.head).appendChild(a);
    }
  });
}

export function trackPageView(
  attrs: Record<string, unknown> = {},
  debug?: boolean
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.mt !== 'function') {
    debugLog(debug, 'mt() not available; skip trackPageView');
    return;
  }

  try {
    window.mt('send', 'pageview', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || undefined,
      ...attrs,
    });
  } catch (e) {
    debugLog(debug, 'trackPageView error', e);
  }
}
