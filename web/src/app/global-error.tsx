"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & {
    digest?: string;
  };

  retry: () => void;
}) {
  useEffect(() => {
    /*
     * This boundary catches errors from the root layout
     * itself. Forward this to your monitoring provider
     * once one is configured.
     */
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong</title>
      </head>

      <body
        style={{
          margin: 0,
          minWidth: 0,
        }}
      >
        <ErrorState
          code="500"
          title="Something went wrong"
          message="The site encountered an unexpected error. Please try again."
          onRetry={retry}
          retryLabel="Try again"
          homeHref="/"
          homeLabel="Return home"
          reference={error.digest}
        />
      </body>
    </html>
  );
}
