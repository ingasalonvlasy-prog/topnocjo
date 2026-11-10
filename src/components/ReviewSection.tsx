"use client";

import { useState, useEffect, useTransition } from "react";

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rating ? "#F59E0B" : "none"}
          stroke={star <= rating ? "#F59E0B" : "#D1D5DB"}
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      ))}
    </div>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="cursor-pointer p-0.5"
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill={star <= (hover || value) ? "#F59E0B" : "none"}
            stroke={star <= (hover || value) ? "#F59E0B" : "#D1D5DB"}
            strokeWidth={1.5}
            className="transition-colors"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ReviewSummary({ avgRating, count }: { avgRating: number; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 mb-3">
      <Stars rating={Math.round(avgRating)} size={14} />
      <span className="text-[13px] text-muted font-medium">
        {avgRating.toFixed(1)} ({count} {count === 1 ? "recenze" : count < 5 ? "recenze" : "recenzí"})
      </span>
    </div>
  );
}

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews);
        setCount(data.count);
        setAvgRating(data.avgRating);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [productId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Vyberte hodnocení.");
      return;
    }
    if (!authorName.trim()) {
      setError("Vyplňte jméno.");
      return;
    }
    if (!content.trim()) {
      setError("Napište text recenze.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, authorName, rating, title, content }),
      });

      if (res.ok) {
        setSuccess(true);
        setRating(0);
        setAuthorName("");
        setTitle("");
        setContent("");
      } else {
        const data = await res.json();
        setError(data.error || "Něco se pokazilo.");
      }
    });
  }

  if (!loaded) return null;

  return (
    <div>
      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Stars rating={Math.round(avgRating)} size={20} />
            <span className="text-[15px] font-bold text-navy">
              {avgRating.toFixed(1)} z 5
            </span>
            <span className="text-[13px] text-muted">
              ({count} {count === 1 ? "recenze" : count < 5 ? "recenze" : "recenzí"})
            </span>
          </div>
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-line pb-5">
              <div className="flex items-center gap-3 mb-1.5">
                <Stars rating={review.rating} size={14} />
                <span className="text-[13px] font-bold text-ink">{review.authorName}</span>
                <span className="text-[12px] text-muted">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && (
                <h4 className="text-[14px] font-bold text-navy mb-1">{review.title}</h4>
              )}
              <p className="text-[14px] text-ink leading-relaxed">{review.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-muted mb-8">Zatím žádné recenze. Buďte první!</p>
      )}

      {/* Review form */}
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-[8px] p-4">
          <p className="text-[14px] font-bold text-green-800">Děkujeme za recenzi!</p>
          <p className="text-[13px] text-green-700 mt-1">Vaše recenze bude zobrazena po schválení.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-[500px]">
          <h4 className="text-[16px] font-bold text-navy mb-4">Napište recenzi</h4>

          {error && (
            <p className="text-[13px] text-sale font-bold mb-3">{error}</p>
          )}

          <div className="mb-4">
            <label className="block text-[13px] font-bold text-ink mb-1.5">Hodnocení *</label>
            <StarSelector value={rating} onChange={setRating} />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-bold text-ink mb-1.5">Jméno *</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={100}
              className="w-full h-[44px] px-4 border border-line rounded-[8px] text-[14px] text-ink focus:outline-none focus:border-navy transition-colors"
              placeholder="Vaše jméno"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-bold text-ink mb-1.5">Titulek</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full h-[44px] px-4 border border-line rounded-[8px] text-[14px] text-ink focus:outline-none focus:border-navy transition-colors"
              placeholder="Shrnutí vaší zkušenosti"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-bold text-ink mb-1.5">Recenze *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-3 border border-line rounded-[8px] text-[14px] text-ink focus:outline-none focus:border-navy transition-colors resize-none"
              placeholder="Podělte se o svou zkušenost s tímto produktem..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-[44px] px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Odesílám..." : "Odeslat recenzi"}
          </button>
        </form>
      )}
    </div>
  );
}
