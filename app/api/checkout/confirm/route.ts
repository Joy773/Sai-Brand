import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  createOrderFromCheckoutSession,
} from "@/app/lib/stripeOrders";
import getStripe from "@/app/lib/stripe";

export const runtime = "nodejs";

type ConfirmPayload = {
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: ConfirmPayload;

  try {
    body = (await request.json()) as ConfirmPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const sessionId = body.sessionId?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "Stripe session ID is required." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionEmail =
      checkoutSession.metadata?.userEmail?.trim().toLowerCase() ||
      checkoutSession.customer_email?.trim().toLowerCase() ||
      "";
    const userEmail = session.user.email?.trim().toLowerCase() || "";
    const sessionUserId = checkoutSession.metadata?.userId?.trim() || "";
    const isOwner =
      (userEmail && sessionEmail && userEmail === sessionEmail) ||
      (Boolean(session.user.id) &&
        Boolean(sessionUserId) &&
        session.user.id === sessionUserId);

    if (!isOwner) {
      return NextResponse.json(
        { ok: false, error: "This checkout session does not belong to you." },
        { status: 403 },
      );
    }

    if (
      checkoutSession.payment_status !== "paid" &&
      checkoutSession.status !== "complete"
    ) {
      return NextResponse.json(
        { ok: false, error: "Stripe payment is not completed yet." },
        { status: 402 },
      );
    }

    const result = await createOrderFromCheckoutSession(stripe, checkoutSession);

    return NextResponse.json({
      ok: true,
      created: result.created,
      dbOrderId: String(result.order._id),
      sessionId,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[checkout confirm] Failed to fulfill Stripe session", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to confirm Stripe payment. Please contact support.",
      },
      { status: 500 },
    );
  }
}
