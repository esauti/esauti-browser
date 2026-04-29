import {BrowserClientOptions, FormMountOptions, FormSubmitResult} from './types';
import { normalizeBaseUrl, toQuery } from './utils';

export function mountForm(
  el: HTMLElement,
  opts: BrowserClientOptions,
  m: FormMountOptions
): () => void {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const formId = m.formId;
  const url = `${baseUrl}/form/${encodeURIComponent(formId)}${toQuery(m.query || {})}`;

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.loading = 'lazy';
  iframe.style.border = '0';
  iframe.style.width =
    typeof m.width === 'number' ? `${m.width}px` : m.width || '100%';
  iframe.style.height =
    typeof m.height === 'number' ? `${m.height}px` : m.height || '600px';
  if (m.className) iframe.className = m.className;
  iframe.setAttribute('data-esauti-form', formId);

  el.appendChild(iframe);

  return () => {
    try {
      iframe.remove();
    } catch {
      // ignore
    }
  };
}

export async function submitForm(
  opts: BrowserClientOptions,
  id: string,
  payload: Record<string, string | Blob>,
  extra: Record<string, unknown> = {},
): Promise<FormSubmitResult|undefined> {
  const formValues = new FormData();

  for (const key of Object.keys(payload)) {
    if (!payload[key]) {
      continue;
    }
    formValues.append(`mauticform[${key}]`, payload[key]!);
  }
  formValues.set("mauticform[formId]", id);

  try {
    const response = await fetch(`${opts.baseUrl}/form/submit?ajax=1`, {
      method: "POST",
      body: formValues,
      mode: 'cors',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      }
    });

    if (!response.ok) {
      console.error("Could not post the survey results");
      return;
    }
    return (await response.json()) as FormSubmitResult;
  } catch (error) {
    console.log(error);
  }
}
