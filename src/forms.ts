import type { BrowserClientOptions, FormMountOptions } from "./types";
import { normalizeBaseUrl, toQuery } from "./utils";

export function mountForm(el: HTMLElement, opts: BrowserClientOptions, m: FormMountOptions): () => void {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const formId = m.formId;
  const url = `${baseUrl}/form/${encodeURIComponent(formId)}${toQuery(m.query || {})}`;

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.loading = "lazy";
  iframe.style.border = "0";
  iframe.style.width = typeof m.width === "number" ? `${m.width}px` : (m.width || "100%");
  iframe.style.height = typeof m.height === "number" ? `${m.height}px` : (m.height || "600px");
  if (m.className) iframe.className = m.className;
  iframe.setAttribute("data-esauti-form", formId);

  el.appendChild(iframe);

  return () => {
    try {
      iframe.remove();
    } catch {
      // ignore
    }
  };
}
