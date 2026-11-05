"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ErrorState";

export default function RouteError({
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
     * Replace this with your production error-reporting
     * service when monitoring is added to the starter.
     */
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      code="500"
      title="Something went wrong"
      message="We couldn’t load this page. You can try again, or return to the homepage."
      onRetry={retry}
      retryLabel="Try again"
      homeHref="/"
      homeLabel="Return home"
      reference={error.digest}
    />
  );
}
