import type { BrowserClientOptions, Identity } from "./types";
import { defaultHeaders, httpRequest } from "./http";
import { normalizeBaseUrl, uuidv4 } from "./utils";

export async function identify(
  opts: BrowserClientOptions,
  identity: Identity,
  extra: Record<string, unknown> = {},
  requestId?: string
): Promise<{ linked: boolean; contact_id?: string }> {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const path = opts.identifyEndpointPath || "/api/integrations/identify";
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    ...defaultHeaders(requestId || uuidv4()),
    "X-eSauti-Source": opts.source || "web",
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await httpRequest<any>({
    method: "POST",
    url,
    headers,
    json: { identity, ...extra },
    timeoutMs: 10_000,
    debug: opts.debug,
  });

  return {
    linked: Boolean(res.data?.linked ?? true),
    contact_id: res.data?.contact_id,
  };
}
