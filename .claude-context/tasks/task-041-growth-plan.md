# TASK-041: Růst stránka — reálný obsah

## Přehled

Nahradit placeholder "Připravujeme" stránku `/admin/rust` reálným obsahem. Inspirace: Shopify "Growth" sekce — konverzní trychtýř, SEO doporučení, zákaznické metriky, rychlé akce.

**Princip:** Využít POUZE data, která už máme v DB (Order, User, Product, Variant, AbandonedCheckout, NewsletterSubscriber, DiscountCode, BlogPost). Žádné externí API, žádné nové Prisma modely.

## Analýza dostupných dat

### Co máme v DB:
| Model | Použitelné metriky |
|-------|-------------------|
| Order | Tržby, počet objednávek, opakované nákupy (userId), platební konverze |
| User | Celkem zákazníků, noví vs vracející se, registrace trend |
| AbandonedCheckout | Opuštěné pokladny, míra obnovy (po TASK-041 implementaci) |
| Product | SEO audit (seoTitle, seoDescription, bodyHtml, photos), aktivní/neaktivní |
| Variant | Cenová analýza, sklad |
| DiscountCode | Aktivní slevy, využití |
| NewsletterSubscriber | Odběratelé newsletteru |
| BlogPost | Publikované články, SEO meta |
| ProductReview | Recenze — social proof metriky |

### Co NEMÁME (a nepotřebujeme):
- Page views / sessions (vyžadovalo by analytics tracking)
- Košík data mimo checkout (košík je client-only localStorage)
- Email open/click rates (Resend analytics — budoucí integrace)

---

## IMPLEMENTAČNÍ PLÁN

### Stránka: `src/app/(admin)/admin/rust/page.tsx`

**Server Component**, přepsat placeholder. Rozdělit do 5 sekcí.

---

### SEKCE 1: Konverzní přehled (stat karty nahoře)

4 stat karty (pattern ze zákazníků/dashboardu):

| Karta | Výpočet | Ikona |
|-------|---------|-------|
| Míra konverze plateb | `(PAID orders / total orders) * 100` za 30 dní | % v kruhu |
| Vracející se zákazníci | `Users s 2+ orders / Users s 1+ orders * 100` | opakující arrow |
| Průměrný počet objednávek/zákazník | `total paid orders / unique userId count` | stack |
| Newsletter odběratelé | `NewsletterSubscriber.count(active: true)` | mail |

```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const [
  totalOrders30d,
  paidOrders30d,
  usersWithOrders,
  usersWithMultipleOrders,
  newsletterCount,
  totalPaidOrders,
  uniqueOrderUsers,
] = await Promise.all([
  prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: "PAID" } }),
  prisma.order.groupBy({ by: ["userId"], where: { userId: { not: null }, paymentStatus: "PAID" }, _count: true }),
  // users with 2+ orders — filter usersWithOrders where _count >= 2
  // (done in JS from usersWithOrders result)
  prisma.newsletterSubscriber.count({ where: { active: true } }),
  prisma.order.count({ where: { paymentStatus: "PAID" } }),
  prisma.order.groupBy({ by: ["userId"], where: { userId: { not: null }, paymentStatus: "PAID" } }),
]);

const conversionRate = totalOrders30d > 0 ? Math.round((paidOrders30d / totalOrders30d) * 100) : 0;
const returningRate = usersWithOrders.length > 0
  ? Math.round((usersWithOrders.filter(u => u._count >= 2).length / usersWithOrders.length) * 100)
  : 0;
const avgOrdersPerCustomer = uniqueOrderUsers.length > 0
  ? (totalPaidOrders / uniqueOrderUsers.length).toFixed(1)
  : "0";
```

---

### SEKCE 2: SEO zdraví (automatický audit)

**Server-side audit** — projít produkty a blog posty, spočítat SEO problémy.

#### SEO kontroly pro produkty:

| Kontrola | Dotaz | Závažnost |
|----------|-------|-----------|
| Chybí SEO title | `product.seoTitle` je null/prázdné | Vysoká |
| Chybí SEO description | `product.seoDescription` je null/prázdné | Vysoká |
| Chybí popis produktu | `product.bodyHtml` je null/prázdné | Střední |
| Chybí fotky | `product.photos === "[]"` | Vysoká |
| Krátký popis | `product.bodyHtml?.length < 100` | Nízká |

#### SEO kontroly pro blog posty:

| Kontrola | Dotaz | Závažnost |
|----------|-------|-----------|
| Chybí meta description | `blogPost.metaDescription` je null/prázdné | Vysoká |
| Nepublikovaný | `blogPost.published === false` | Info |

#### SEO kontroly pro kategorie:

| Kontrola | Dotaz | Závažnost |
|----------|-------|-----------|
| Chybí SEO title | `category.seoTitle` je null/prázdné | Střední |
| Chybí SEO description | `category.seoDesc` je null/prázdné | Střední |

**Implementace:**

```typescript
const [products, blogPosts, categories] = await Promise.all([
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
]);

interface SeoIssue {
  type: "error" | "warning" | "info";
  entity: "product" | "blog" | "category";
  entityId: string;
  entityName: string;
  entitySlug: string;
  message: string;
}

const issues: SeoIssue[] = [];

for (const p of products) {
  if (!p.seoTitle) issues.push({ type: "error", entity: "product", entityId: p.id, entityName: p.name, entitySlug: p.slug, message: "Chybí SEO title" });
  if (!p.seoDescription) issues.push({ type: "error", entity: "product", entityId: p.id, entityName: p.name, entitySlug: p.slug, message: "Chybí SEO description" });
  if (!p.bodyHtml) issues.push({ type: "warning", entity: "product", entityId: p.id, entityName: p.name, entitySlug: p.slug, message: "Chybí popis produktu" });
  const photos = JSON.parse(p.photos || "[]");
  if (photos.length === 0) issues.push({ type: "error", entity: "product", entityId: p.id, entityName: p.name, entitySlug: p.slug, message: "Chybí fotky produktu" });
}

for (const b of blogPosts) {
  if (!b.metaDescription && b.published) issues.push({ type: "warning", entity: "blog", entityId: b.id, entityName: b.title, entitySlug: b.slug, message: "Chybí meta description" });
}

for (const c of categories) {
  if (!c.seoTitle) issues.push({ type: "warning", entity: "category", entityId: c.id, entityName: c.name, entitySlug: c.slug, message: "Chybí SEO title" });
  if (!c.seoDesc) issues.push({ type: "warning", entity: "category", entityId: c.id, entityName: c.name, entitySlug: c.slug, message: "Chybí SEO description" });
}
```

**Vizualizace:**

1. **SEO skóre** — velké číslo nahoře:
   - `score = Math.round(((totalEntities - issues.filter(i => i.type === "error").length) / totalEntities) * 100)`
   - Barva: zelená (80+), žlutá (50-79), červená (<50)

2. **Shrnutí problémů** — 3 řádky:
   - Červené: X kritických (chybí title/description/fotky)
   - Žluté: X upozornění (chybí popis, krátký text)
   - Zelené: X produktů v pořádku

3. **Tabulka nejhorších** — top 10 produktů s nejvíce problémy, s link na edit:

| Produkt | Problémy | Akce |
|---------|----------|------|
| Nike Air Max | Chybí SEO title, Chybí popis | [Upravit →] |

---

### SEKCE 3: Doporučení pro růst

**Dynamicky generované karty** na základě aktuálního stavu e-shopu. Každá karta = 1 doporučení s CTA.

```typescript
interface Recommendation {
  title: string;
  description: string;
  cta: string;
  href: string;
  priority: "high" | "medium" | "low";
  color: "red" | "amber" | "blue" | "green";
  condition: boolean; // zobrazit pouze pokud true
}

const recommendations: Recommendation[] = [];
```

**Doporučení (zobrazit pokud podmínka splněna):**

| # | Titulek | Podmínka | CTA | Link |
|---|---------|----------|-----|------|
| 1 | "Opravte SEO problémy" | `errorIssues.length > 0` | "Zobrazit problémy" | scroll na SEO sekci |
| 2 | "Vytvořte slevový kód" | `activeDiscounts === 0` | "Vytvořit slevu" | `/admin/slevy/novy` |
| 3 | "Přidejte více produktů" | `activeProducts < 20` | "Přidat produkt" | `/admin/produkty/novy` |
| 4 | "Napište blog článek" | `publishedPosts < 3` | "Nový článek" | `/admin/blog/novy` |
| 5 | "Získejte recenze" | `approvedReviews < 5` | "Spravovat recenze" | `/admin/recenze` |
| 6 | "Rozšiřte newsletter" | `newsletterCount < 50` | "Nastavení" | `/admin/nastaveni` |
| 7 | "Nastavte recovery emaily" | `!process.env.RESEND_API_KEY` | "Nastavit" | `/admin/nastaveni` |
| 8 | "Vanocni sezona" | `month >= 9 && month <= 11` | "Vytvořit slevu" | `/admin/slevy/novy` |

**Vizualizace:** Grid 2-3 sloupce, každá karta s ikonou, textem a CTA tlačítkem. Barva okraje podle priority.

**Data pro doporučení:**
```typescript
const [activeDiscounts, activeProducts, publishedPosts, approvedReviews] = await Promise.all([
  prisma.discountCode.count({ where: { active: true } }),
  prisma.product.count({ where: { status: "ACTIVE" } }),
  prisma.blogPost.count({ where: { published: true } }),
  prisma.productReview.count({ where: { approved: true } }),
]);
```

---

### SEKCE 4: Zákaznická retence

**Tabulka/karty s metrikami o zákaznících:**

| Metrika | Výpočet | Vizualizace |
|---------|---------|-------------|
| Celkem registrovaných | `User.count()` | číslo |
| S alespoň 1 objednávkou | `users s orders.length > 0` | číslo + % z celku |
| Vracející se (2+ obj) | `users s orders.length >= 2` | číslo + % |
| VIP (5+ obj nebo 5000+ Kč) | `users s total_spent >= 500000` | číslo |
| Průměrná hodnota zákazníka (LTV) | `total_revenue / unique_customers` | částka |
| Průměrná doba mezi objednávkami | pro users s 2+ orders: avg(order[n+1].createdAt - order[n].createdAt) | dny |

**Vizualizace:** 
- Horní řádek: 3 velké metriky (registrovaní, vracející se %, LTV)
- Spodní: jednoduchý bar chart segmentace (1 obj | 2 obj | 3+ obj | 5+ obj)

**Implementace segmentace:**
```typescript
const usersWithOrderCounts = await prisma.user.findMany({
  select: {
    id: true,
    orders: {
      where: { paymentStatus: "PAID" },
      select: { total: true, createdAt: true },
    },
  },
});

const segments = { noOrders: 0, oneOrder: 0, twoOrders: 0, threeToFour: 0, fivePlus: 0 };
let totalSpent = 0;
let customersWithOrders = 0;

for (const user of usersWithOrderCounts) {
  const count = user.orders.length;
  const spent = user.orders.reduce((s, o) => s + o.total, 0);
  totalSpent += spent;
  if (count === 0) segments.noOrders++;
  else if (count === 1) { segments.oneOrder++; customersWithOrders++; }
  else if (count === 2) { segments.twoOrders++; customersWithOrders++; }
  else if (count <= 4) { segments.threeToFour++; customersWithOrders++; }
  else { segments.fivePlus++; customersWithOrders++; }
}

const ltv = customersWithOrders > 0 ? Math.round(totalSpent / customersWithOrders) : 0;
```

---

### SEKCE 5: Rychlé akce

**Grid tlačítek** pro nejčastější akce spojené s růstem:

| Akce | Link | Ikona |
|------|------|-------|
| Vytvořit slevový kód | `/admin/slevy/novy` | tag |
| Napsat blog článek | `/admin/blog/novy` | pencil |
| Přidat produkt | `/admin/produkty/novy` | plus |
| Spravovat recenze | `/admin/recenze` | star |
| Newsletter odběratelé | `/admin/zakaznici?filter=newsletter` | mail |
| SEO nastavení | `/admin/nastaveni?tab=seo` | search |
| Opuštěné pokladny | `/admin/opustene-pokladny` | cart |
| Zobrazit e-shop | `/` (target=_blank) | external-link |

**Vizualizace:** 4x2 grid, každé tlačítko = ikona + text, border card, hover efekt.

---

## LAYOUT STRÁNKY

```
┌─────────────────────────────────────────────────┐
│ Růst                          [?] Nápověda      │
│ Nástroje pro růst vašeho e-shopu               │
├─────────────────────────────────────────────────┤
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐│
│ │Konverze  ││Vracející ││Ø obj/zák ││Newsletter││
│ │  67 %    ││  23 %    ││  1.8     ││  142     ││
│ └──────────┘└──────────┘└──────────┘└──────────┘│
├─────────────────────────────────────────────────┤
│ SEO zdraví                     Skóre: 72/100    │
│ ┌───────────────────────────────────────────────┐│
│ │ 8 kritických · 15 upozornění · 127 v pořádku ││
│ ├───────────────────────────────────────────────┤│
│ │ Produkt          │ Problémy      │ Akce       ││
│ │ Nike Air Max     │ SEO title,... │ [Upravit]  ││
│ │ Adidas Run       │ Chybí popis   │ [Upravit]  ││
│ └───────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ Doporučení pro růst                             │
│ ┌──────────┐┌──────────┐┌──────────┐            │
│ │Opravte   ││Napište   ││Vytvořte  │            │
│ │SEO       ││blog      ││slevu     │            │
│ │[CTA →]   ││[CTA →]   ││[CTA →]   │            │
│ └──────────┘└──────────┘└──────────┘            │
├─────────────────────────────────────────────────┤
│ Zákaznická retence                              │
│ ┌──────────┐┌──────────┐┌──────────┐            │
│ │Zákazníci ││Vracející ││LTV       │            │
│ │  340     ││  23%     ││  2 450 Kč│            │
│ └──────────┘└──────────┘└──────────┘            │
│ Segmentace: [==1obj==][=2obj=][3-4][5+]         │
├─────────────────────────────────────────────────┤
│ Rychlé akce                                     │
│ [Slevový kód] [Blog článek] [Produkt] [Recenze]│
│ [Newsletter]  [SEO]         [Opuš.p.] [E-shop] │
└─────────────────────────────────────────────────┘
```

---

## SOUHRN SOUBORŮ

### Upravené soubory (1):
| Soubor | Změna | Řádky (odhad) |
|--------|-------|----------------|
| `src/app/(admin)/admin/rust/page.tsx` | Kompletní přepis placeholderu → 5 sekcí | ~350 |

### Nové soubory (0):
Žádné nové soubory. Vše v jednom Server Component souboru.

### Celkový odhad: ~350 řádků (přepis 24-řádkového placeholderu)

---

## ZÁVISLOSTI

- **AbandonedCheckout model**: Sekce 1 (konverzní přehled) může zobrazovat i míru obnovy opuštěných pokladen, ale pouze pokud je TASK-041 (Opuštěné pokladny) implementován. **Řešení:** Podmíněně — zkusit `prisma.abandonedCheckout.count()`, pokud model neexistuje, přeskočit. Nebo implementovat až po TASK-041.
- **Všechna ostatní data** (Order, User, Product, DiscountCode, NewsletterSubscriber, BlogPost, ProductReview, Category) **už existují** v DB.

## POZNÁMKY

- Stránka je **čistě read-only** — žádné server actions, žádné formuláře
- Všechny dotazy v jednom `Promise.all()` pro rychlost
- SEO audit běží na serveru při každém renderování — u 1000+ produktů může být pomalejší, ale SQLite je lokální a SELECT jen pár sloupců, takže < 100ms
- Doporučení jsou staticky podmíněná (ne ML/AI) — jednoduché if/else na základě počtů
- Stránka nepotřebuje žádný Client Component — vše je Server Component
