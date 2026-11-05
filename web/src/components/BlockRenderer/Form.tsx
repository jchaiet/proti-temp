"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormBlock, type FormBlockProps } from "mino-ui/blocks/FormBlock";
import type { CmsIcon } from "@/cms/types";
import { resolveIcon } from "@/cms/resolvers/icon";

export interface FormRendererProps extends Omit<FormBlockProps, "onSubmit"> {
  formKey: string;
  blockKey: string;
  siteId: string;
  locale: string;
  submitButtonIconName?: CmsIcon;
  completionAction?: "message" | "redirect";
  successRedirectPath?: string;
}

// Not a CMS-authored field: it is a simple spam trap and is never forwarded.
const HONEYPOT_FIELD = "__proti_company_website";

/** Internal redirects only: never trust authorable content as an arbitrary URL. */
function getSafeRedirectPath(value?: string): string | null {
  const path = value?.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  if (/[\\\x00-\x1f\x7f]/.test(path)) return null;
  return path;
}

export function Form({
  formKey,
  blockKey,
  siteId,
  locale,
  submitButtonIconName,
  submitButtonProps,
  completionAction = "message",
  successRedirectPath,
  successTitle,
  successMessage,
  ...props
}: FormRendererProps) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionInFlight = useRef(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mino's FormBlock owns the <form> markup and has no extra-field slot.
    // Attach a visually-hidden *text* input after hydration without changing
    // the library or CMS schema. The field is excluded from accessible focus.
    const form = formContainerRef.current?.querySelector("form");
    if (!form) return;

    const trap = document.createElement("div");
    trap.setAttribute("aria-hidden", "true");
    trap.style.cssText =
      "position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";

    const label = document.createElement("label");
    label.textContent = "Company website";
    const input = document.createElement("input");
    input.type = "text";
    input.name = HONEYPOT_FIELD;
    input.autocomplete = "off";
    input.tabIndex = -1;
    input.setAttribute("data-proti-honeypot", "");
    label.appendChild(input);
    trap.appendChild(label);
    form.appendChild(trap);

    return () => trap.remove();
  }, []);
  const icon = resolveIcon(submitButtonIconName);
  const normalizedLocale = locale.toLowerCase();
  const isSpanish =
    normalizedLocale.startsWith("es") || normalizedLocale.endsWith("-es");
  const fallbackTitle = isSpanish ? "¡Gracias!" : "Thank you!";
  const fallbackMessage = isSpanish
    ? "Hemos recibido tu formulario correctamente."
    : "We've received your submission.";
  const confirmationTitle =
    typeof successTitle === "string"
      ? successTitle.trim() || fallbackTitle
      : (successTitle ?? fallbackTitle);
  const confirmationMessage =
    typeof successMessage === "string"
      ? successMessage.trim() || fallbackMessage
      : (successMessage ?? fallbackMessage);

  const handleSubmit: NonNullable<FormBlockProps["onSubmit"]> = async (
    _values,
    event,
  ) => {
    // Mino's flattened values omit repeated FormData keys (multi-select).
    void _values;
    if (submissionInFlight.current || submitted) return;
    submissionInFlight.current = true;
    setError(null);

    // Collect synchronously while React still exposes event.currentTarget.
    // FormData preserves multi-select values that FormBlock's flat object loses.
    const data = new FormData(event.currentTarget);
    const honeypotValue = data.get(HONEYPOT_FIELD);
    const honeypot = typeof honeypotValue === "string" ? honeypotValue : "";
    const fields: Record<string, string | string[]> = Object.create(null);
    for (const [name, entry] of data.entries()) {
      if (name === HONEYPOT_FIELD) continue;
      if (entry instanceof File) {
        if (entry.size === 0) continue;
        setError(
          isSpanish
            ? "Este formulario aún no admite archivos adjuntos."
            : "This form does not support file attachments yet.",
        );
        submissionInFlight.current = false;
        return;
      }
      const current = fields[name];
      if (current === undefined) fields[name] = entry;
      else if (Array.isArray(current)) current.push(entry);
      else fields[name] = [current, entry];
    }

    try {
      const response = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formKey,
          blockKey,
          siteId,
          locale,
          fields,
          honeypot,
        }),
      });
      if (!response.ok) {
        throw new Error(`Submission rejected (${response.status})`);
      }
      // Remove the form immediately to prevent another submission in this view.
      setSubmitted(true);
      if (completionAction === "redirect") {
        const redirectPath = getSafeRedirectPath(successRedirectPath);
        if (redirectPath) router.replace(redirectPath);
        // Invalid/empty configured paths safely fall back to confirmation.
      }
    } catch {
      // Don't display server implementation details or record visitor values.
      setError(
        isSpanish
          ? "No pudimos enviar el formulario. Inténtalo de nuevo."
          : "We couldn't submit your form. Please try again.",
      );
      submissionInFlight.current = false;
    }
  };

  return (
    <div ref={formContainerRef}>
      <FormBlock
        {...props}
        isSubmitted={submitted}
        successTitle={confirmationTitle}
        successMessage={confirmationMessage}
        submissionError={error}
        submitButtonProps={{
          ...submitButtonProps,
          ...(icon ? { icon } : {}),
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
