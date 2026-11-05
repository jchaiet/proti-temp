import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** One signed, HttpOnly cookie containing an anonymous browser's recent poll IDs. */
export const POLL_COOKIE_NAME = "proti_poll_votes";
export const POLL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
export const POLL_MAX_TRACKED = 100;

const FINGERPRINT_PATTERN = /^[a-f0-9]{24}$/;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/;

export function pollVisitorSecret(): string | null {
  const secret = process.env.POLL_VISITOR_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/** A stable, non-reversible ID for a poll scoped to its site and locale. */
export function pollFingerprint(
  siteId: string,
  locale: string,
  pollKey: string,
): string {
  return createHash("sha256")
    .update(JSON.stringify([siteId, locale, pollKey]))
    .digest("hex")
    .slice(0, 24);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`proti-poll-history:${payload}`)
    .digest("hex");
}

/** Invalid/missing cookies are treated as an empty history (equivalent to clearing cookies). */
export function readPollHistory(
  cookie: string | null,
  secret: string,
): string[] {
  if (!cookie) return [];

  const pieces = cookie.split(".");
  if (pieces.length < 3 || pieces[0] !== "v1") return [];

  const ids = pieces.slice(1, -1);
  const signature = pieces.at(-1) ?? "";
  if (
    !ids.length ||
    ids.length > POLL_MAX_TRACKED ||
    ids.some((id) => !FINGERPRINT_PATTERN.test(id)) ||
    new Set(ids).size !== ids.length ||
    !SIGNATURE_PATTERN.test(signature)
  )
    return [];

  const payload = pieces.slice(0, -1).join(".");
  const expected = Buffer.from(sign(payload, secret), "hex");
  const provided = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, provided) ? ids : [];
}

/** Keep the cookie well under the browser's typical 4 KiB per-cookie limit. */
export function createPollHistoryCookie(
  history: string[],
  secret: string,
): string {
  const ids = Array.from(new Set(history))
    .filter((id) => FINGERPRINT_PATTERN.test(id))
    .slice(-POLL_MAX_TRACKED);
  // createPollHistoryCookie is only used after accepting a successful vote.
  const payload = `v1.${ids.join(".")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function getPollCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const entry of cookie.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === POLL_COOKIE_NAME) {
      return entry.slice(separator + 1).trim();
    }
  }
  return null;
}
