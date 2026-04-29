import type { BrowserClientOptions, EventEnvelope, SendEventOptions } from "./types";
import { defaultHeaders, httpRequest } from "./http";
import { debugLog, isoNow, normalizeBaseUrl, uuidv4 } from "./utils";

export class ValidationError extends Error {
  name = "ValidationError";
}

function validateEnvelope(e: EventEnvelope): void {
  const requiredTop = ["type", "occurred_at", "source"] as const;
  for (const k of requiredTop) {
    if (!(e as any)[k]) throw new ValidationError(`Missing required field: ${k}`);
  }
  if (typeof e.type !== "string" || !e.type.includes(".")) {
    throw new ValidationError(`Invalid event type: ${e.type}`);
  }
}

export function buildEnvelope(
  opts: BrowserClientOptions,
  type: string,
  payload: Partial<EventEnvelope>
): EventEnvelope {
  const source = payload.source || opts.source || "web";
  const occurred_at = payload.occurred_at || isoNow();

  const out: EventEnvelope = {
    type,
    occurred_at,
    source,
    external_event_id: payload.external_event_id,
    customer: payload.customer,
    entity: payload.entity,
    properties: payload.properties || {},
  };

  return out;
}

export async function sendEvent(
  opts: BrowserClientOptions,
  envelope: EventEnvelope,
  sendOpts: SendEventOptions = {}
): Promise<{ received: boolean; event_id?: string; status: number; raw: string }> {
  validateEnvelope(envelope);

  if (opts.shouldSendEvent && !opts.shouldSendEvent(envelope)) {
    debugLog(opts.debug, "Event blocked by shouldSendEvent()", envelope.type);
    return { received: false, status: 0, raw: "blocked" };
  }

  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const path = opts.eventsEndpointPath || "/v1/inbound/event";
  const url = `${baseUrl}${path}`;

  const requestId = sendOpts.requestId || uuidv4();
  const idem = sendOpts.idempotencyKey || uuidv4();

  const headers: Record<string, string> = {
    ...defaultHeaders(requestId),
    "Idempotency-Key": idem,
    "X-eSauti-Source": opts.source || "web",
    ...(sendOpts.headers || {}),
  };

  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await httpRequest<any>({
    method: "POST",
    url,
    headers,
    json: envelope,
    timeoutMs: sendOpts.timeoutMs ?? 10_000,
    signal: sendOpts.signal,
    debug: opts.debug,
  });

  return {
    received: true,
    event_id: res.data?.event_id,
    status: res.status,
    raw: res.rawText,
  };
}
