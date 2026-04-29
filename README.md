# @esauti/browser

Browser SDK for **eSauti** focused on:
- Consent-gated tracking loader (loads `mtc.js` only when allowed)
- SPA page tracking helpers
- **Event Injection** client (send canonical events like `form.submitted`, `order.paid`, etc.)
- Form embedding (`/form/{id}`) and Focus embedding (`/focus/{id}.js`)

This package is **browser-only**. For backend/server integrations, keep a separate SDK package (Node/Python/PHP).

## Install

```bash
npm i @esauti/browser
```

## Quick start (vanilla / Vite)

```ts
import { createBrowserClient } from "@esauti/browser";

const esauti = createBrowserClient({
  baseUrl: "https://tenant.esauti.com",
  token: "YOUR_INTEGRATION_TOKEN",   // optional (recommended for authenticated ingest)
  source: "web",
  consentMode: "gated",              // "standard" or "gated"
  enableSpaAutoTracking: true,       // auto track SPA navigation
  shouldSendEvent: (evt) => true,    // optional hook for consent enforcement
});

await esauti.init();

// When user gives consent:
await window.esauti_start_tracking?.();

// Send a canonical event to your ingest endpoint
await esauti.events.send("form.submitted", {
  customer: { email: "user@example.com" },
  entity: { type: "form", id: "for_001" },
  properties: { form_id: "frm_contact", form_name: "Contact Us", page_url: location.href }
});
```

## Tracking modes

### Standard mode
- Loads tracker immediately on init.
- Sends initial pageview.

```ts
createBrowserClient({ baseUrl, consentMode: "standard" })
```

### Consent-gated mode (recommended for Law 25 / GDPR)
- Does NOT load tracker automatically.
- Exposes `window.esauti_start_tracking()` to start tracking after consent.

```ts
createBrowserClient({ baseUrl, consentMode: "gated" })
```

## Forms

Simple iframe embed (reliable across frameworks):

```ts
const cleanup = esauti.forms.mount(document.getElementById("form")!, {
  formId: "123",
  height: 720,
  width: "100%",
});

// later
cleanup();
```

The embed URL is: `{baseUrl}/form/{id}`.

## Focus

```ts
const stop = esauti.focus.enable({ focusId: "42", autoRefreshOnSpa: true });

// If you need to refresh manually:
esauti.focus.refresh("42");

stop();
```

Focus loads: `{baseUrl}/focus/{id}.js`.

## Identify (link app user -> tracked visitor)

If you implement an eSauti identify endpoint (recommended):

```ts
await esauti.identify({ external_id: "user_123", email: "optional@example.com" });
```

Default endpoint path: `/api/integrations/identify` (configurable).

## Event injection

Default endpoint path: `/api/integrations/events` (configurable).
Headers sent:
- `Authorization: Bearer <token>` (if token provided)
- `Idempotency-Key: <uuid>`
- `X-Request-Id: <uuid>`
- `X-eSauti-Source: <source>`

## API Reference (high level)

- `createBrowserClient(options)`
- `client.init()`
- `client.loadTracker()`
- `client.startTracking(extraAttrs?)`
- `client.trackPage(attrs?)`
- `client.events.build(type, payload?)`
- `client.events.send(type, payloadOrEnvelope?, options?)`
- `client.forms.mount(el, {formId,...})`
- `client.focus.enable({focusId,...})`
- `client.identify(identity, extra?)`

## Build

```bash
npm run build
```
---
MIT License
