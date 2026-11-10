"use client";

import { useTransition } from "react";
import { approveReview, rejectReview, deleteReview } from "./actions";

export function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {!approved && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => approveReview(id))}
          className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          Schválit
        </button>
      )}
      {approved && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => rejectReview(id))}
          className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50"
        >
          Zamítnout
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Opravdu smazat tuto recenzi?")) {
            startTransition(() => deleteReview(id));
          }
        }}
        className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Smazat
      </button>
    </div>
  );
}
