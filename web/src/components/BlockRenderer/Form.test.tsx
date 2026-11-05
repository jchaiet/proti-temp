import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import { Form } from "./Form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/cms/resolvers/icon", () => ({ resolveIcon: () => undefined }));
vi.mock("mino-ui/blocks/FormBlock", () => ({
  FormBlock: ({
    onSubmit,
    isSubmitted,
    successTitle,
    successMessage,
    submissionError,
  }: {
    onSubmit: (
      values: Record<string, string>,
      event: FormEvent<HTMLFormElement>,
    ) => Promise<void>;
    isSubmitted?: boolean;
    successTitle?: ReactNode;
    successMessage?: ReactNode;
    submissionError?: ReactNode;
  }) =>
    isSubmitted ? (
      <section role="status">
        <h3>{successTitle}</h3>
        <p>{successMessage}</p>
      </section>
    ) : (
      <>
        {submissionError && <p role="alert">{submissionError}</p>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit({}, event);
          }}
        >
          <input name="email" defaultValue="test@example.com" />
          <button type="submit">Submit</button>
        </form>
      </>
    ),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  replace.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const props = {
  formKey: "contact",
  blockKey: "block-1",
  siteId: "site-1",
  locale: "en-us",
};

function submit() {
  fireEvent.submit(
    screen.getByRole("button", { name: "Submit" }).closest("form")!,
  );
}

describe("CMS Form renderer", () => {
  it("submits the CMS context and hides the form after success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<Form {...props} />);

    const trap = container.querySelector<HTMLInputElement>(
      "input[data-proti-honeypot]",
    );
    expect(trap).not.toBeNull();
    expect(trap?.type).toBe("text");
    expect(trap?.tabIndex).toBe(-1);
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();

    submit();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Thank you!"),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "We've received your submission.",
    );
    expect(
      screen.queryByRole("button", { name: "Submit" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      ...props,
      fields: { email: "test@example.com" },
      honeypot: "",
    });
  });

  it("uses the CMS-authored confirmation when provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(
      <Form
        {...props}
        successTitle="Message received"
        successMessage="We'll reply shortly."
      />,
    );
    submit();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Message received" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "We'll reply shortly.",
    );
  });

  it("navigates to a safe internal thank-you page after a successful submission", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(
      <Form
        {...props}
        completionAction="redirect"
        successRedirectPath="/thank-you"
      />,
    );
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/thank-you"));
    expect(
      screen.queryByRole("button", { name: "Submit" }),
    ).not.toBeInTheDocument();
  });

  it("refuses external redirect destinations and shows confirmation instead", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(
      <Form
        {...props}
        completionAction="redirect"
        successRedirectPath="//evil.example"
      />,
    );
    submit();
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a filled honeypot to the server without exposing it as a CMS field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<Form {...props} />);
    const trap = container.querySelector<HTMLInputElement>(
      "input[data-proti-honeypot]",
    );
    fireEvent.change(trap!, { target: { value: "spam.example" } });
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.honeypot).toBe("spam.example");
    expect(body.fields).toEqual({ email: "test@example.com" });
  });

  it("announces errors and keeps the form available to retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    vi.stubGlobal("fetch", fetchMock);
    render(<Form {...props} />);
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn't submit"),
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce({ ok: true });
    submit();
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate in-flight requests", async () => {
    let resolveRequest!: (value: { ok: boolean }) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Form {...props} />);
    submit();
    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest({ ok: true });
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });
});
