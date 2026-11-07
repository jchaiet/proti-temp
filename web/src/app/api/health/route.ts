// Server readiness only. The smoke tests verify CMS-backed page rendering.
// This endpoint does not expose application or environment configuration.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
