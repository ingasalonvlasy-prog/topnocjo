import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + "\u00A0Kč";
}

interface SeoIssue {
  type: "error" | "warning";
  entity: "product" | "blog" | "category";
  entityName: string;
  editHref: string;
  message: string;
}

interface Recommendation {
  title: string;
  description: string;
  cta: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}

export default async function GrowthPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // --- Parallel data fetch ---
  const [
    totalOrders30d,
    paidOrders30d,
    usersWithOrderCounts,
    newsletterCount,
    products,
    blogPosts,
    categories,
    activeDiscounts,
    activeProducts,
    publishedPosts,
    approvedReviews,
    totalUsers,
    abandonedTotal,
    abandonedRecovered,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: "PAID" } }),
    prisma.user.findMany({
      select: {
        id: true,
        orders: {
          where: { paymentStatus: "PAID" },
          select: { total: true, createdAt: true },
        },
      },
    }),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, bodyHtml: true, photos: true },
    }),
    prisma.blogPost.findMany({
      select: { id: true, title: true, slug: true, metaDescription: true, published: true },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, seoTitle: true, seoDesc: true },
    }),
    prisma.discountCode.count({ where: { active: true } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.blogPost.count({ where: { published: true } }),
    prisma.productReview.count({ where: { approved: true } }),
    prisma.user.count(),
    prisma.abandonedCheckout.count({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "EXPIRED" } },
    }),
    prisma.abandonedCheckout.count({
      where: { createdAt: { gte: thirtyDaysAgo }, status: "RECOVERED" },
    }),
  ]);

  // --- SEKCE 1: Konverzní přehled ---
  const conversionRate = totalOrders30d > 0 ? Math.round((paidOrders30d / totalOrders30d) * 100) : 0;

  const usersWithOrders = usersWithOrderCounts.filter((u) => u.orders.length > 0);
  const usersWithMultiple = usersWithOrderCounts.filter((u) => u.orders.length >= 2);
  const returningRate = usersWithOrders.length > 0
    ? Math.round((usersWithMultiple.length / usersWithOrders.length) * 100)
    : 0;

  const totalPaidOrders = usersWithOrderCounts.reduce((sum, u) => sum + u.orders.length, 0);
  const avgOrdersPerCustomer = usersWithOrders.length > 0
    ? (totalPaidOrders / usersWithOrders.length).toFixed(1)
    : "0";

  // --- SEKCE 2: SEO audit ---
  const issues: SeoIssue[] = [];

  for (const p of products) {
    if (!p.seoTitle) issues.push({ type: "error", entity: "product", entityName: p.name, editHref: `/admin/produkty/${p.id}`, message: "Chybí SEO title" });
    if (!p.seoDescription) issues.push({ type: "error", entity: "product", entityName: p.name, editHref: `/admin/produkty/${p.id}`, message: "Chybí SEO description" });
    if (!p.bodyHtml) issues.push({ type: "warning", entity: "product", entityName: p.name, editHref: `/admin/produkty/${p.id}`, message: "Chybí popis produktu" });
    const photos = JSON.parse(p.photos || "[]");
    if (photos.length === 0) issues.push({ type: "error", entity: "product", entityName: p.name, editHref: `/admin/produkty/${p.id}`, message: "Chybí fotky" });
  }

  for (const b of blogPosts) {
    if (!b.metaDescription && b.published) issues.push({ type: "warning", entity: "blog", entityName: b.title, editHref: `/admin/blog/${b.id}`, message: "Chybí meta description" });
  }

  for (const c of categories) {
    if (!c.seoTitle) issues.push({ type: "warning", entity: "category", entityName: c.name, editHref: `/admin/kategorie/${c.id}`, message: "Chybí SEO title" });
    if (!c.seoDesc) issues.push({ type: "warning", entity: "category", entityName: c.name, editHref: `/admin/kategorie/${c.id}`, message: "Chybí SEO description" });
  }

  const totalEntities = products.length + blogPosts.filter((b) => b.published).length + categories.length;
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const seoScore = totalEntities > 0 ? Math.max(0, Math.round(((totalEntities - errorCount) / totalEntities) * 100)) : 100;

  // Group issues by entity name, sort by issue count descending, top 10
  const issuesByEntity = new Map<string, { name: string; href: string; issues: string[] }>();
  for (const issue of issues) {
    const key = issue.editHref;
    if (!issuesByEntity.has(key)) {
      issuesByEntity.set(key, { name: issue.entityName, href: issue.editHref, issues: [] });
    }
    issuesByEntity.get(key)!.issues.push(issue.message);
  }
  const worstEntities = Array.from(issuesByEntity.values())
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, 10);

  // --- SEKCE 3: Doporučení ---
  const month = new Date().getMonth(); // 0-based
  const recommendations: Recommendation[] = [];

  if (errorCount > 0) {
    recommendations.push({
      title: "Opravte SEO problémy",
      description: `${errorCount} kritických problémů snižuje viditelnost ve vyhledávačích.`,
      cta: "Zobrazit problémy",
      href: "#seo",
      color: "border-red-300 bg-red-50",
      icon: <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
    });
  }
  if (activeDiscounts === 0) {
    recommendations.push({
      title: "Vytvořte slevový kód",
      description: "Slevy motivují zákazníky k nákupu. Zatím nemáte žádný aktivní kód.",
      cta: "Vytvořit slevu",
      href: "/admin/slevy/novy",
      color: "border-amber-300 bg-amber-50",
      icon: <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>,
    });
  }
  if (activeProducts < 20) {
    recommendations.push({
      title: "Přidejte více produktů",
      description: `Máte ${activeProducts} aktivních produktů. Více produktů = více šancí na konverzi.`,
      cta: "Přidat produkt",
      href: "/admin/produkty/novy",
      color: "border-blue-300 bg-blue-50",
      icon: <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    });
  }
  if (publishedPosts < 3) {
    recommendations.push({
      title: "Napište blog článek",
      description: "Blog přitahuje organický traffic. Publikované články: " + publishedPosts,
      cta: "Nový článek",
      href: "/admin/blog/novy",
      color: "border-blue-300 bg-blue-50",
      icon: <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>,
    });
  }
  if (approvedReviews < 5) {
    recommendations.push({
      title: "Získejte recenze",
      description: `${approvedReviews} schválených recenzí. Recenze zvyšují důvěru a konverze.`,
      cta: "Spravovat recenze",
      href: "/admin/recenze",
      color: "border-amber-300 bg-amber-50",
      icon: <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>,
    });
  }
  if (newsletterCount < 50) {
    recommendations.push({
      title: "Rozšiřte newsletter",
      description: `${newsletterCount} odběratelů. Newsletter je nejlevnější marketingový kanál.`,
      cta: "Nastavení",
      href: "/admin/nastaveni",
      color: "border-green-300 bg-green-50",
      icon: <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>,
    });
  }
  if (month >= 9 && month <= 10) {
    recommendations.push({
      title: "Připravte vánoční sezónu",
      description: "Zákazníci začínají nakupovat dárky. Vytvořte akční slevy.",
      cta: "Vytvořit slevu",
      href: "/admin/slevy/novy",
      color: "border-red-300 bg-red-50",
      icon: <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>,
    });
  }

  // --- SEKCE 4: Zákaznická retence ---
  const segments = { noOrders: 0, oneOrder: 0, twoOrders: 0, threeToFour: 0, fivePlus: 0 };
  let totalSpent = 0;
  let customersWithOrders = 0;
  const interOrderDays: number[] = [];

  for (const user of usersWithOrderCounts) {
    const count = user.orders.length;
    const spent = user.orders.reduce((s, o) => s + o.total, 0);
    totalSpent += spent;
    if (count === 0) segments.noOrders++;
    else if (count === 1) { segments.oneOrder++; customersWithOrders++; }
    else if (count === 2) { segments.twoOrders++; customersWithOrders++; }
    else if (count <= 4) { segments.threeToFour++; customersWithOrders++; }
    else { segments.fivePlus++; customersWithOrders++; }

    if (count >= 2) {
      const sorted = user.orders.map((o) => o.createdAt.getTime()).sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        interOrderDays.push(Math.round((sorted[i] - sorted[i - 1]) / (24 * 60 * 60 * 1000)));
      }
    }
  }

  const ltv = customersWithOrders > 0 ? Math.round(totalSpent / customersWithOrders) : 0;
  const avgDaysBetween = interOrderDays.length > 0
    ? Math.round(interOrderDays.reduce((s, d) => s + d, 0) / interOrderDays.length)
    : 0;

  // Segment bar widths
  const segTotal = Math.max(1, segments.oneOrder + segments.twoOrders + segments.threeToFour + segments.fivePlus);
  const segPct = {
    one: Math.round((segments.oneOrder / segTotal) * 100),
    two: Math.round((segments.twoOrders / segTotal) * 100),
    threeFour: Math.round((segments.threeToFour / segTotal) * 100),
    fivePlus: Math.round((segments.fivePlus / segTotal) * 100),
  };

  // --- Quick actions ---
  const quickActions = [
    { label: "Slevový kód", href: "/admin/slevy/novy", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg> },
    { label: "Blog článek", href: "/admin/blog/novy", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg> },
    { label: "Přidat produkt", href: "/admin/produkty/novy", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> },
    { label: "Recenze", href: "/admin/recenze", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg> },
    { label: "Newsletter", href: "/admin/nastaveni", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg> },
    { label: "SEO nastavení", href: "/admin/nastaveni", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg> },
    { label: "Opuštěné pokladny", href: "/admin/opustene-pokladny", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg> },
    { label: "Zobrazit e-shop", href: "/", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Růst</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nástroje pro růst vašeho e-shopu — konverze, SEO, retence
        </p>
      </div>

      {/* SEKCE 1: Konverzní přehled */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Míra konverze plateb"
          value={`${conversionRate} %`}
          change={`${paidOrders30d}/${totalOrders30d} objednávek`}
          changeType={conversionRate >= 70 ? "up" : conversionRate >= 40 ? "neutral" : "down"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Vracející se zákazníci"
          value={`${returningRate} %`}
          change={`${usersWithMultiple.length} z ${usersWithOrders.length}`}
          changeType={returningRate >= 20 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          }
        />
        <StatCard
          label="Ø objednávky/zákazník"
          value={avgOrdersPerCustomer}
          changeType="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0 4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25" />
            </svg>
          }
        />
        <StatCard
          label="Newsletter odběratelé"
          value={String(newsletterCount)}
          changeType="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          }
        />
      </div>

      {/* SEKCE 2: SEO zdraví */}
      <div id="seo" className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">SEO zdraví</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Skóre:</span>
            <span className={`text-2xl font-bold ${
              seoScore >= 80 ? "text-green-600" : seoScore >= 50 ? "text-yellow-600" : "text-red-600"
            }`}>
              {seoScore}
            </span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3 mb-4">
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {errorCount} kritických
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {warningCount} upozornění
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {totalEntities - errorCount} v pořádku
          </span>
        </div>

        {/* Worst entities table */}
        {worstEntities.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 font-medium text-gray-500">Položka</th>
                <th className="text-left py-2 font-medium text-gray-500">Problémy</th>
                <th className="text-right py-2 font-medium text-gray-500">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {worstEntities.map((e) => (
                <tr key={e.href} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-900 max-w-[200px] truncate">{e.name}</td>
                  <td className="py-2 text-gray-500 text-xs">{e.issues.join(", ")}</td>
                  <td className="py-2 text-right">
                    <Link href={e.href} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                      Upravit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {worstEntities.length === 0 && (
          <p className="text-sm text-green-600 font-medium">Skvělé! Žádné kritické SEO problémy.</p>
        )}
      </div>

      {/* SEKCE 3: Doporučení pro růst */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Doporučení pro růst</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div key={rec.title} className={`rounded-lg border p-4 ${rec.color}`}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{rec.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{rec.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    <Link
                      href={rec.href}
                      className="inline-block mt-2 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      {rec.cta} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEKCE 4: Zákaznická retence */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Zákaznická retence</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Registrovaných zákazníků</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{returningRate} %</p>
            <p className="text-xs text-gray-500 mt-1">Vracejících se (2+ obj)</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{formatPrice(ltv)}</p>
            <p className="text-xs text-gray-500 mt-1">Ø LTV zákazníka</p>
          </div>
        </div>

        {avgDaysBetween > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Průměrná doba mezi objednávkami: <span className="font-semibold">{avgDaysBetween} dní</span>
          </p>
        )}

        {/* Segment bar */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Segmentace zákazníků</p>
          <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
            {segPct.one > 0 && (
              <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${segPct.one}%` }}>
                {segPct.one >= 10 && <span className="text-[10px] font-bold text-white">{segments.oneOrder}</span>}
              </div>
            )}
            {segPct.two > 0 && (
              <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${segPct.two}%` }}>
                {segPct.two >= 10 && <span className="text-[10px] font-bold text-white">{segments.twoOrders}</span>}
              </div>
            )}
            {segPct.threeFour > 0 && (
              <div className="bg-blue-600 flex items-center justify-center" style={{ width: `${segPct.threeFour}%` }}>
                {segPct.threeFour >= 10 && <span className="text-[10px] font-bold text-white">{segments.threeToFour}</span>}
              </div>
            )}
            {segPct.fivePlus > 0 && (
              <div className="bg-blue-700 flex items-center justify-center" style={{ width: `${segPct.fivePlus}%` }}>
                {segPct.fivePlus >= 10 && <span className="text-[10px] font-bold text-white">{segments.fivePlus}</span>}
              </div>
            )}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>1 obj ({segments.oneOrder})</span>
            <span>2 obj ({segments.twoOrders})</span>
            <span>3-4 obj ({segments.threeToFour})</span>
            <span>5+ obj ({segments.fivePlus})</span>
          </div>
        </div>

        {/* Abandoned checkout recovery rate */}
        {abandonedTotal > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Obnova opuštěných pokladen (30d):</span>
              <span className="font-semibold text-gray-900">
                {Math.round((abandonedRecovered / abandonedTotal) * 100)} %
              </span>
              <span className="text-xs text-gray-400">({abandonedRecovered}/{abandonedTotal})</span>
            </div>
          </div>
        )}
      </div>

      {/* SEKCE 5: Rychlé akce */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rychlé akce</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              target={action.href === "/" ? "_blank" : undefined}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-center group"
            >
              <span className="text-gray-400 group-hover:text-blue-600 transition-colors">{action.icon}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
