import { debugLog, uuidv4 } from "./utils";

export type HttpResponse<T = unknown> = {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  data: T | null;
  rawText: string;
};

export type HttpRequestOptions = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  json?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  debug?: boolean;
};

export class TransportError extends Error {
  name = "TransportError";
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

export class ApiError extends Error {
  name = "ApiError";
  constructor(
    message: string,
    public status: number,
    public bodyText: string,
    public headers: Record<string, string>
  ) {
    super(message);
  }
}

export async function httpRequest<T = unknown>(opts: HttpRequestOptions): Promise<HttpResponse<T>> {
  const controller = opts.timeoutMs ? new AbortController() : null;
  const timeout = opts.timeoutMs
    ? setTimeout(() => controller?.abort(new DOMException("Request timeout", "AbortError")), opts.timeoutMs)
    : null;

  const mergedSignal = mergeSignals(opts.signal, controller?.signal);

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  let body: string | undefined;

  if (opts.json !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(opts.json);
  }

  debugLog(opts.debug, "HTTP", opts.method, opts.url);

  try {
    const res = await fetch(opts.url, {
      method: opts.method,
      headers,
      body,
      signal: mergedSignal ?? undefined,
      credentials: "include",
    });

    const headerObj: Record<string, string> = {};
    res.headers.forEach((v, k) => (headerObj[k.toLowerCase()] = v));

    const rawText = await res.text();
    let data: T | null = null;
    try {
      data = rawText ? (JSON.parse(rawText) as T) : null;
    } catch {
      data = null;
    }

    const out: HttpResponse<T> = {
      status: res.status,
      ok: res.ok,
      headers: headerObj,
      data,
      rawText,
    };

    if (!res.ok) {
      throw new ApiError(`HTTP ${res.status}`, res.status, rawText, headerObj);
    }

    return out;
  } catch (e: any) {
    if (e?.name === "ApiError") throw e;
    throw new TransportError(e?.message || "Network error", e);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function mergeSignals(a?: AbortSignal | null, b?: AbortSignal | null): AbortSignal | null {
  if (!a && !b) return null;
  if (a && !b) return a;
  if (!a && b) return b;

  // Merge by creating a new controller that aborts if any aborts
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a!.addEventListener("abort", onAbort, { once: true });
  b!.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

export function defaultHeaders(requestId?: string): Record<string, string> {
  return {
    "X-Request-Id": requestId || uuidv4(),
  };
}
