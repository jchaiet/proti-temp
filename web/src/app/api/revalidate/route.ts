import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

import { resolveRevalidationPlan } from "@/cms/revalidation/dependencies";
import type { SanityRevalidationPayload } from "@/cms/revalidation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      {
        revalidated: false,
        message: "SANITY_REVALIDATE_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  let payload: SanityRevalidationPayload | null = null;
  let isValidSignature = false;

  try {
    const parsed = await parseBody<SanityRevalidationPayload>(
      request,
      secret,
      false,
    );

    payload = parsed.body;
    isValidSignature = parsed.isValidSignature === true;
  } catch {
    return NextResponse.json(
      {
        revalidated: false,
        message: "Invalid webhook payload.",
      },
      { status: 400 },
    );
  }

  if (!isValidSignature) {
    return NextResponse.json(
      {
        revalidated: false,
        message: "Invalid webhook signature.",
      },
      { status: 401 },
    );
  }

  if (!payload) {
    return NextResponse.json(
      {
        revalidated: false,
        message: "Webhook payload is empty.",
      },
      { status: 400 },
    );
  }

  const plan = await resolveRevalidationPlan(payload);

  if (!plan) {
    return NextResponse.json(
      {
        revalidated: false,
        message: "The webhook payload did not contain a supported document.",
      },
      { status: 400 },
    );
  }

  for (const path of plan.paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    revalidated: true,
    documentId: plan.documentId,
    documentType: plan.documentType,
    count: plan.paths.length,
    paths: plan.paths,
    idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
  });
}
