import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Poll } from "./Poll";

vi.mock("mino-ui/blocks/PollBlock", () => ({
  PollBlock: ({
    options,
    initiallyVoted,
    checkingVoteStatus,
    voteStatusError,
    onVote,
  }: {
    options: Array<{ id: string; label: string; votes?: number }>;
    initiallyVoted: boolean;
    checkingVoteStatus: boolean;
    voteStatusError: boolean;
    onVote: (id: string) => Promise<unknown>;
  }) => (
    <div>
      {checkingVoteStatus && <span>Checking</span>}
      {voteStatusError && <span>Unavailable</span>}
      {initiallyVoted ? <span>Already voted</span> : null}
      <span>
        Yes votes: {options.find((option) => option.id === "yes")?.votes}
      </span>
      <button
        disabled={checkingVoteStatus || voteStatusError || initiallyVoted}
        onClick={() => void onVote("yes")}
      >
        Vote yes
      </button>
    </div>
  ),
}));

const props = {
  pollKey: "helpful",
  siteId: "site-123",
  locale: "en-us",
  options: [
    { id: "yes", label: "Yes", votes: 0 },
    { id: "no", label: "No", votes: 0 },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("Proti Poll hydration", () => {
  it("does not reveal voting buttons before verifying the existing cookie", async () => {
    let finish!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Poll {...props} />);
    expect(screen.getByText("Checking")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Vote yes" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    finish({
      ok: true,
      json: async () => ({ votes: { yes: 7, no: 3 }, alreadyVoted: true }),
    });
    await waitFor(() => expect(screen.getByText("Already voted")).toBeTruthy());
    expect(screen.getByText("Yes votes: 7")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/poll\/vote\?/),
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("keeps the vote buttons available when no cookie exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ votes: {}, alreadyVoted: false }),
      }),
    );
    render(<Poll {...props} />);
    await waitFor(() => expect(screen.queryByText("Checking")).toBeNull());
    expect(
      (screen.getByRole("button", { name: "Vote yes" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("blocks voting when the status endpoint is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    render(<Poll {...props} />);
    await waitFor(() => expect(screen.getByText("Unavailable")).toBeTruthy());
    expect(
      (screen.getByRole("button", { name: "Vote yes" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
