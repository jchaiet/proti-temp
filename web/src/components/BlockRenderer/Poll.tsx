"use client";

import { useEffect, useState } from "react";

import { PollBlock } from "mino-ui/blocks/PollBlock";
import type { PollOption } from "mino-ui/blocks/PollBlock";
import type { MappedPollBlockProps } from "@/cms/mappers/blocks";

interface VoteResponse {
  votes: Record<string, number>;
  alreadyVoted: boolean;
}

type VoteStatus =
  | { state: "checking" }
  | { state: "error" }
  | { state: "ready"; result: VoteResponse };

export function Poll({
  pollKey,
  siteId,
  locale,
  options,
  ...props
}: MappedPollBlockProps) {
  const firstOptionId = options[0]?.id;
  const pollIdentity = JSON.stringify([siteId, locale, pollKey, firstOptionId]);
  const [storedStatus, setStoredStatus] = useState<
    VoteStatus & { identity: string }
  >({
    identity: pollIdentity,
    state: "checking",
  });
  // Derive checking state when a component instance is reused for another poll.
  const status: VoteStatus =
    storedStatus.identity === pollIdentity
      ? storedStatus
      : { state: "checking" };

  useEffect(() => {
    const controller = new AbortController();
    if (!firstOptionId) return;

    const params = new URLSearchParams({
      pollKey,
      siteId,
      locale,
      optionId: firstOptionId,
    });

    async function restoreVote() {
      try {
        const response = await fetch(`/api/poll/vote?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Poll status failed: ${response.status}`);
        const result = (await response.json()) as VoteResponse;
        if (!controller.signal.aborted)
          setStoredStatus({ identity: pollIdentity, state: "ready", result });
      } catch {
        if (!controller.signal.aborted)
          setStoredStatus({ identity: pollIdentity, state: "error" });
      }
    }

    void restoreVote();
    return () => controller.abort();
  }, [siteId, locale, pollKey, firstOptionId, pollIdentity]);

  const handleVote = async (optionId: string): Promise<PollOption[]> => {
    const response = await fetch("/api/poll/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ pollKey, siteId, locale, optionId }),
    });
    if (!response.ok) throw new Error(`Poll vote failed: ${response.status}`);

    const data = (await response.json()) as VoteResponse;
    return options.map((option) => ({
      ...option,
      votes: data.votes?.[option.id] ?? 0,
    }));
  };

  const votes = status.state === "ready" ? status.result.votes : {};
  const displayOptions = options.map((option) => ({
    ...option,
    votes: votes[option.id] ?? 0,
  }));

  return (
    <PollBlock
      {...props}
      options={displayOptions}
      onVote={handleVote}
      initiallyVoted={status.state === "ready" && status.result.alreadyVoted}
      checkingVoteStatus={status.state === "checking"}
      voteStatusError={status.state === "error"}
    />
  );
}
