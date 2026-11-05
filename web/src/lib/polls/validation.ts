const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const OPTION_ID = /^[A-Za-z0-9_]{1,128}$/;

export type PollVote = {
  siteId: string;
  locale: string;
  pollKey: string;
  optionId: string;
};

export function parsePollVote(body: unknown): PollVote | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const allowed = ["siteId", "locale", "pollKey", "optionId"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (
    ![value.siteId, value.locale, value.pollKey].every(
      (part) => typeof part === "string" && ID.test(part),
    )
  )
    return null;
  if (typeof value.optionId !== "string" || !OPTION_ID.test(value.optionId))
    return null;
  return value as PollVote;
}

export async function readPollVoteBody(
  request: Request,
  maxBytes = 2048,
): Promise<{ status: "ok"; value: unknown } | { status: "invalid" | "large" }> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    return { status: "large" };
  }
  const reader = request.body?.getReader();
  if (!reader) return { status: "invalid" };
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { status: "large" };
      }
      chunks.push(value);
    }
    return {
      status: "ok",
      value: JSON.parse(
        Buffer.concat(chunks, size).toString("utf8"),
      ) as unknown,
    };
  } catch {
    return { status: "invalid" };
  }
}

export function pollOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = process.env.POLL_ALLOWED_ORIGINS?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === "production" && !allowed?.length) return false;
  return (allowed?.length ? allowed : [new URL(request.url).origin]).includes(
    origin,
  );
}
