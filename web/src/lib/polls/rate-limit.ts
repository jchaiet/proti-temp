import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

const RATE_WINDOW_SECONDS = 10 * 60;
const RATE_MAX = 25;
// Limits how long a signed anonymous visitor can re-submit the same poll.
const VOTE_DEDUPE_SECONDS = 30 * 24 * 60 * 60;
const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

export type PollGateStatus =
  | "allowed"
  | "limited"
  | "duplicate"
  | "unavailable";

type PollRedis = { url: string; token: string; salt: string };

function getRedisConfig(): PollRedis | null {
  const url = process.env.POLL_UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.POLL_UPSTASH_REDIS_REST_TOKEN?.trim();
  const salt = process.env.POLL_RATE_LIMIT_SALT?.trim();
  if (!url || !token || !salt || salt.length < 32) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return null;
  } catch {
    return null;
  }
  return { url, token, salt };
}

function hash(config: PollRedis, input: string): string {
  return createHash("sha256").update(`${config.salt}:${input}`).digest("hex");
}

async function redis(config: PollRedis, command: unknown[]): Promise<unknown> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error("Poll Redis unavailable");
  const result = (await response.json()) as {
    result?: unknown;
    error?: unknown;
  };
  if (result.error || !("result" in result))
    throw new Error("Poll Redis error");
  return result.result;
}

function getClientIp(request: Request): string | null {
  // Enable ONLY behind a reverse proxy which overwrites these headers.
  if (process.env.POLL_TRUST_PROXY_HEADERS !== "true") return null;
  const forwarded =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded && isIP(forwarded) ? forwarded : null;
}

export async function checkPollRateLimit(
  request: Request,
): Promise<PollGateStatus> {
  // Keep local development usable without provisioning Redis. A partially
  // configured Redis setup, an untrusted proxy or any Redis outage must still
  // fail closed. Production always requires a valid configuration.
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.POLL_UPSTASH_REDIS_REST_URL?.trim() &&
    !process.env.POLL_UPSTASH_REDIS_REST_TOKEN?.trim() &&
    !process.env.POLL_RATE_LIMIT_SALT?.trim()
  ) {
    return "allowed";
  }

  const config = getRedisConfig();
  const ip = getClientIp(request);
  if (!config || !ip) return "unavailable";
  const key = `proti:poll:rate:${hash(config, ip)}`;
  try {
    const count = await redis(config, [
      "EVAL",
      RATE_SCRIPT,
      "1",
      key,
      String(RATE_WINDOW_SECONDS),
    ]);
    if (typeof count !== "number") return "unavailable";
    return count > RATE_MAX ? "limited" : "allowed";
  } catch {
    return "unavailable";
  }
}

export async function reservePollVote(
  visitorId: string,
  siteId: string,
  locale: string,
  pollKey: string,
): Promise<PollGateStatus> {
  const config = getRedisConfig();
  if (!config) return "unavailable";
  const key = `proti:poll:once:${hash(config, `${visitorId}:${siteId}:${locale}:${pollKey}`)}`;
  try {
    const result = await redis(config, [
      "SET",
      key,
      "1",
      "NX",
      "EX",
      String(VOTE_DEDUPE_SECONDS),
    ]);
    if (result === "OK") return "allowed";
    if (result === null) return "duplicate";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
