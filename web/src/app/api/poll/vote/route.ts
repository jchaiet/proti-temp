import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  parsePollVote,
  pollOriginAllowed,
  readPollVoteBody,
} from "@/lib/polls/validation";
import {
  createPollHistoryCookie,
  getPollCookie,
  POLL_COOKIE_MAX_AGE,
  POLL_COOKIE_NAME,
  pollFingerprint,
  pollVisitorSecret,
  readPollHistory,
} from "@/lib/polls/visitor";
import { sanityClient } from "@/sanity/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Vote = NonNullable<ReturnType<typeof parsePollVote>>;
type Votes = Record<string, number>;

interface PollResult {
  _type: "pollResult";
  votes?: Votes;
}

// Only options on a published Page/Blog are eligible for querying or voting.
const VALID_POLL_QUERY = `
  count(*[
    _type in ["page", "blog"] &&
    site._ref == $siteId &&
    locale == $locale &&
    count(sections[
      _type == "pollBlock" &&
      coalesce(pollKey.current, _key) == $pollKey &&
      $optionId in options[].id
    ]) > 0
  ]) > 0
`;

function resultId(siteId: string, locale: string, pollKey: string): string {
  return `pollResult.${createHash("sha256")
    .update(`${siteId}:${locale}:${pollKey}`)
    .digest("hex")
    .slice(0, 40)}`;
}

function reply(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function success(votes: Votes, alreadyVoted: boolean): NextResponse {
  return NextResponse.json(
    { votes, alreadyVoted },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function config() {
  const secret = pollVisitorSecret();
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  return secret && token ? { secret, token } : null;
}

// Read using the same authenticated Sanity dataset as writes, never the CDN.
// The published perspective still excludes draft Page/Blog documents.
function client(token: string) {
  return sanityClient.withConfig({
    token,
    perspective: "published",
    useCdn: false,
  });
}

async function pollExists(
  readClient: ReturnType<typeof client>,
  vote: Vote,
): Promise<boolean> {
  return readClient.fetch<boolean>(VALID_POLL_QUERY, vote);
}

async function getVotes(
  readClient: ReturnType<typeof client>,
  documentId: string,
): Promise<Votes | null> {
  // Direct document reads avoid GROQ indexing lag after mutations.
  const result = await readClient.getDocument<PollResult>(documentId);
  if (!result) return null;
  if (
    !result.votes ||
    typeof result.votes !== "object" ||
    Array.isArray(result.votes)
  ) {
    throw new Error("Poll result has no valid votes object");
  }
  // Do not disguise missing or corrupt vote data as zero totals.
  if (
    Object.values(result.votes).some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new Error("Poll result contains invalid vote totals");
  }
  return result.votes;
}

/** Cookie-aware read-only status check on page load; never increments votes. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const vote = parsePollVote({
    siteId: params.get("siteId"),
    locale: params.get("locale"),
    pollKey: params.get("pollKey"),
    optionId: params.get("optionId"),
  });
  if (!vote) return reply("Invalid poll status query.", 400);

  const settings = config();
  if (!settings) return reply("Poll voting is not configured.", 503);

  const history = readPollHistory(getPollCookie(request), settings.secret);
  const alreadyVoted = history.includes(
    pollFingerprint(vote.siteId, vote.locale, vote.pollKey),
  );
  const readClient = client(settings.token);

  try {
    if (!(await pollExists(readClient, vote)))
      return reply("Poll or option not found.", 404);
    const votes = await getVotes(
      readClient,
      resultId(vote.siteId, vote.locale, vote.pollKey),
    );
    // If a signed cookie exists but the result is missing/empty, do not claim
    // that the poll received zero votes. Surface a real error instead.
    if (alreadyVoted && (!votes || Object.keys(votes).length === 0)) {
      return reply("Poll results are temporarily unavailable.", 503);
    }
    return success(votes ?? {}, alreadyVoted);
  } catch {
    return reply("Poll results are temporarily unavailable.", 503);
  }
}

/** Mutates totals only for a browser without this poll in its signed cookie. */
export async function POST(request: Request) {
  if (!pollOriginAllowed(request))
    return reply("Voting origin is not allowed.", 403);
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return reply("Expected JSON.", 415);
  }

  const parsed = await readPollVoteBody(request);
  if (parsed.status !== "ok") {
    return parsed.status === "large"
      ? reply("Vote request is too large.", 413)
      : reply("Invalid request body.", 400);
  }
  const vote = parsePollVote(parsed.value);
  if (!vote) return reply("Invalid poll vote data.", 400);

  const settings = config();
  if (!settings) return reply("Poll voting is not configured.", 503);

  const history = readPollHistory(getPollCookie(request), settings.secret);
  const fingerprint = pollFingerprint(vote.siteId, vote.locale, vote.pollKey);
  const readClient = client(settings.token);

  try {
    if (!(await pollExists(readClient, vote)))
      return reply("Poll or option not found.", 404);
  } catch {
    return reply("Poll voting is temporarily unavailable.", 503);
  }

  const documentId = resultId(vote.siteId, vote.locale, vote.pollKey);
  try {
    if (history.includes(fingerprint)) {
      const votes = await getVotes(readClient, documentId);
      if (!votes || Object.keys(votes).length === 0) {
        return reply("Poll results are temporarily unavailable.", 503);
      }
      return success(votes, true);
    }

    await readClient.createIfNotExists({
      _id: documentId,
      _type: "pollResult",
      pollKey: vote.pollKey,
      siteId: vote.siteId,
      locale: vote.locale,
      votes: {},
    });

    // JSONMatch bracket notation supports numeric option IDs too.
    const votePath = `votes['${vote.optionId}']`;
    const result = (await readClient
      .patch(documentId)
      .setIfMissing({ [votePath]: 0 })
      .inc({ [votePath]: 1 })
      .commit({ returnDocuments: true })) as PollResult;

    // Never issue a voted cookie if Sanity doesn't confirm the new count.
    const votes = result.votes;
    if (
      !votes ||
      !Number.isSafeInteger(votes[vote.optionId]) ||
      votes[vote.optionId] < 1
    ) {
      return reply("Poll voting is temporarily unavailable.", 503);
    }

    const response = success(votes, false);
    response.cookies.set(
      POLL_COOKIE_NAME,
      createPollHistoryCookie([...history, fingerprint], settings.secret),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: POLL_COOKIE_MAX_AGE,
      },
    );
    return response;
  } catch {
    // A mutation can complete before a network timeout. Cookie-only dedupe
    // cannot guarantee exact-once voting in that situation.
    return reply("Poll voting is temporarily unavailable.", 503);
  }
}
