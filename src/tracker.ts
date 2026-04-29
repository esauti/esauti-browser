import { debugLog, normalizeBaseUrl } from "./utils";
import type { BrowserClientOptions, TrackerLoadOptions } from "./types";

declare global {
  interface Window {
    mt?: (...args: any[]) => any;
    esauti_start_tracking?: (extra?: Record<string, unknown>) => Promise<void>;
    esauti_is_tracking_loaded?: () => boolean;
  }
}

function scriptExists(src: string): boolean {
  return !!document.querySelector(`script[data-esauti-tracker="1"][src="${CSS.escape(src)}"]`);
}

function isTrackerLoaded(): boolean {
  return typeof window.mt === "function";
}

export function installConsentGate(opts: BrowserClientOptions): void {
  if (typeof window === "undefined") return;

  window.esauti_is_tracking_loaded = () => isTrackerLoaded();

  window.esauti_start_tracking = async (extraAttrs: Record<string, unknown> = {}) => {
    // no-op: BrowserClient will override with an instance-aware implementation.
    debugLog(opts.debug, "esauti_start_tracking called but no client instance is attached.", extraAttrs);
  };
}

export async function loadTrackerScript(
  baseUrl: string,
  loadOpts: TrackerLoadOptions,
  debug?: boolean
): Promise<void> {
  const b = normalizeBaseUrl(baseUrl);
  const trackingScriptUrl = loadOpts.trackingScriptUrl || `${b}/mtc.js`;
  if (typeof document === "undefined") return;

  if (scriptExists(trackingScriptUrl) || isTrackerLoaded()) {
    debugLog(debug, "Tracker already present");
    loadOpts.onLoaded?.();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = trackingScriptUrl;
    s.async = true;
    s.defer = true;
    s.dataset.esautiTracker = "1";

    s.onload = () => {
      debugLog(debug, "Tracker loaded:", trackingScriptUrl);
      loadOpts.onLoaded?.();
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load tracker: ${trackingScriptUrl}`));

    const target = loadOpts.inject === "body" ? document.body : document.head;
    if (!target) return reject(new Error("No DOM target to inject tracker script"));
    target.appendChild(s);
  });
}

export function trackPageView(attrs: Record<string, unknown> = {}, debug?: boolean): void {
  if (typeof window === "undefined") return;
  if (typeof window.mt !== "function") {
    debugLog(debug, "mt() not available; skip trackPageView");
    return;
  }

  // Mautic-style usage: mt('send', 'pageview', {...})
  try {
    window.mt("send", "pageview", {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || undefined,
      ...attrs,
    });
  } catch (e) {
    debugLog(debug, "trackPageView error", e);
  }
}
