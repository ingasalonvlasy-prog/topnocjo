import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { BLOG_SECTIONS, SECTION_LABELS, SPORT_TAGS, type BlogSection } from "@/lib/blog-constants";
import { WysiwygEditor } from "@/components/admin/WysiwygEditor";
import { requireAdmin } from "@/lib/auth";

export default function NewBlogPostPage() {
  async function createPost(formData: FormData) {
    "use server";
    await requireAdmin();
    const title = formData.get("title") as string;
    const slugInput = formData.get("slug") as string;
    const slug = slugInput || title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const excerpt = (formData.get("excerpt") as string) || null;
    const content = (formData.get("content") as string) || "";
    const coverImage = (formData.get("coverImage") as string) || null;
    const author = (formData.get("author") as string) || "Qsport.cz";
    const tagsStr = formData.get("tags") as string;
    const tagsArr = tagsStr
      ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const published = formData.get("published") === "on";
    const section = (formData.get("section") as string) || "NOVINKY";
    const metaDescription = (formData.get("metaDescription") as string) || null;
    const sourcesRaw = (formData.get("sources") as string) || "[]";
    const relatedRaw = (formData.get("relatedProducts") as string) || "";
    const relatedArr = relatedRaw
      ? relatedRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const eventDateStr = formData.get("eventDate") as string;
    const eventLocation = (formData.get("eventLocation") as string) || null;

    // Collect sport tag checkboxes
    const sportTagSlugs: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("sportTag_") && value === "on") {
        sportTagSlugs.push(key.replace("sportTag_", ""));
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImage,
        author,
        tags: JSON.stringify(tagsArr),
        published,
        publishedAt: published ? new Date() : null,
        section,
        sportTags: JSON.stringify(sportTagSlugs),
        metaDescription,
        sources: sourcesRaw,
        relatedProducts: JSON.stringify(relatedArr),
        eventDate: eventDateStr ? new Date(eventDateStr) : null,
        eventLocation: section === "KALENDAR_AKCI" ? eventLocation : null,
      },
    });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    redirect(`/admin/blog/${post.id}`);
  }

  const sectionEntries = Object.entries(SECTION_LABELS) as [BlogSection, string][];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/blog"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na blog
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nový článek</h1>
        <p className="text-sm text-gray-500 mt-1">Vytvořit nový blogový příspěvek</p>
      </div>

      <form action={createPost}>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
              <input
                name="title"
                type="text"
                required
                placeholder="Název článku"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                name="slug"
                type="text"
                placeholder="Automaticky z názvu"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section + Sport tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sekce</label>
              <select
                name="section"
                defaultValue="NOVINKY"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sectionEntries.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sport rubriky</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {SPORT_TAGS.map((tag) => (
                  <label key={tag.slug} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name={`sportTag_${tag.slug}`}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perex</label>
            <textarea
              name="excerpt"
              rows={2}
              placeholder="Krátký úvod článku..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Obsah</label>
            <WysiwygEditor name="content" defaultValue="" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta description (SEO)
              <span className="text-gray-400 font-normal ml-1">140-155 znaků</span>
            </label>
            <textarea
              name="metaDescription"
              rows={2}
              maxLength={160}
              placeholder="SEO popis pro vyhledávače..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image (URL)</label>
              <input
                name="coverImage"
                type="text"
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
              <input
                name="author"
                type="text"
                defaultValue="Qsport.cz"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagy (oddělené čárkou)</label>
            <input
              name="tags"
              type="text"
              placeholder="běh, trail, obuv"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zdroje (JSON)
              <span className="text-gray-400 font-normal ml-1">[{`{"title":"...","url":"..."}`}]</span>
            </label>
            <textarea
              name="sources"
              rows={2}
              defaultValue="[]"
              placeholder='[{"title":"Název zdroje","url":"https://..."}]'
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Související produkty (slugy, oddělené čárkou)
            </label>
            <input
              name="relatedProducts"
              type="text"
              placeholder="on-cloudmonster, poc-obex-mips"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Kalendář akcí fields */}
          <div className="border border-dashed border-gray-300 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Pouze pro sekci Kalendář akcí</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum akce</label>
                <input
                  name="eventDate"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Místo akce</label>
                <input
                  name="eventLocation"
                  type="text"
                  placeholder="Krkonoše · Špindlerův Mlýn"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              name="published"
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">Publikovat ihned</label>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Vytvořit článek
          </button>
          <Link
            href="/admin/blog"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}
