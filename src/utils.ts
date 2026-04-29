export function normalizeBaseUrl(baseUrl: string): string {
  const u = baseUrl.trim().replace(/\/+$/, "");
  return u;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function uuidv4(): string {
  // RFC4122 v4 (browser-safe)
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  const bytes = new Uint8Array(16);
  cryptoObj?.getRandomValues?.(bytes);

  // fallback if crypto is unavailable
  if (!cryptoObj?.getRandomValues) {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export function debugLog(enabled: boolean | undefined, ...args: unknown[]): void {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.log("[@esauti/browser]", ...args);
}

export function isProbablyAdmin(): boolean {
  // You can replace this with your own heuristic or config.
  // For WordPress, people often check for wp-admin; for generic SPAs it's unknown.
  return false;
}
