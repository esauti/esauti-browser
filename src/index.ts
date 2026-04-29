import {enableFocus, refreshFocus} from './focus';
import {mountForm, submitForm} from './forms';
import {identify} from './identify';
import {patchHistory} from './spa';
import {installConsentGate, loadTrackerScript, trackPageView,} from './tracker';
import {
  BrowserClientOptions,
  FocusOptions,
  FormMountOptions,
  FormSubmitResult,
  Identity,
  TrackerLoadOptions,
} from './types';
import {debugLog, normalizeBaseUrl} from './utils';
import {getTrackedContactId, getTrackedContactInfo} from "./tracked-contact";

export * from './http';
export * from './types';

export type BrowserClient = {
  init(): Promise<void>;
  loadTracker(loadOpts?: TrackerLoadOptions): Promise<void>;
  startTracking(extraAttrs?: Record<string, unknown>): Promise<void>;
  isTrackingLoaded(): boolean;
  trackPage(attrs?: Record<string, unknown>): void;

  identify(
    identity: any,
    extra?: Record<string, unknown>
  ): void;

  forms: {
    mount(el: HTMLElement, opts: FormMountOptions): () => void;
    submit: (id: string, payload: Record<string, string | Blob>, extra: Record<string, unknown>) => Promise<FormSubmitResult|undefined>;
  };

  focus: {
    enable(opts: FocusOptions): () => void;
    refresh(focusId: string): void;
  };

  tracked: {
    getContactId(): string | null;
    getInfo(): {
      contactId: string | null;
      deviceId: string | null;
      source: "cookie" | "localStorage" | "none";
    };
  }

  destroy(): void;
};

export function createBrowserClient(
  options: BrowserClientOptions
): BrowserClient {
  const opts: BrowserClientOptions = {
    ...options,
    baseUrl: normalizeBaseUrl(options.baseUrl),
    source: options.source || 'web',
  };

  let unpatch: null | (() => void) = null;

  // Install global consent gate placeholders (we bind instance methods below).
  installConsentGate(opts);

  function isTrackingLoaded(): boolean {
    return (
      typeof window !== 'undefined' && typeof (window as any).mt === 'function'
    );
  }

  async function loadTracker(loadOpts: TrackerLoadOptions = {}): Promise<void> {
    await loadTrackerScript(
      opts.baseUrl,
      { inject: 'head', ...loadOpts },
      opts.debug
    );
  }

  async function startTracking(
    extraAttrs: Record<string, unknown> = {}
  ): Promise<void> {
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
    if (typeof window !== 'undefined') {
      window.esauti_start_tracking = startTracking;
      window.esauti_is_tracking_loaded = () => isTrackingLoaded();
    }

    try {
      await loadTracker();
      trackPage();
    } catch (e) {
      debugLog(opts.debug, 'Tracker init failed (standard mode)', e);
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
    identify: (identityObj: Identity, extra: Record<string, unknown> = {}) =>
      identify(opts, identityObj, extra),
    forms: {
      mount: (el: HTMLElement, m: FormMountOptions) => mountForm(el, opts, m),
      submit: (id: string, payload: Record<string, string | Blob>, extra: Record<string, unknown> = {}) => submitForm(opts, id, payload, extra),
    },
    focus: {
      enable: (f: FocusOptions) => enableFocus(opts, f),
      refresh: (focusId: string) => refreshFocus(opts, focusId),
    },
    tracked: {
      getContactId: () => getTrackedContactId(),
      getInfo: () => getTrackedContactInfo(),
    },
    destroy: () => {
      if (unpatch) unpatch();
      unpatch = null;
    },
  } satisfies BrowserClient;

  return api;
}

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  waitMs: number
): T {
  let t: any = null;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  }) as T;
}
