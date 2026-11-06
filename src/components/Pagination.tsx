import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set("strana", String(page));
    } else {
      params.delete("strana");
    }
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav aria-label="Stránkování" className="flex justify-center items-center gap-1.5 mt-10">
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 text-[13px] font-medium border border-line rounded-[var(--radius-field)] hover:bg-wash transition-colors"
        >
          &laquo;
        </Link>
      )}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 py-2 text-muted">...</span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`px-3.5 py-2 text-[13px] font-medium rounded-[var(--radius-field)] transition-colors ${
              p === currentPage
                ? "bg-navy text-white"
                : "border border-line hover:bg-wash"
            }`}
          >
            {p}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 text-[13px] font-medium border border-line rounded-[var(--radius-field)] hover:bg-wash transition-colors"
        >
          &raquo;
        </Link>
      )}
    </nav>
  );
}
