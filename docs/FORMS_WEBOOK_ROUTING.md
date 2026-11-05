# Proti — Multiple Form Webhooks

This feature routes different published Sanity Form Blocks to distinct server-approved webhook endpoints. No database, Redis, or Mino UI changes are necessary.

## How it works

1. Editor chooses a **Webhook Destination** in a Form Block's **Behavior** tab.
2. Proti's POST `/api/forms/submit` validates the origin and payload, and looks up the **published** form using its Site, locale, Form Key, and Block Key.
3. The API reads `webhookDestination` from the published form, **not** from the browser payload.
4. Server-only settings map that key to a webhook URL and signature secret. Each endpoint receives the same `X-Proti-Signature: sha256=...` HMAC as before, signed using that endpoint's secret.
5. An unknown/unconfigured named key returns HTTP 503. It is **never** sent to the default webhook.

## 1. Configure Proti Web (server-only)

Keep your existing variables for the **default** webhook:

```env
FORM_WEBHOOK_URL=https://example.com/default-hook
FORM_WEBHOOK_SECRET=your-default-secret
FORM_ALLOWED_ORIGINS=https://proti-demo-web.vercel.app
```

Add **one** new server-side environment variable, `FORM_WEBHOOK_DESTINATIONS`, as a single JSON object. Example (replace the placeholder values and **do not commit actual credentials**):

```json
{
  "contact": {
    "url": "https://example.com/contact-hook",
    "secret": "secret-for-contact",
    "siteIds": ["your-sanity-site-document-id"]
  },
  "newsletter": {
    "url": "https://example.com/newsletter-hook",
    "secret": "secret-for-newsletter"
  },
  "quotes": {
    "url": "https://example.com/quotes-hook",
    "secret": "secret-for-quotes"
  }
}
```

Copy the JSON as the value of `FORM_WEBHOOK_DESTINATIONS` in **Vercel → Project → Settings → Environment Variables**, using the intended environment(s). `siteIds` is optional; when provided, only those Sanity Site IDs may send to the destination. A key without `siteIds` can be used by any site served by this deployment.

Use HTTPS endpoints. You may use an HTTP localhost endpoint **only in local development**. Each named destination requires its **own** `secret`; it never silently inherits the default secret.

### No webhook URL in Studio

The Studio contains **only keys and friendly labels**; neither URLs nor secrets are exposed to editors or client bundles.

## 2. Configure the Studio dropdown (public labels only)

In the Sanity **Studio's** environment, set:

```env
SANITY_STUDIO_FORM_WEBHOOK_DESTINATIONS=contact:Contact Submissions,newsletter:Newsletter Signups,quotes:Quote Requests
```

This is a **public build-time value**, not a secret. Studio uses it to populate the **Behavior → Webhook Destination** select menu along with `Default Webhook`.

Add the value to `studio/.env` for local Studio, and to the environment used to **build/deploy Studio** for hosted Studio. Rebuild/redeploy Studio after changing the dropdown choices. Your Studio configuration may deploy separately from Proti Web; set this variable in the Studio deployment, not only in Web.

Both sets of keys must match exactly (lowercase letters, digits, underscores and hyphens; beginning with a lowercase letter). If a key exists in Studio but is not configured in Web, submissions using it return 503.

## 3. Assign a form to a destination

In Sanity Studio, edit and publish a page containing a Form Block:

- **Behavior → Webhook Destination**: choose Contact Submissions / Newsletter Signups / Quote Requests / Default Webhook.
- Existing forms with no selected destination continue using the `FORM_WEBHOOK_URL` + `FORM_WEBHOOK_SECRET` default.
- A named form always uses the corresponding named endpoint, even if the browser tries to override its destination.

The published change updates routing without a Web redeploy (subject to normal Content Lake propagation); the server-side configuration must already exist in that deployment.

## 4. Verify in production

Publish two test Form Blocks with distinct Form Keys and select different destinations. Send fake test data (no real customer details). Confirm that **each destination receives only its own form's submissions** and its HMAC signature can be verified with that destination's secret. Also test a form set to `Default Webhook`.

For a negative test, temporarily select a valid Studio key not configured in Web: the API should return a generic 503 and **not** leak the submitted data to the default endpoint. Return it to the correct key and publish again.

### Existing functionality preserved

Origin checking, payload-size limits, server-side validation, published-only lookup, honeypot spam trap, success/redirect confirmation behavior, and no-Redis operation all remain. Webhook failures continue to return HTTP 502 and keep the form available for retry.

### Operational notes

- Form submissions aren't stored in Sanity; successful delivery is to the configured external webhook.
- The webhook receiver should validate `X-Proti-Signature` using its configured secret.
- There is no distributed rate limiting or durable idempotency store. Honeypots are basic spam deterrence, not comprehensive anti-abuse measures.
- If an editor changes a destination for a form, publish that change and verify the receiving system before collecting actual submissions.
