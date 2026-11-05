/**
 * Allow explicit, exact origins and this Vercel project's deployment domains.
 * Never trust Host / X-Forwarded-Host as an allowlist source.
 */
function vercelOrigin(hostname: string | undefined): string | null {
  if (
    !hostname ||
    hostname.length > 253 ||
    !hostname.includes(".") ||
    hostname.includes("..") ||
    !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(hostname)
  ) {
    return null;
  }

  return `https://${hostname.toLowerCase()}`;
}

function isCanonicalOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === origin;
  } catch {
    return false;
  }
}

/** Requires a browser Origin header, even for a first-party POST. */
export function formOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || !isCanonicalOrigin(origin)) return false;

  const allowed = new Set(
    (process.env.FORM_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(isCanonicalOrigin),
  );

  // These hostnames are injected by the deployment platform, not supplied by
  // the caller. Preview deployment URLs change on every deployment.
  if (process.env.VERCEL === "1") {
    for (const hostname of [
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      ...(process.env.VERCEL_ENV === "production"
        ? [process.env.VERCEL_PROJECT_PRODUCTION_URL]
        : []),
    ]) {
      const platformOrigin = vercelOrigin(hostname);
      if (platformOrigin) allowed.add(platformOrigin);
    }
  }

  // Fail closed on production when neither an explicit origin nor a trusted
  // Vercel deployment URL is configured. Local development keeps working.
  if (allowed.size === 0 && process.env.NODE_ENV !== "production") {
    allowed.add(new URL(request.url).origin);
  }

  return allowed.has(origin);
}
