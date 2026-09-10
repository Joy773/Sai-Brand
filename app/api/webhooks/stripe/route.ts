import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createOrderFromCheckoutSession } from "@/app/lib/stripeOrders";
import getStripe from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { ok: false, error: "Webhook secret is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] Signature verification failed", error);
    return NextResponse.json(
      { ok: false, error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid" || session.status === "complete") {
        await createOrderFromCheckoutSession(stripe, session);
      }
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] Failed to process event", error);
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
