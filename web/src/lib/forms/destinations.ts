import "server-only";

/** A destination is resolved exclusively from trusted server configuration. */
export interface FormWebhookDestination {
  url: string;
  secret: string;
}

const KEY_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validatedDestination(value: unknown): FormWebhookDestination | null {
  if (!isObject(value)) return null;
  const urlValue = value.url;
  const secret = value.secret;
  if (
    typeof urlValue !== "string" ||
    typeof secret !== "string" ||
    !secret.trim()
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(urlValue.trim());
  } catch {
    return null;
  }

  const localDevelopment =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);

  if (
    (url.protocol !== "https:" && !localDevelopment) ||
    url.username ||
    url.password
  ) {
    return null;
  }
  return { url: url.toString(), secret: secret.trim() };
}

/**
 * Missing/"default" retains the existing single-webhook integration.
 * Named keys must be explicitly configured: never fall back to the default
 * when a published form specifies an unknown or broken destination.
 *
 * Optional siteIds limits a named destination to the listed Sanity Sites.
 */
export function resolveFormWebhookDestination(
  destinationKey: string | undefined,
  siteId: string,
): FormWebhookDestination | null {
  const key = destinationKey ?? "default";
  if (key === "default") {
    return validatedDestination({
      url: process.env.FORM_WEBHOOK_URL,
      secret: process.env.FORM_WEBHOOK_SECRET,
    });
  }

  if (!KEY_PATTERN.test(key)) return null;

  let destinations: unknown;
  try {
    destinations = JSON.parse(process.env.FORM_WEBHOOK_DESTINATIONS ?? "{}");
  } catch {
    return null;
  }
  if (
    !isObject(destinations) ||
    !Object.prototype.hasOwnProperty.call(destinations, key)
  ) {
    return null;
  }

  const config = destinations[key];
  if (!isObject(config)) return null;
  if (Object.prototype.hasOwnProperty.call(config, "siteIds")) {
    if (
      !Array.isArray(config.siteIds) ||
      !config.siteIds.every((id) => typeof id === "string") ||
      !config.siteIds.includes(siteId)
    ) {
      return null;
    }
  }
  return validatedDestination(config);
}
