export type ConsentState = {
  marketing?: boolean | null;
  analytics?: boolean | null;
  source?: string;
  timestamp?: string; // ISO8601
};

export type Identity = {
  email?: string;
  phone?: string;
  external_id?: string;
  customer?: {
    id?: string;
    external_id?: string;
    email?: string;
    phone?: string;
  };
};

export type EventEnvelope = {
  type: string;                 // canonical event id, e.g. "form.submitted"
  occurred_at: string;           // ISO8601
  source: string;                // integration/source name, e.g. "web"
  external_event_id?: string;    // optional provider idempotency key
  customer?: {
    id?: string;
    external_id?: string;
    email?: string;
    phone?: string;
  };
  entity?: {
    type?: string;
    id?: string;
  };
  properties?: Record<string, unknown>;
};

export type SendEventOptions = {
  idempotencyKey?: string;
  requestId?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type BrowserClientOptions = {
  baseUrl: string;
  token?: string; // Bearer token (optional). You can also rely on tenant public ingest if you allow it.
  source?: string; // default: "web"
  sourceVersion?: string; // default: package version (optional)
  eventsEndpointPath?: string; // default: "/api/integrations/events"
  identifyEndpointPath?: string; // default: "/api/integrations/identify"
  consentMode?: "standard" | "gated"; // default: "standard"
  trackAdmins?: boolean; // default false
  debug?: boolean;
  /**
   * If true, the client patches history.pushState/replaceState to auto-track SPA navigation.
   * Default: false. You can call client.trackPage() yourself.
   */
  enableSpaAutoTracking?: boolean;
  /**
   * Called before any event is sent. Return false to block.
   * Example: enforce consent.
   */
  shouldSendEvent?: (event: EventEnvelope) => boolean;
};

export type TrackerLoadOptions = {
  trackingScriptUrl?: string; // default: `${baseUrl}/mtc.js`
  inject?: "head" | "body";   // default: "head"
  /**
   * Called once mtc.js is loaded (or when we think it's available).
   */
  onLoaded?: () => void;
};

export type FormMountOptions = {
  formId: string;
  mode?: "iframe";            // we intentionally start with iframe embed for reliability
  width?: string | number;    // default: "100%"
  height?: string | number;   // default: 600
  className?: string;
  /**
   * Extra query params appended to the embed URL.
   */
  query?: Record<string, string>;
};

export type FocusOptions = {
  focusId: string;
  /**
   * If true, auto-refresh focus after SPA route changes.
   */
  autoRefreshOnSpa?: boolean;
};
