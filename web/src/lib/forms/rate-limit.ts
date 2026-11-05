import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 5;

// Atomic counter + expiry, shared across Next.js instances and regions.
const INCREMENT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return count
`;

export type RateLimitResult = "allowed" | "limited" | "unavailable";

/**
 * IP headers are spoofable unless the ingress proxy strips or overwrites them.
 * Production fails closed until the operator explicitly confirms that contract.
 */
export function getFormRateLimitClientIp(request: Request): string | null {
  if (process.env.FORM_TRUST_PROXY_HEADERS !== "true") {
    return process.env.NODE_ENV === "production" ? null : "local-development";
  }

  const header =
    process.env.FORM_CLIENT_IP_HEADER === "x-real-ip"
      ? "x-real-ip"
      : "x-forwarded-for";
  const raw = request.headers.get(header);
  if (!raw) return null;

  // Only trust the first address after verifying the proxy's overwrite policy.
  const clientIp = raw.split(",")[0]?.trim();
  return clientIp && isIP(clientIp) ? clientIp : null;
}

export async function checkFormRateLimit(
  request: Request,
  scope: string,
): Promise<RateLimitResult> {
  const url = process.env.FORM_UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.FORM_UPSTASH_REDIS_REST_TOKEN?.trim();
  const salt = process.env.FORM_RATE_LIMIT_SALT?.trim();

  // Local development may run without Redis; deployed forms fail closed.
  if (!url || !token || !salt) {
    return process.env.NODE_ENV === "production" ? "unavailable" : "allowed";
  }
  if (process.env.NODE_ENV === "production" && salt.length < 32) {
    return "unavailable";
  }

  // API credentials must not travel over plaintext outside local development.
  try {
    const endpoint = new URL(url);
    if (
      endpoint.username ||
      endpoint.password ||
      (endpoint.protocol !== "https:" &&
        !(
          process.env.NODE_ENV !== "production" &&
          endpoint.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(endpoint.hostname)
        ))
    )
      return "unavailable";
  } catch {
    return "unavailable";
  }

  const clientIp = getFormRateLimitClientIp(request);
  if (!clientIp) return "unavailable";
  const key =
    "proti:form:" +
    createHash("sha256").update(`${salt}:${clientIp}:${scope}`).digest("hex");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        INCREMENT_SCRIPT,
        "1",
        key,
        String(WINDOW_SECONDS),
      ]),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return "unavailable";
    const result = (await response.json()) as {
      result?: unknown;
      error?: unknown;
    };
    if (result.error || typeof result.result !== "number") return "unavailable";
    return result.result > MAX_REQUESTS ? "limited" : "allowed";
  } catch {
    return "unavailable";
  }
}
