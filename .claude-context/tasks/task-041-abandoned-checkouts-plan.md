# TASK-041: Opuštěné pokladny — plná implementace

## Přehled

Shopify "Abandoned checkouts" — zákazník přidá do košíku, začne checkout ale nedokončí objednávku. Systém sleduje tyto opuštěné pokladny, zobrazuje je v adminu a odesílá recovery emaily.

## Analýza aktuálního stavu

### Košík (`src/lib/cart.tsx`)
- **Client-only**, localStorage (`qsport_cart`)
- Žádná server-side persistence
- Cart data: `variantId, productId, productSlug, productName, variantTitle, price, comparePrice, photo, quantity`

### Pokladna (`src/app/(public)/pokladna/page.tsx`)
- Client Component, čte z `useCart()`
- Volá `createOrder()` server action z `pokladna/actions.ts`
- Flow: vyplní formulář → klik "Objednat" → `createOrder()` → redirect na platbu/potvrzení
- **KLÍČOVÉ:** Mezi otevřením pokladny a odesláním objednávky je "abandoned" okno

### Server action (`src/app/(public)/pokladna/actions.ts`)
- `createOrder(data: CheckoutData)` — vytvoří Order v DB, odečte sklad, pošle emaily, redirect
- CheckoutData obsahuje: email, phone, firstName, lastName, adresa, items, platba, doprava

### Emaily (`src/lib/email.ts` + `src/lib/emails/`)
- Resend API (RESEND_API_KEY)
- `sendEmail({ to, subject, react })` — fire-and-forget pattern
- Šablony: layout.tsx, order-confirmation, admin-new-order, order-shipped, order-cancelled, order-delivered, payment-received, review-invitation
- **Existující layout** (`src/lib/emails/layout.tsx`): Qsport.cz header (navy+lime), white body, gray footer

### Admin placeholder (`src/app/(admin)/admin/opustene-pokladny/page.tsx`)
- Momentálně jen "Připravujeme" placeholder text

### API routes (`src/app/api/`)
- Žádný cron job pattern zatím neexistuje
- Feed import (`/api/feeds/import/route.ts`) je nejbližší vzor pro trigger endpoint

---

## IMPLEMENTAČNÍ PLÁN

### FÁZE 1: Prisma model `AbandonedCheckout`

**Soubor:** `prisma/schema.prisma`

Přidat nový model na konec souboru (před `model AdminLog`):

```prisma
model AbandonedCheckout {
  id                 String    @id @default(cuid())
  email              String
  phone              String?
  firstName          String?
  lastName           String?
  items              String    @default("[]")   // JSON: [{variantId, productName, variantTitle, quantity, unitPrice, photo}]
  itemCount          Int       @default(0)
  subtotal           Int       @default(0)       // haléře
  shippingMethodId   String?
  paymentMethod      String?
  status             String    @default("OPEN")  // OPEN | RECOVERED | EXPIRED | EMAIL_SENT
  recoveredOrderId   String?                     // ID objednávky pokud se zákazník vrátil
  recoveryToken      String    @unique           // UUID pro recovery link
  recoveryEmailSentAt DateTime?
  recoveredAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([email])
  @@index([status])
  @@index([createdAt])
  @@index([recoveryToken])
  @@map("abandoned_checkouts")
}
```

**Po přidání:**
```bash
npx prisma db push
```

**Poznámky k modelu:**
- `items` je JSON string (stejný pattern jako Product.tags, Product.photos) — SQLite nemá JSON typ
- `recoveryToken` je UUID — slouží jako unikátní identifikátor pro recovery link v emailu
- `subtotal` v haléřích (100 = 1 Kč) — konzistentní s celým systémem
- Statusy: OPEN (nový), EMAIL_SENT (odeslán recovery email), RECOVERED (zákazník dokončil objednávku), EXPIRED (po 30 dnech automaticky)

---

### FÁZE 2: Zachycení abandoned checkout při startu pokladny

**Princip:** Když zákazník vyplní email na pokladně a začne vyplňovat formulář, uložit data na server. Pokud nedokončí objednávku do X hodin → abandoned.

**2A. Nový API endpoint: `src/app/api/checkout/track/route.ts`**

```typescript
// POST — uloží/aktualizuje abandoned checkout
// Volá se z pokladny když zákazník vyplní email (debounce 2s po blur)
// Body: { email, phone?, firstName?, lastName?, items: CartItem[], subtotal, shippingMethodId?, paymentMethod? }
// Vrací: { checkoutId, recoveryToken }
```

**Implementace:**
1. Validuj email (povinný)
2. Zkontroluj existující OPEN checkout se stejným emailem (posledních 24h) — pokud existuje, aktualizuj místo vytváření nového
3. Vygeneruj `recoveryToken` (crypto.randomUUID())
4. Ulož do DB přes `prisma.abandonedCheckout.upsert()`
5. Vrať `{ checkoutId, recoveryToken }`

**2B. Upravit pokladnu: `src/app/(public)/pokladna/page.tsx`**

Přidat tracking logiku:
1. Nový state: `checkoutId` (string | null)
2. Po blur na email inputu (s debounce 2s): zavolat `/api/checkout/track` s aktuálními daty
3. Při změně podstatných dat (items, shipping, payment) — znovu zavolat track endpoint pokud máme checkoutId
4. **Tracking nesmí blokovat UX** — fire-and-forget fetch, žádný loading state

```typescript
// Přidat do CheckoutPage:
const [checkoutId, setCheckoutId] = useState<string | null>(null);
const trackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Po blur na email:
function trackCheckout() {
  const email = formRef.current?.email?.value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  
  // Debounce
  if (trackTimeoutRef.current) clearTimeout(trackTimeoutRef.current);
  trackTimeoutRef.current = setTimeout(async () => {
    try {
      const res = await fetch("/api/checkout/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          email,
          phone: formRef.current?.phone?.value?.trim(),
          firstName: formRef.current?.firstName?.value?.trim(),
          lastName: formRef.current?.lastName?.value?.trim(),
          items: items.map(i => ({
            variantId: i.variantId,
            productName: i.productName,
            variantTitle: i.variantTitle,
            quantity: i.quantity,
            unitPrice: i.price,
            photo: i.photo,
          })),
          subtotal,
          shippingMethodId: selectedShipping || undefined,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.checkoutId) setCheckoutId(data.checkoutId);
    } catch { /* fire-and-forget */ }
  }, 2000);
}
```

Přidat `onBlur={trackCheckout}` na email input a `useRef` na form element.

**2C. Označit jako recovered při dokončení objednávky: `src/app/(public)/pokladna/actions.ts`**

Na konec `createOrder()` funkce (po vytvoření objednávky, před redirect), přidat:

```typescript
// Mark any open abandoned checkout as recovered
if (data.email) {
  await prisma.abandonedCheckout.updateMany({
    where: {
      email: data.email,
      status: { in: ["OPEN", "EMAIL_SENT"] },
    },
    data: {
      status: "RECOVERED",
      recoveredOrderId: order.id,
      recoveredAt: new Date(),
    },
  });
}
```

---

### FÁZE 3: Recovery email šablona

**Nový soubor: `src/lib/emails/abandoned-checkout.tsx`**

React Email šablona (stejný pattern jako order-confirmation.tsx):

```tsx
// Props:
interface AbandonedCheckoutEmailProps {
  firstName?: string;
  email: string;
  items: Array<{ productName: string; variantTitle: string; quantity: number; unitPrice: number; photo?: string }>;
  subtotal: number;
  recoveryUrl: string; // https://qsport.cz/pokladna?recover=TOKEN
}
```

**Obsah emailu:**
1. Header: "Zapomněli jste něco v košíku?"
2. Text: "Dobrý den{, firstName}, všimli jsme si, že jste nedokončili objednávku. Vaše položky na vás stále čekají:"
3. Seznam položek s cenami (produktName, variantTitle, quantity × unitPrice)
4. Celkem: subtotal
5. CTA tlačítko: "Dokončit objednávku" → recoveryUrl
6. Footer: "Pokud si nepřejete dostávat tyto upomínky, tento email ignorujte."

**Styl:** Konzistentní s existujícím `EmailLayout` — navy header, lime akcent, bílé body.

---

### FÁZE 4: Recovery link endpoint

**Nový soubor: `src/app/(public)/pokladna/recover/route.ts`** (nebo page.tsx)

Lepší varianta: **`src/app/(public)/pokladna/page.tsx`** — rozšířit existující pokladnu.

**Princip:** URL `https://qsport.cz/pokladna?recover=TOKEN`

V pokladně přidat:
1. Přečíst `searchParams.recover` (pokud existuje)
2. Pokud token nalezen v DB a status OPEN/EMAIL_SENT:
   - Načíst items z abandoned checkout
   - Předvyplnit košík (přidat items do localStorage cart)
   - Předvyplnit email, firstName, lastName, phone do formuláře
   - Zobrazit banner: "Vítejte zpět! Vaše položky jsou připravené."
3. Pokud token neexistuje/expired: ignorovat, normální pokladna

**Implementace v page.tsx:**
- Protože je pokladna Client Component, recovery data načteme přes nový API endpoint

**Nový endpoint: `src/app/api/checkout/recover/route.ts`**
```typescript
// GET /api/checkout/recover?token=xxx
// Vrací: { email, phone, firstName, lastName, items, subtotal } nebo 404
```

V pokladně:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("recover");
  if (!token) return;
  
  fetch(`/api/checkout/recover?token=${token}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      // Naplnit košík
      data.items.forEach(item => addItem(item));
      // Předvyplnit formulář (uložit do state)
      setRecoveryData({ email: data.email, firstName: data.firstName, ... });
    });
}, []);
```

---

### FÁZE 5: API endpoint pro odesílání recovery emailů (cron trigger)

**Nový soubor: `src/app/api/cron/abandoned-checkouts/route.ts`**

```typescript
// GET /api/cron/abandoned-checkouts?secret=CRON_SECRET
// Najde OPEN checkouty starší než 1 hodinu, odešle recovery email
// Spouštět přes Vercel Cron nebo externě každou hodinu
```

**Logika:**
1. Ověř `CRON_SECRET` (env variable) — ochrana proti unauthorized volání
2. Najdi abandoned checkouty kde:
   - `status = "OPEN"`
   - `createdAt < now() - 1 hodina` (zákazník měl dost času)
   - `createdAt > now() - 48 hodin` (neodesílat po 2 dnech — neaktuální)
   - `email IS NOT NULL`
3. Pro každý checkout:
   - Odešli recovery email přes `sendEmail()`
   - Aktualizuj status na "EMAIL_SENT", nastav `recoveryEmailSentAt`
4. Loguj výsledky přes AdminLog

**Alternativa k Vercel Cron:** API endpoint volaný externě (GitHub Actions, cron-job.org, UptimeRobot).

**Vercel cron konfigurace** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/abandoned-checkouts?secret=CRON_SECRET",
    "schedule": "0 * * * *"
  }]
}
```

**Poznámka:** Pokud `vercel.json` zatím neexistuje, vytvořit. Pokud existuje, přidat cron konfiguraci.

---

### FÁZE 6: Admin stránka — reálný obsah

**Soubor:** `src/app/(admin)/admin/opustene-pokladny/page.tsx` (přepsat placeholder)

**Layout: Server Component s 3 sekcemi:**

#### 6A. Stat karty (nahore)

4 karty (stejný pattern jako objednávky — `StatCard` component):

| Karta | Hodnota | Zdroj dat |
|-------|---------|-----------|
| Celkem opuštěných | COUNT kde status != EXPIRED, posledních 30 dní | `prisma.abandonedCheckout.count(...)` |
| Obnovených | COUNT kde status = RECOVERED, posledních 30 dní | `prisma.abandonedCheckout.count(...)` |
| Míra obnovy | (obnovených / celkem) × 100 % | vypočítat |
| Ztracená hodnota | SUM subtotal kde status = OPEN nebo EMAIL_SENT | `prisma.abandonedCheckout.aggregate(...)` |

```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const [totalCount, recoveredCount, lostValue] = await Promise.all([
  prisma.abandonedCheckout.count({
    where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "EXPIRED" } },
  }),
  prisma.abandonedCheckout.count({
    where: { createdAt: { gte: thirtyDaysAgo }, status: "RECOVERED" },
  }),
  prisma.abandonedCheckout.aggregate({
    _sum: { subtotal: true },
    where: { status: { in: ["OPEN", "EMAIL_SENT"] } },
  }),
]);

const recoveryRate = totalCount > 0 ? Math.round((recoveredCount / totalCount) * 100) : 0;
```

#### 6B. Tabulka opuštěných pokladen

Sloupce:
| Sloupec | Popis |
|---------|-------|
| Datum | `createdAt` formátované |
| Zákazník | email + firstName/lastName (pokud vyplněno) |
| Položky | itemCount + preview prvních 2 položek |
| Celkem | subtotal (formatPrice) |
| Stav | badge: OPEN (žlutý), EMAIL_SENT (modrý), RECOVERED (zelený), EXPIRED (šedý) |
| Akce | Tlačítko "Odeslat upomínku" (pokud OPEN) |

**Filtry:**
- Status tabs: Vše | Otevřené | Odeslaný email | Obnovené
- Search: podle emailu
- Paginace: 25 per page

**Server action pro manuální odeslání upomínky:**

```typescript
// src/app/(admin)/admin/opustene-pokladny/actions.ts
"use server";

export async function sendRecoveryEmail(checkoutId: string) {
  const checkout = await prisma.abandonedCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout || checkout.status === "RECOVERED" || checkout.status === "EXPIRED") {
    throw new Error("Checkout nelze obnovit.");
  }
  
  const items = JSON.parse(checkout.items);
  const recoveryUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://qsport.cz"}/pokladna?recover=${checkout.recoveryToken}`;
  
  await sendEmail({
    to: checkout.email,
    subject: "Zapomněli jste něco v košíku?",
    react: AbandonedCheckoutEmail({
      firstName: checkout.firstName || undefined,
      email: checkout.email,
      items,
      subtotal: checkout.subtotal,
      recoveryUrl,
    }),
  });
  
  await prisma.abandonedCheckout.update({
    where: { id: checkoutId },
    data: { status: "EMAIL_SENT", recoveryEmailSentAt: new Date() },
  });
  
  await logAdmin("ABANDONED_CHECKOUT_EMAIL", "AbandonedCheckout", checkoutId, `Recovery email odeslán na ${checkout.email}`);
}
```

#### 6C. Detail opuštěného checkoutu (optional — nice-to-have)

Kliknutí na řádek v tabulce zobrazí detail v modal/drawer:
- Plný seznam položek s cenami
- Kontaktní údaje (email, phone, jméno)
- Zvolená doprava a platba (pokud vyplněno)
- Timeline: vytvořeno → email odeslán → obnoveno/expirováno
- Tlačítko "Odeslat upomínku" / "Zobrazit obnovenou objednávku"

**DOPORUČENÍ:** V první verzi stačí tabulka bez detailu. Detail přidat později.

---

### FÁZE 7: Expiry cleanup

**Přidat do cron endpointu (`/api/cron/abandoned-checkouts`):**

Po odeslání recovery emailů, vyčistit staré:

```typescript
// Označit checkouty starší 30 dní jako EXPIRED
await prisma.abandonedCheckout.updateMany({
  where: {
    status: { in: ["OPEN", "EMAIL_SENT"] },
    createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  },
  data: { status: "EXPIRED" },
});
```

---

## SOUHRN SOUBORŮ

### Nové soubory (6):
| Soubor | Obsah | Řádky (odhad) |
|--------|-------|----------------|
| `src/app/api/checkout/track/route.ts` | POST — uložit/aktualizovat abandoned checkout | ~60 |
| `src/app/api/checkout/recover/route.ts` | GET — načíst recovery data pro token | ~40 |
| `src/app/api/cron/abandoned-checkouts/route.ts` | GET — cron: odesílat recovery emaily + expiry | ~80 |
| `src/lib/emails/abandoned-checkout.tsx` | React Email šablona | ~90 |
| `src/app/(admin)/admin/opustene-pokladny/actions.ts` | Server action: manuální odeslání recovery emailu | ~40 |
| `vercel.json` | Cron konfigurace (pokud neexistuje) | ~8 |

### Upravené soubory (3):
| Soubor | Změna | Řádky (odhad) |
|--------|-------|----------------|
| `prisma/schema.prisma` | Přidat model AbandonedCheckout | ~20 |
| `src/app/(public)/pokladna/page.tsx` | Tracking logika + recovery z tokenu | ~50 |
| `src/app/(public)/pokladna/actions.ts` | Označit checkout jako recovered po createOrder | ~10 |
| `src/app/(admin)/admin/opustene-pokladny/page.tsx` | Přepsat placeholder → reálná admin stránka | ~250 |

### Celkový odhad: ~650 řádků nového kódu + 1 Prisma migrace

---

## ENV PROMĚNNÉ

Přidat do `.env`:
```
CRON_SECRET=nahodny-bezpecnostni-klic-pro-cron
NEXT_PUBLIC_BASE_URL=https://qsport.cz
```

`RESEND_API_KEY` — již existuje (používáno pro ostatní emaily).

---

## POŘADÍ IMPLEMENTACE

1. **Prisma model** + `db push` — základ pro vše ostatní
2. **Track API endpoint** + změny v pokladně — začne sbírat data
3. **Recovery v createOrder** — označovat recovered checkouty
4. **Email šablona** — design recovery emailu
5. **Cron endpoint** — automatické odesílání
6. **Admin stránka** — vizualizace dat
7. **Recovery link** — umožnit zákazníkům vrátit se přes link v emailu
8. **Expiry cleanup** — úklid starých dat

Fáze 1-3 jsou kritické (bez nich nic nefunguje). Fáze 4-5 pro automatizaci. Fáze 6 pro admin. Fáze 7 pro úklid.

---

## BEZPEČNOSTNÍ POZNÁMKY

- `recoveryToken` je UUID — nelze uhodnout
- Cron endpoint chráněn `CRON_SECRET`
- Recovery email se odesílá max 1× per checkout (status OPEN → EMAIL_SENT)
- Žádné PII v URL (token je opaque identifier)
- GDPR: opuštěné checkouty expirují po 30 dnech, email se posílá jen 1×
