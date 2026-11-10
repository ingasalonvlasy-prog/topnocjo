"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Něco se pokazilo.");
      } else {
        setStatus("success");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Chyba při odesílání.");
    }
  }

  if (status === "success") {
    return (
      <p className="text-[14px] font-bold text-lime">
        Přihlášeno! Díky za odběr.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full sm:w-auto">
      <div className="flex w-full sm:w-auto gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tvuj@email.cz"
          required
          className="flex-1 sm:w-[260px] py-3 px-4 rounded-[var(--radius-field)] border border-white/15 bg-white/5 text-white text-[14px] font-medium outline-none placeholder:text-white/30 focus:border-lime/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-lime text-navy px-6 py-3 rounded-[var(--radius-pill)] text-[12px] font-extrabold uppercase tracking-[0.12em] hover:brightness-110 transition-all shrink-0 disabled:opacity-60"
        >
          {status === "loading" ? "..." : "Přihlásit"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-[12px] text-red-400 mt-2">{errorMsg}</p>
      )}
    </form>
  );
}
