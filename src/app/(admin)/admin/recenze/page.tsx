import Link from "next/link";
import { prisma } from "@/lib/db";
import { ReviewActions } from "./ReviewActions";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = (sp.filtr as string) || "ceka";

  const where =
    filter === "schvalene"
      ? { approved: true }
      : filter === "vsechny"
        ? {}
        : { approved: false };

  const reviews = await prisma.productReview.findMany({
    where,
    include: {
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pendingCount = await prisma.productReview.count({ where: { approved: false } });

  const filters = [
    { id: "ceka", label: `Čeká na schválení (${pendingCount})` },
    { id: "schvalene", label: "Schválené" },
    { id: "vsechny", label: "Všechny" },
  ];

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderStars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recenze</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 text-sm font-bold text-amber-800 bg-amber-100 rounded-full">
            {pendingCount} čeká na schválení
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/admin/recenze?filtr=${f.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === f.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Žádné recenze v tomto filtru.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produkt</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Autor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Hodnocení</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Recenze</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stav</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Akce</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/produkt/${review.product.slug}`}
                      className="text-blue-600 hover:underline font-medium"
                      target="_blank"
                    >
                      {review.product.name.length > 30
                        ? review.product.name.slice(0, 30) + "..."
                        : review.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{review.authorName}</td>
                  <td className="px-4 py-3 text-amber-500">{renderStars(review.rating)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[300px]">
                    {review.title && (
                      <span className="font-bold text-gray-900">{review.title}: </span>
                    )}
                    {review.content.length > 80
                      ? review.content.slice(0, 80) + "..."
                      : review.content}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(review.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {review.approved ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                        Schváleno
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-full">
                        Čeká
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReviewActions id={review.id} approved={review.approved} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
