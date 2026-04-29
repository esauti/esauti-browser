import type {
  BrowserClientOptions,
  EventEnvelope,
  FormMountOptions,
  FocusOptions,
  SendEventOptions,
  TrackerLoadOptions,
} from "./types";
import { installConsentGate, loadTrackerScript, trackPageView } from "./tracker";
import { buildEnvelope, sendEvent } from "./events";
import { mountForm } from "./forms";
import { enableFocus, refreshFocus } from "./focus";
import { patchHistory } from "./spa";
import { identify } from "./identify";
import { debugLog, normalizeBaseUrl } from "./utils";

export * from "./types";
export * from "./http";

export type BrowserClient = {
  init(): Promise<void>;
  loadTracker(loadOpts?: TrackerLoadOptions): Promise<void>;
  startTracking(extraAttrs?: Record<string, unknown>): Promise<void>;
  isTrackingLoaded(): boolean;
  trackPage(attrs?: Record<string, unknown>): void;

  events: {
    build(type: string, payload?: Partial<EventEnvelope>): EventEnvelope;
    send(type: string, payload?: Partial<EventEnvelope> | EventEnvelope, options?: SendEventOptions): Promise<any>;
  };

  identify(identity: any, extra?: Record<string, unknown>): Promise<{ linked: boolean; contact_id?: string }>;

  forms: {
    mount(el: HTMLElement, opts: FormMountOptions): () => void;
  };

  focus: {
    enable(opts: FocusOptions): () => void;
    refresh(focusId: string): void;
  };

  destroy(): void;
};

export function createBrowserClient(options: BrowserClientOptions): BrowserClient {
  const opts: BrowserClientOptions = {
    ...options,
    baseUrl: normalizeBaseUrl(options.baseUrl),
    source: options.source || "web",
    consentMode: options.consentMode || "standard",
  };

  let unpatch: null | (() => void) = null;

  // Install global consent gate placeholders (we bind instance methods below).
  installConsentGate(opts);

  function isTrackingLoaded(): boolean {
    return typeof window !== "undefined" && typeof (window as any).mt === "function";
  }

  async function loadTracker(loadOpts: TrackerLoadOptions = {}): Promise<void> {
    await loadTrackerScript(opts.baseUrl, { inject: "head", ...loadOpts }, opts.debug);
  }

  async function startTracking(extraAttrs: Record<string, unknown> = {}): Promise<void> {
    // Always load tracker first
    await loadTracker();
    // Then send initial pageview
    trackPageView(extraAttrs, opts.debug);
  }

  function trackPage(attrs: Record<string, unknown> = {}): void {
    trackPageView(attrs, opts.debug);
  }

  async function init(): Promise<void> {
    // Wire the instance-aware implementation into window.esauti_start_tracking
    if (typeof window !== "undefined") {
      window.esauti_start_tracking = startTracking;
      window.esauti_is_tracking_loaded = () => isTrackingLoaded();
    }

    // Standard mode loads tracker immediately
    if (opts.consentMode === "standard") {
      try {
        await loadTracker();
        trackPage();
      } catch (e) {
        debugLog(opts.debug, "Tracker init failed (standard mode)", e);
      }
    }

    // Optional SPA auto-tracking
    if (opts.enableSpaAutoTracking) {
      const debounced = debounce(() => trackPage(), 250);
      unpatch = patchHistory({ onNavigate: debounced, debug: opts.debug });
    }
  }

  const api = {
    init,
    loadTracker,
    startTracking,
    isTrackingLoaded,
    trackPage,
    events: {
      build: (type: string, payload: Partial<EventEnvelope> = {}) => buildEnvelope(opts, type, payload),
      send: async (type: string, payload: Partial<EventEnvelope> | EventEnvelope = {}, options: SendEventOptions = {}) => {
        const env = (payload as any).type ? (payload as EventEnvelope) : buildEnvelope(opts, type, payload as Partial<EventEnvelope>);
        return sendEvent(opts, env, options);
      },
    },
    identify: (identityObj: any, extra: Record<string, unknown> = {}) => identify(opts, identityObj, extra),
    forms: {
      mount: (el: HTMLElement, m: FormMountOptions) => mountForm(el, opts, m),
    },
    focus: {
      enable: (f: FocusOptions) => enableFocus(opts, f),
      refresh: (focusId: string) => refreshFocus(opts, focusId),
    },
    destroy: () => {
      if (unpatch) unpatch();
      unpatch = null;
    },
  } satisfies BrowserClient;

  return api;
}

function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number): T {
  let t: any = null;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  }) as T;
}
