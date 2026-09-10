"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LuArrowUpDown,
  LuEllipsisVertical,
  LuFilter,
  LuStar,
  LuThumbsUp,
} from "react-icons/lu";
import { toast } from "sonner";
import RatingModal from "@/app/components/rating";

type ProductReview = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  createdAt?: string;
};

type StarFilter = "all" | 1 | 2 | 3 | 4 | 5;
type SortOption = "relevance" | "highest" | "lowest";

function StarRow({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((value) => (
        <LuStar
          key={value}
          className={`${sizeClass} ${
            value <= rating
              ? "fill-gold text-gold"
              : "fill-transparent text-dark-green/25"
          }`}
        />
      ))}
    </div>
  );
}

function MiniStarScale({ stars }: { stars: number }) {
  return (
    <div className="flex w-16 shrink-0 items-center gap-px" aria-hidden>
      {[1, 2, 3, 4, 5].map((value) => (
        <LuStar
          key={value}
          className={`h-2.5 w-2.5 ${
            value <= stars
              ? "fill-gold text-gold"
              : "fill-transparent text-dark-green/20"
          }`}
        />
      ))}
    </div>
  );
}

export default function Review({ productName }: { productName: string }) {
  const { data: session, status } = useSession();
  const [sort, setSort] = useState<SortOption>("relevance");
  const [filter, setFilter] = useState<StarFilter>("all");
  const [comment, setComment] = useState("");
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!productName) {
        setReviews([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/reviews?productName=${encodeURIComponent(productName)}`,
        );
        const data = (await response.json()) as {
          ok?: boolean;
          reviews?: ProductReview[];
          error?: string;
        };

        if (!response.ok || !data.ok) {
          if (!cancelled) {
            toast.error(data.error ?? "Failed to load reviews.");
            setReviews([]);
          }
          return;
        }

        if (!cancelled) {
          setReviews(data.reviews ?? []);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load reviews.");
          setReviews([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, [productName]);

  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      counts[review.rating] += 1;
    }
    return counts;
  }, [reviews]);

  const totalRatings = reviews.length;
  const averageRating =
    totalRatings === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings;

  const visibleReviews = useMemo(() => {
    let nextReviews = [...reviews];

    if (filter !== "all") {
      nextReviews = nextReviews.filter((review) => review.rating === filter);
    }

    if (sort === "highest") {
      nextReviews.sort((a, b) => b.rating - a.rating);
    } else if (sort === "lowest") {
      nextReviews.sort((a, b) => a.rating - b.rating);
    }

    return nextReviews;
  }, [filter, reviews, sort]);

  const sortLabel =
    sort === "highest"
      ? "Highest"
      : sort === "lowest"
        ? "Lowest"
        : "Relevance";

  const filterLabel = filter === "all" ? "All star" : `${filter} star`;

  const handleSubmitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim() || isSubmitting) {
      return;
    }

    if (status !== "authenticated") {
      toast.error("Please sign in to submit a review.");
      return;
    }

    setIsRatingOpen(true);
  };

  const handleRatingSelect = async (rating: number) => {
    const trimmedComment = comment.trim();
    if (!trimmedComment || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: trimmedComment,
          rating,
          productName,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        review?: ProductReview;
      };

      if (!response.ok || !data.ok || !data.review) {
        toast.error(data.error ?? "Failed to save review. Please try again.");
        return;
      }

      setReviews((prev) => [data.review!, ...prev]);
      toast.success("Comment submitted");
      setComment("");
    } catch {
      toast.error("Failed to save review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="bg-warm-white px-6 py-12 lg:px-8 lg:py-16">
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSelect={handleRatingSelect}
      />

      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-bold text-dark-green sm:text-2xl">
          Write a Review
        </h2>

        <form
          onSubmit={handleSubmitReview}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label className="sr-only" htmlFor="review-comment">
            Write your review
          </label>
          <textarea
            id="review-comment"
            name="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share your experience with this product..."
            rows={3}
            className="min-h-[5.5rem] w-full flex-1 resize-y rounded-2xl border border-dark-green/15 bg-beige/20 px-4 py-3 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/40 focus:border-dark-green/40"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 shrink-0 items-center justify-center self-center rounded-2xl bg-dark-green px-6 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[8.5rem]"
          >
            Submit
          </button>
        </form>

        <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">
          <div className="shrink-0">
            <p className="text-4xl font-bold tracking-tight text-dark-green sm:text-5xl">
              {averageRating.toFixed(1)}
              <span className="text-2xl font-semibold text-dark-green/50 sm:text-3xl">
                /5
              </span>
            </p>
            <div className="mt-2">
              <StarRow rating={Math.round(averageRating)} size="lg" />
            </div>
            <p className="mt-2 text-sm text-dark-green/55">
              {totalRatings} Ratings
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[stars] ?? 0;
              const percent =
                totalRatings === 0 ? 0 : Math.round((count / totalRatings) * 100);

              return (
                <div key={stars} className="flex items-center gap-3">
                  <MiniStarScale stars={stars} />
                  <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-dark-green/10">
                    <div
                      className="h-full rounded-full bg-gold transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm tabular-nums text-dark-green/70">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-y border-dark-green/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-dark-green">
            Product Reviews
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-sm text-dark-green/70">
            <label className="inline-flex items-center gap-1.5">
              <LuArrowUpDown className="h-4 w-4" aria-hidden />
              <span>Sort:</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as SortOption)
                }
                className="cursor-pointer border-0 bg-transparent font-medium text-dark-green outline-none"
                aria-label="Sort reviews"
              >
                <option value="relevance">Relevance</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
              </select>
              <span className="sr-only">{sortLabel}</span>
            </label>

            <span className="hidden h-4 w-px bg-dark-green/20 sm:block" aria-hidden />

            <label className="inline-flex items-center gap-1.5">
              <LuFilter className="h-4 w-4" aria-hidden />
              <span>Filter:</span>
              <select
                value={filter}
                onChange={(event) => {
                  const value = event.target.value;
                  setFilter(
                    value === "all" ? "all" : (Number(value) as StarFilter),
                  );
                }}
                className="cursor-pointer border-0 bg-transparent font-medium text-dark-green outline-none"
                aria-label="Filter reviews by star"
              >
                <option value="all">All star</option>
                <option value="5">5 star</option>
                <option value="4">4 star</option>
                <option value="3">3 star</option>
                <option value="2">2 star</option>
                <option value="1">1 star</option>
              </select>
              <span className="sr-only">{filterLabel}</span>
            </label>
          </div>
        </div>

        <ul className="divide-y divide-dark-green/10">
          {isLoading ? (
            <li className="py-10 text-center text-sm text-dark-green/60">
              Loading reviews…
            </li>
          ) : visibleReviews.length === 0 ? (
            <li className="py-10 text-center text-sm text-dark-green/60">
              {reviews.length === 0
                ? "No reviews yet. Be the first to share your experience."
                : "No reviews match this filter."}
            </li>
          ) : (
            visibleReviews.map((review) => (
              <li key={review.id} className="py-8">
                <StarRow rating={review.rating} />
                <p className="mt-3 text-sm font-semibold text-dark-green">
                  {review.name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-dark-green/75">
                  {review.comment}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm text-dark-green/55 transition-colors hover:text-dark-green"
                    aria-label={`Like review by ${review.name}`}
                  >
                    <LuThumbsUp className="h-4 w-4" aria-hidden />
                    <span>0</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-dark-green/40 transition-colors hover:text-dark-green"
                    aria-label="More options"
                  >
                    <LuEllipsisVertical className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
