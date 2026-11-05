import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PATHNAME_HEADER = "x-proti-pathname";

/**
 * Pass the public request pathname upstream so the root layout can resolve
 * the correct Site locale for the initial <html lang> attribute.
 *
 * This intentionally performs no CMS work. Site resolution stays inside the
 * React render tree, where it can be request-memoized with the Page and
 * generateMetadata calls that already need the same Site document.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname || "/");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
