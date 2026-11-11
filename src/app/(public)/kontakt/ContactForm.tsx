"use client";

import { useState } from "react";
import { submitContactForm } from "./actions";

const inputCls =
  "w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const result = await submitContactForm(fd);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-[10px] text-center">
        <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <p className="text-[16px] font-bold text-green-700">Zpráva odeslána!</p>
        <p className="text-[13px] text-green-600 mt-1">Odpovíme vám co nejdříve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-[13px] text-sale p-3 bg-red-50 rounded-lg">{error}</p>
      )}
      <div>
        <label htmlFor="name" className="block text-[13px] font-bold text-ink mb-1.5">Jméno *</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-[13px] font-bold text-ink mb-1.5">E-mail *</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-[13px] font-bold text-ink mb-1.5">Zpráva *</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={inputCls + " resize-y"}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] px-8 rounded-[var(--radius-pill)] hover:bg-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Odesílám..." : "Odeslat"}
      </button>
    </form>
  );
}
