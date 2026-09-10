"use client";

import { useEffect, useState } from "react";
import { LuStar, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";

type AdminReview = {
  id: string;
  name: string;
  email: string;
  productName: string;
  comment: string;
  rating: number;
  createdAt: string;
};

type ReviewsApiResponse = {
  ok?: boolean;
  reviews?: Array<{
    id: string;
    name: string;
    email?: string;
    productName: string;
    comment: string;
    rating: number;
    createdAt?: string;
  }>;
  error?: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <LuStar
          key={value}
          className={`h-3.5 w-3.5 ${
            value <= rating
              ? "fill-gold text-gold"
              : "fill-transparent text-dark-green/25"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/reviews");
        const data = (await response.json()) as ReviewsApiResponse;

        if (!response.ok || !data.ok || !data.reviews) {
          throw new Error(data.error ?? "Failed to load reviews.");
        }

        setReviews(
          data.reviews.map((review) => ({
            id: review.id,
            name: review.name,
            email: review.email ?? "",
            productName: review.productName,
            comment: review.comment,
            rating: review.rating,
            createdAt: formatDate(review.createdAt),
          })),
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load reviews.";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadReviews();
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(reviewId);

    try {
      const response = await fetch(
        `/api/reviews?id=${encodeURIComponent(reviewId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete review.");
      }

      setReviews((current) =>
        current.filter((review) => review.id !== reviewId),
      );
      toast.success("Review deleted.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete review.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">Reviews</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-green/70 sm:mt-3 sm:text-base">
        View all customer product reviews.
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        {isLoading ? (
          <p className="px-6 py-10 text-sm text-dark-green/70">
            Loading reviews…
          </p>
        ) : error ? (
          <p className="px-6 py-10 text-sm text-red-600">{error}</p>
        ) : reviews.length === 0 ? (
          <p className="px-6 py-10 text-sm text-dark-green/70">
            No reviews yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-beige bg-beige/40 text-dark-green/70">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">Product</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Customer</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Rating</th>
                  <th className="min-w-[16rem] px-4 py-3 font-semibold sm:px-6">
                    Comment
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Date</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-beige/70 bg-warm-white/60 last:border-b-0"
                  >
                    <td className="px-4 py-4 align-top font-medium text-dark-green sm:px-6">
                      {review.productName}
                    </td>
                    <td className="px-4 py-4 align-top sm:px-6">
                      <p className="font-medium text-dark-green">{review.name}</p>
                      <p className="mt-0.5 text-xs text-dark-green/60">
                        {review.email}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top sm:px-6">
                      <RatingStars rating={review.rating} />
                      <p className="mt-1 text-xs text-dark-green/60">
                        {review.rating}/5
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-dark-green/80 sm:px-6">
                      {review.comment}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-dark-green/70 sm:px-6">
                      {review.createdAt}
                    </td>
                    <td className="px-4 py-4 align-top sm:px-6">
                      <button
                        type="button"
                        onClick={() => void handleDeleteReview(review.id)}
                        disabled={deletingId === review.id}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        aria-label={`Delete review by ${review.name}`}
                      >
                        <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
                        {deletingId === review.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
