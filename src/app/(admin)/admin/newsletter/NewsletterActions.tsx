"use client";

import { useState, useTransition } from "react";
import { toggleSubscriber, deleteSubscriber } from "./actions";

interface Props {
  id: string;
  active: boolean;
}

export function NewsletterActions({ id, active }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => startTransition(() => toggleSubscriber(id, !active))}
        disabled={isPending}
        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {active ? "Deaktivovat" : "Aktivovat"}
      </button>
      {showConfirm ? (
        <span className="flex items-center gap-1">
          <button
            onClick={() =>
              startTransition(async () => {
                await deleteSubscriber(id);
                setShowConfirm(false);
              })
            }
            disabled={isPending}
            className="text-xs text-red-700 font-medium hover:text-red-900 disabled:opacity-50"
          >
            Potvrdit
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Zrušit
          </button>
        </span>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Smazat
        </button>
      )}
    </div>
  );
}
