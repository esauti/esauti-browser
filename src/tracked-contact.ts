export type TrackedContactInfo = {
  contactId: string | null;       // mtc_id
  deviceId: string | null;        // mautic_device_id
  source: "cookie" | "localStorage" | "none";
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    const idx = c.indexOf("=");
    const k = idx >= 0 ? c.slice(0, idx) : c;
    if (k === name) return idx >= 0 ? decodeURIComponent(c.slice(idx + 1)) : "";
  }
  return null;
}

function getLocalStorage(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Returns the current tracked contact identifiers set by mtc.js.
 * - mtc.js sets cookies + localStorage keys: mtc_id and mautic_device_id.  [oai_citation:1‡mtj.js](sediment://file_00000000d67c71f7b0ba0047a108bf6a)
 */
export function getTrackedContactInfo(): TrackedContactInfo {
  // 1) Prefer cookies (first-party)
  const cookieContactId = getCookie("mtc_id");
  const cookieDeviceId = getCookie("mautic_device_id");
  if (cookieContactId || cookieDeviceId) {
    return {
      contactId: cookieContactId || null,
      deviceId: cookieDeviceId || null,
      source: "cookie",
    };
  }

  // 2) Fallback to localStorage (mtc.js writes these too)  [oai_citation:2‡mtj.js](sediment://file_00000000d67c71f7b0ba0047a108bf6a)
  const lsContactId = getLocalStorage("mtc_id");
  const lsDeviceId = getLocalStorage("mautic_device_id");
  if (lsContactId || lsDeviceId) {
    return {
      contactId: lsContactId || null,
      deviceId: lsDeviceId || null,
      source: "localStorage",
    };
  }

  return { contactId: null, deviceId: null, source: "none" };
}

/**
 * Convenience: returns mtc_id only.
 */
export function getTrackedContactId(): string | null {
  return getTrackedContactInfo().contactId;
}
