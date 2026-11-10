# Plán: TASK-031 — Admin recenze + moderace

**Priorita:** 2
**Soubory k úpravě:**
- `src/components/ReviewSection.tsx` (257 řádků)
- `src/app/api/reviews/route.ts` (49 řádků)
- `src/app/(admin)/admin/recenze/actions.ts` (25 řádků)
- `src/app/(public)/produkt/[slug]/page.tsx` — ReviewSummary na produktové kartě

**Referenční soubory (READ ONLY):**
- `src/app/(admin)/admin/recenze/page.tsx` (145 řádků) — admin list
- `src/app/(admin)/admin/recenze/ReviewActions.tsx` (42 řádků) — client actions
- `prisma/schema.prisma` — ProductReview model
- `src/components/ProductCard.tsx` — product card

---

## Analýza stávajícího stavu

### Co je hotovo (85%):

1. **Admin moderace** — seznam recenzí s filtry (čeká/schváleno/všechny), approve/reject/delete funguje
2. **ReviewActions** — client component s useTransition pro akce
3. **ReviewSection** — client component na produkt detail stránce:
   - Načítá recenze přes `/api/reviews?productId=...`
   - Zobrazuje seznam recenzí s hvězdami, autorem, datem
   - **Formulář pro přidání recenze JIŽ EXISTUJE** — rating, jméno, titulek, text, submit
   - Po odeslání: "Děkujeme za recenzi! Bude zobrazena po schválení."
4. **API route** — GET (approved reviews) + POST (create review, approved=false)
5. **ReviewSummary** — exported component s průměrným hodnocením + počtem
6. **Stars + StarSelector** — vizuální komponenty

### Prisma model:
```prisma
model ProductReview {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(...)
  userId     String?
  user       User?    @relation(...)
  authorName String
  rating     Int      // 1-5
  title      String?
  content    String
  approved   Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([productId])
  @@index([approved])
  @@map("product_reviews")
}
```

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Průměrné hodnocení na produktové kartě (ProductCard) | ReviewSummary existuje, ale není v ProductCard | NÍZKÁ |
| 2 | Omezení recenze jen po nákupu | Chybí (kdokoli může recenzovat) | STŘEDNÍ |
| 3 | Email výzva k hodnocení po doručení | Chybí | STŘEDNÍ |
| 4 | Propojení recenze s přihlášeným uživatelem | userId nullable, ale nepoužívá se | NÍZKÁ |

---

## Problém 1: Průměrné hodnocení na ProductCard

### Aktuální stav:
- `ReviewSummary` component existuje, ale je client-side (volá API)
- ProductCard nemá žádné hodnocení

### Řešení — server-side rating data v product query:

**Soubor:** Tam kde se načítají produkty pro karty (např. homepage, kategorie), přidat `_count` a `_avg`:

V Prisma query pro product listing, přidat:
```tsx
include: {
  _count: {
    select: { reviews: { where: { approved: true } } }
  }
}
```

**Problém:** Prisma nepodporuje `_avg` v `include` přímo. Alternativa:

**Varianta A (jednodušší):** Přidat `avgRating Float @default(0)` a `reviewCount Int @default(0)` přímo na Product model — aktualizovat při approve/reject recenze.

**Varianta B (bez schema změny):** V API route pro reviews, vrátit rating v product listing query. Ale to by vyžadovalo N+1 query.

**Doporučená varianta A:**

**Soubor:** `prisma/schema.prisma` — Product model

```diff
model Product {
  // ...existing fields...
+ avgRating    Float  @default(0)
+ reviewCount  Int    @default(0)
  // ...
}
```

**Soubor:** `src/app/(admin)/admin/recenze/actions.ts`

Přidat recalc po approve/reject/delete:

```tsx
async function recalcProductRating(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId, approved: true },
    select: { rating: true },
  });
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await prisma.product.update({
    where: { id: productId },
    data: { avgRating: Math.round(avg * 10) / 10, reviewCount: count },
  });
}
```

V `approveReview` a `rejectReview` a `deleteReview` — po operaci zavolat recalc:

```tsx
export async function approveReview(id: string) {
  const review = await prisma.productReview.update({
    where: { id },
    data: { approved: true },
    select: { productId: true },
  });
  await recalcProductRating(review.productId);
  revalidatePath("/admin/recenze");
}
```

**Soubor:** `src/components/ProductCard.tsx`

Přidat rating pod cenu (pokud reviewCount > 0):

```tsx
{product.reviewCount > 0 && (
  <div className="flex items-center gap-1 mt-1">
    <span className="text-amber-500 text-[12px]">{"★".repeat(Math.round(product.avgRating))}</span>
    <span className="text-[11px] text-muted">({product.reviewCount})</span>
  </div>
)}
```

**Pozn.:** ProductCard props interface bude potřeba rozšířit o `avgRating?: number` a `reviewCount?: number`.

---

## Problém 2: Recenze jen po nákupu

### Aktuální stav:
- Kdokoli může napsat recenzi (žádná vazba na objednávku)
- Formulář v ReviewSection nemá žádný auth check

### Řešení — soft restriction:

Plná implementace (ověření nákupu per produkt) je komplexní a závisí na TASK-027 (auth). Pro MVP:

**Soubor:** `src/app/api/reviews/route.ts` — POST handler

Přidat volitelný `email` pole a rate-limiting:

```tsx
// Basic spam protection: max 1 review per product per email per day
if (body.email) {
  const recentReview = await prisma.productReview.findFirst({
    where: {
      productId,
      authorName: authorName.trim(),
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentReview) {
    return NextResponse.json(
      { error: "Můžete přidat jen jednu recenzi za den." },
      { status: 429 },
    );
  }
}
```

**Soubor:** `src/components/ReviewSection.tsx`

Přidat email pole do formuláře (volitelné):

```tsx
<div className="mb-4">
  <label className="block text-[13px] font-bold text-ink mb-1.5">Email</label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full h-[44px] px-4 border border-line rounded-[8px] text-[14px] text-ink focus:outline-none focus:border-navy transition-colors"
    placeholder="Pro ověření nákupu (volitelné)"
  />
</div>
```

**Plná implementace (budoucí iterace):**
- Po přihlášení: automaticky vyplnit jméno + email
- Ověřit zda uživatel zakoupil produkt (joinovat Order + OrderItem)
- Badge "Ověřený nákup" na recenzi

---

## Problém 3: Email výzva k hodnocení po doručení

### Aktuální stav:
- Objednávka má stav DELIVERED + `deliveredAt` timestamp
- Email šablony existují v `src/lib/emails/` (confirmation, shipped, cancelled, payment-received)
- **Chybí:** review invitation email

### Řešení:

**Nový soubor:** `src/lib/emails/review-invitation.tsx`

```tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr } from "@react-email/components";

interface ReviewInvitationEmailProps {
  orderNumber: string;
  firstName: string;
  items: Array<{ name: string; slug: string }>;
}

export function ReviewInvitationEmail({ orderNumber, firstName, items }: ReviewInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Jak jste spokojeni s objednávkou #{orderNumber}?</Preview>
      <Body style={{ fontFamily: "Manrope, Arial, sans-serif", backgroundColor: "#f4f4f5" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ fontSize: 22, fontWeight: 800, color: "#0B1727" }}>
            Jak jste spokojeni?
          </Heading>
          <Text style={{ fontSize: 14, color: "#666" }}>
            Dobrý den {firstName}, vaše objednávka #{orderNumber} byla doručena.
            Budeme rádi za vaše hodnocení:
          </Text>
          {items.map((item) => (
            <Button
              key={item.slug}
              href={`https://qsport.cz/produkt/${item.slug}#recenze`}
              style={{
                display: "block",
                backgroundColor: "#0B1727",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "999px",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Ohodnotit: {item.name.length > 40 ? item.name.slice(0, 40) + "..." : item.name}
            </Button>
          ))}
          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
          <Text style={{ fontSize: 12, color: "#999" }}>
            Qsport.cz — Výkon bez kompromisů
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Odeslání emailu po doručení:

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/actions.ts`

V `updateOrderStatus`, při změně na DELIVERED:

```tsx
if (newStatus === "DELIVERED") {
  await prisma.order.update({
    where: { id },
    data: { deliveredAt: new Date() },
  });

  // Send review invitation email (fire-and-forget, delay by cron/timeout)
  // Pro MVP: odeslat ihned
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: id },
    select: {
      productName: true,
      productId: true,
    },
  });

  // Fetch product slugs
  const productIds = orderItems.filter((i) => i.productId).map((i) => i.productId!);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, slug: true },
  });
  const slugMap = new Map(products.map((p) => [p.id, p.slug]));

  const items = orderItems
    .filter((i) => i.productId && slugMap.has(i.productId))
    .map((i) => ({
      name: i.productName,
      slug: slugMap.get(i.productId!)!,
    }));

  if (items.length > 0) {
    // Fire-and-forget
    import("@/lib/emails/review-invitation").then(({ ReviewInvitationEmail }) => {
      import("resend").then(({ Resend }) => {
        const resend = new Resend(process.env.RESEND_API_KEY);
        resend.emails.send({
          from: "Qsport.cz <obchod@qsport.cz>",
          to: order.email,
          subject: `Jak jste spokojeni s objednávkou #${order.orderNumber}?`,
          react: ReviewInvitationEmail({
            orderNumber: order.orderNumber,
            firstName: order.firstName,
            items,
          }),
        });
      });
    });
  }
}
```

**Pozn.:** V ideálním případě by se email odeslal s 3-denním zpožděním po doručení (aby zákazník měl čas produkt vyzkoušet). To vyžaduje cron job nebo queue — pro MVP stačí odeslat ihned při změně stavu na DELIVERED.

---

## Shrnutí implementačních kroků

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `prisma/schema.prisma` | +avgRating, +reviewCount na Product | +2 |
| 2 | `admin/recenze/actions.ts` | recalcProductRating + volat z approve/reject/delete | +25 |
| 3 | `src/components/ProductCard.tsx` | Rating display pod cenou | +6 |
| 4 | `src/app/api/reviews/route.ts` | Rate-limiting, email field | +12 |
| 5 | `src/components/ReviewSection.tsx` | Email pole ve formuláři | +10 |
| 6 | `src/lib/emails/review-invitation.tsx` | NOVÝ — email šablona | ~50 |
| 7 | `admin/objednavky/[id]/actions.ts` | Send review email on DELIVERED | +30 |

**Celkem:** ~135 řádků, 5 existujících souborů + 1 nový + schema

---

## Závislosti
- Závisí na TASK-028 (objednávky stav DELIVERED) — hotov
- Závisí na TASK-027 (auth) pro budoucí "ověřený nákup" badge
- Schema push potřeba: `npx prisma db push`
- Recalc existujících rating: jednorázový script po migraci

---

## Co je HOTOVO a nepotřebuje změny:
- Admin UI recenzí (list, filtry, approve/reject/delete)
- ReviewActions client component
- ReviewSection formulář pro přidání recenze
- Stars + StarSelector vizuální komponenty
- API GET/POST endpoint
