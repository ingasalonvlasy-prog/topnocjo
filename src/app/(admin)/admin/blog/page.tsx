import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SECTION_LABELS, type BlogSection } from "@/lib/blog-constants";
import { requireAdmin } from "@/lib/auth";

export default async function AdminBlogPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });

  async function deletePost(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = formData.get("id") as string;
    await prisma.blogPost.delete({ where: { id } });
    revalidatePath("/admin/blog");
    redirect("/admin/blog");
  }

  async function togglePublished(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = formData.get("id") as string;
    const current = formData.get("published") === "true";
    await prisma.blogPost.update({
      where: { id },
      data: {
        published: !current,
        publishedAt: !current ? new Date() : null,
      },
    });
    revalidatePath("/admin/blog");
  }

  function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {posts.length} článků
          </p>
        </div>
        <Link
          href="/admin/blog/novy"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Nový článek
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Název</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Sekce</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Autor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Publikováno</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stav</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Akce</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const sectionLabel = SECTION_LABELS[post.section as BlogSection] || post.section;
              const sportTags: string[] = JSON.parse(post.sportTags || "[]");
              return (
                <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">{post.slug}</div>
                    {sportTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sportTags.map((tag) => (
                          <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                      {sectionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{post.author}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <form action={togglePublished}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="published" value={String(post.published)} />
                      <button
                        type="submit"
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                          post.published
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}
                      >
                        {post.published ? "Publikováno" : "Koncept"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Upravit
                      </Link>
                      <form action={deletePost} className="inline">
                        <input type="hidden" name="id" value={post.id} />
                        <button type="submit" className="text-sm font-medium text-red-500 hover:text-red-700">
                          Smazat
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Žádné články
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
