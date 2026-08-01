import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/app/auth";
import { connectDB } from "@/app/lib/mongodb";
import { getClientIp, rateLimit } from "@/app/lib/rateLimit";
import Review from "@/app/models/Review";

type CreateReviewPayload = {
  name?: string;
  email?: string;
  productName?: string;
  comment?: string;
  rating?: number;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function serializeReview(review: {
  _id: { toString(): string };
  name: string;
  email: string;
  productName: string;
  comment: string;
  rating: number;
  createdAt?: Date;
}) {
  return {
    id: String(review._id),
    name: review.name,
    email: review.email,
    productName: review.productName,
    comment: review.comment,
    rating: review.rating,
    createdAt: review.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const productName = request.nextUrl.searchParams.get("productName")?.trim() ?? "";

  try {
    await connectDB();

    const reviews = await Review.find(productName ? { productName } : {})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      reviews: reviews.map((review) => serializeReview(review)),
    });
  } catch (error) {
    console.error("[reviews api] Failed to load reviews", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load reviews. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`reviews:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: CreateReviewPayload;

  try {
    body = (await request.json()) as CreateReviewPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const session = await auth();
  const name =
    body.name?.trim() || session?.user?.name?.trim() || "";
  const email =
    body.email?.trim().toLowerCase() ||
    session?.user?.email?.trim().toLowerCase() ||
    "";
  const comment = body.comment?.trim() ?? "";
  const productName = body.productName?.trim() ?? "";
  const rating = Number(body.rating);

  if (!comment) {
    return NextResponse.json(
      { ok: false, error: "Comment is required." },
      { status: 400 },
    );
  }

  if (!productName) {
    return NextResponse.json(
      { ok: false, error: "Product name is required." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { ok: false, error: "Rating must be an integer between 1 and 5." },
      { status: 400 },
    );
  }

  if (!name || !email) {
    return NextResponse.json(
      {
        ok: false,
        error: "Name and email are required. Please sign in to submit a review.",
      },
      { status: 401 },
    );
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email address." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const review = await Review.create({
      name,
      email,
      productName,
      comment,
      rating,
    });

    return NextResponse.json(
      {
        ok: true,
        review: serializeReview(review),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[reviews api] Failed to create review", error);

    return NextResponse.json(
      { ok: false, error: "Failed to save review. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let reviewId = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!reviewId) {
    try {
      const body = (await request.json()) as { id?: string };
      reviewId = body.id?.trim() ?? "";
    } catch {
      reviewId = "";
    }
  }

  if (!reviewId) {
    return NextResponse.json(
      { ok: false, error: "Review id is required." },
      { status: 400 },
    );
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid review id." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const deletedReview = await Review.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return NextResponse.json(
        { ok: false, error: "Review not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reviews api] Failed to delete review", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete review. Please try again." },
      { status: 500 },
    );
  }
}
