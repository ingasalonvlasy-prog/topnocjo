# TASK-029: Admin Order Timeline + Email Integrace + Interní komentáře s @mentions

**Datum:** 2026-11-12
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ ANALÝZA

---

## 1. AKTUÁLNÍ STAV — AUDIT

### 1.1 Order detail page (`src/app/(admin)/admin/objednavky/[id]/page.tsx`)

**756 řádků.** RSC (server component). Layout: 3-sloupcový grid (2/3 hlavní + 1/3 sidebar).

**Aktuální sekce (levý sloupec):**
1. Header — číslo objednávky + badges (payment, fulfillment) + akční tlačítka
2. Plnění (fulfillment) — dopravce, dodavatel, deadline, výdejní místo
3. Položky — thumbnaily, SKU, source badge, finanční souhrn
4. Ekonomika objednávky — nákupní cena, marže, zdroj položek
5. Supplier banner — pokud vyžaduje dodavatele
6. **Admin poznámka** — textarea s ukládáním (jednoduchá, žádné komentáře)
7. Poznámka zákazníka — read-only
8. **Historie** — základní timeline z DB polí (createdAt, paidAt, supplierOrderedAt, shippedAt, deliveredAt, cancelledAt)

**Aktuální sekce (pravý sidebar):**
- Stav (s transition buttony)
- Platba (metoda, Comgate ID, datum)
- Doprava (carrier, cena, pickup point)
- Tracking (číslo + URL formulář)
- Zákazník (jméno, email, telefon, počet objednávek)
- Riziko objednávky
- Fakturační adresa
- Doručovací adresa

### 1.2 Aktuální timeline (`buildTimeline` funkce, řádky 74-96)

**Jednoduché pole eventů konstruované z DB polí:**
```ts
interface TimelineEvent {
  date: Date;
  label: string;
  color: string;
}
```

Generuje max 7 eventů z Date polí na Order modelu. **Omezení:**
- Žádné komentáře/poznámky
- Žádné emaily
- Žádné detaily (kdo změnil, na co, proč)
- Žádná stavová historize — jen snapshoty (paidAt, shippedAt...)
- Chybí: tracking přidán, sleva aplikována, admin note upravena

### 1.3 Admin actions (`src/app/(admin)/admin/objednavky/[id]/actions.ts`)

**5 server actions (220 řádků):**
- `updateOrderStatus` — změní stav, loguje do AdminLog, odesílá emaily (shipped/delivered/cancelled)
- `updateTracking` — tracking číslo + URL, auto-generuje URL pro Zásilkovnu/GLS
- `updateAdminNote` — uloží adminNote na Order
- `markSupplierOrdered` — nastaví supplierOrderedAt + status
- `markSupplierReceived` — nastaví supplierReceivedAt + status

**Emaily odesílané z actions:**
- SHIPPED → `OrderShipped` email + Zásilkovna packet creation
- DELIVERED → `OrderDelivered` email + `ReviewInvitation` email
- CANCELLED → `OrderCancelled` email

**Všechny akce volají `logAdminAction()`** — ale to jde do `AdminLog`, ne do order-specific timeline.

### 1.4 AdminLog model (`prisma/schema.prisma:381-392`)

```prisma
model AdminLog {
  id        String   @id @default(cuid())
  action    String
  entity    String
  entityId  String?
  detail    String?
  createdAt DateTime @default(now())
}
```

**Generický log pro celý admin.** Nemá:
- Referenci na Order (jen entityId string)
- Typ eventu (jen generic action string)
- Uživatele (kdo provedl akci)
- Email data (subject, template, recipient)

### 1.5 Email systém (`src/lib/email.ts`)

**Resend API.** Fire-and-forget pattern:
- `sendEmail({ to, subject, react })` — žádný return value, žádné ukládání
- Chybí: email ID od Resend, status tracking, uložení do DB
- 9 email šablon existuje (order-confirmation, shipped, delivered, cancelled, payment-received, review-invitation, abandoned-checkout, password-reset, admin-new-order)

### 1.6 Co odesílá emaily a kdy

| Trigger | Email | Soubor |
|---------|-------|--------|
| Nová objednávka | OrderConfirmation → zákazník | pokladna/actions.ts |
| Nová objednávka | AdminNewOrder → admin | pokladna/actions.ts |
| Comgate platba přijata | PaymentReceived → zákazník | api/comgate/callback/route.ts |
| Status → SHIPPED | OrderShipped → zákazník | objednavky/[id]/actions.ts |
| Status → DELIVERED | OrderDelivered → zákazník | objednavky/[id]/actions.ts |
| Status → DELIVERED | ReviewInvitation → zákazník | objednavky/[id]/actions.ts |
| Status → CANCELLED | OrderCancelled → zákazník | objednavky/[id]/actions.ts |
| Opuštěná pokladna | AbandonedCheckout → zákazník | api/cron/abandoned-checkouts + admin action |

---

## 2. NAVRHOVANÝ SYSTÉM

### 2.1 Nový DB model: `OrderEvent`

```prisma
model OrderEvent {
  id        String   @id @default(cuid())
  orderId   String
  type      String   // "status_change" | "payment" | "email_sent" | "email_failed" | "comment" | "tracking" | "note" | "supplier" | "system"
  title     String   // "Stav změněn na Odesláno" | "Email odeslán: Potvrzení objednávky"
  detail    String?  // JSON string — rozšiřitelný payload
  userId    String?  // kdo provedl (null = systém)
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_events")
}
```

**`detail` JSON struktura podle typu:**

```ts
// type: "status_change"
{ from: "NEW", to: "CONFIRMED" }

// type: "payment"
{ status: "PAID", method: "card", transId: "ABC123", amount: 189900 }

// type: "email_sent"
{ emailType: "order-confirmation", to: "jan@email.cz", subject: "Objednávka Q2024001 přijata", resendId: "abc-123" }

// type: "email_failed"
{ emailType: "order-shipped", to: "jan@email.cz", error: "Resend API timeout" }

// type: "comment"
{ text: "Zákazník volal, chce změnit adresu.", internal: true }

// type: "tracking"
{ trackingNumber: "GLS123456", trackingUrl: "https://..." }

// type: "note"
{ text: "Pozor na křehké zboží" }

// type: "supplier"
{ action: "ordered" | "received" }

// type: "system"
{ action: "zasilkovna_packet_created", packetId: "12345" }
```

### 2.2 Order model — přidat relaci

```prisma
model Order {
  // ... existující pole ...
  events  OrderEvent[]  // PŘIDAT
}
```

### 2.3 Helper: `logOrderEvent()`

**Nový soubor:** `src/lib/order-events.ts`

```ts
import { prisma } from "./db";

export type OrderEventType =
  | "status_change"
  | "payment"
  | "email_sent"
  | "email_failed"
  | "comment"
  | "tracking"
  | "note"
  | "supplier"
  | "system";

interface LogEventParams {
  orderId: string;
  type: OrderEventType;
  title: string;
  detail?: Record<string, unknown>;
  userId?: string;
}

export async function logOrderEvent({ orderId, type, title, detail, userId }: LogEventParams) {
  return prisma.orderEvent.create({
    data: {
      orderId,
      type,
      title,
      detail: detail ? JSON.stringify(detail) : null,
      userId: userId || null,
    },
  });
}
```

### 2.4 Email tracking — rozšířit `sendEmail()`

**Soubor:** `src/lib/email.ts`

```ts
interface SendEmailParams {
  to: string;
  subject: string;
  react: ReactElement;
  // NOVÉ — volitelné, pro tracking
  orderId?: string;
  emailType?: string;
}

export async function sendEmail({ to, subject, react, orderId, emailType }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", subject);
    if (orderId && emailType) {
      logOrderEvent({
        orderId,
        type: "email_failed",
        title: `Email neodeslán: ${subject}`,
        detail: { emailType, to, error: "RESEND_API_KEY not set" },
      });
    }
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: FROM, to, subject, react });

    if (orderId && emailType) {
      logOrderEvent({
        orderId,
        type: "email_sent",
        title: `Email odeslán: ${subject}`,
        detail: {
          emailType,
          to,
          subject,
          resendId: result.data?.id || null,
        },
      });
    }
  } catch (error) {
    console.error("[email] Failed to send:", subject, error);
    if (orderId && emailType) {
      logOrderEvent({
        orderId,
        type: "email_failed",
        title: `Email selhal: ${subject}`,
        detail: {
          emailType,
          to,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
```

**Klíčové:** `sendEmail()` zůstává fire-and-forget, ale teď ukládá výsledek do OrderEvent. `orderId` je volitelný — emaile bez objednávky (password reset) ho nepotřebují.

---

## 3. IMPLEMENTAČNÍ PLÁN

### FÁZE 1: DB schema + OrderEvent model

#### 3.1 Přidat OrderEvent model do schema

**Soubor:** `prisma/schema.prisma`

Přidat za OrderItem model:
```prisma
model OrderEvent {
  id        String   @id @default(cuid())
  orderId   String
  type      String
  title     String
  detail    String?
  userId    String?
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_events")
}
```

Přidat relaci do Order modelu:
```prisma
model Order {
  // ... existující pole ...
  events             OrderEvent[]  // PŘIDAT (za items)
}
```

Spustit: `npx prisma db push`

#### 3.2 Vytvořit `src/lib/order-events.ts`

Helper funkce `logOrderEvent()` — viz sekce 2.3.

### FÁZE 2: Napojit existující akce na OrderEvent

#### 3.2.1 Rozšířit `sendEmail()` o tracking

**Soubor:** `src/lib/email.ts`

Přidat `orderId` a `emailType` parametry. Logovat výsledek do OrderEvent. Viz sekce 2.4.

#### 3.2.2 Upravit pokladna/actions.ts — logovat vytvoření objednávky + emaily

**Soubor:** `src/app/(public)/pokladna/actions.ts`

Po vytvoření objednávky (řádek 162):
```ts
// Log order creation event
logOrderEvent({
  orderId: order.id,
  type: "system",
  title: "Objednávka vytvořena",
  detail: { orderNumber, total, paymentMethod: data.paymentMethod },
});
```

Upravit `sendEmail()` volání (řádky 176-194, 196-215) — přidat `orderId` a `emailType`:
```ts
sendEmail({
  to: data.email,
  subject: `Objednávka ${orderNumber} byla přijata`,
  react: OrderConfirmation({ ... }),
  orderId: order.id,          // NOVÉ
  emailType: "order-confirmation",  // NOVÉ
});
```

#### 3.2.3 Upravit objednavky/[id]/actions.ts — logovat status change + emaily

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/actions.ts`

V `updateOrderStatus` (po řádku 34):
```ts
logOrderEvent({
  orderId,
  type: "status_change",
  title: `Stav změněn: ${ORDER_STATUS_LABELS[currentStatus]} → ${ORDER_STATUS_LABELS[newStatus]}`,
  detail: { from: currentStatus, to: newStatus },
  // TODO: userId z session (viz Fáze 3)
});
```

V email volání přidat `orderId` + `emailType` parametry.

V `updateTracking` (po řádku 166):
```ts
logOrderEvent({
  orderId,
  type: "tracking",
  title: trackingNumber ? `Tracking přidán: ${trackingNumber}` : "Tracking odebrán",
  detail: { trackingNumber, trackingUrl },
});
```

V `updateAdminNote` (po řádku 178):
```ts
logOrderEvent({
  orderId,
  type: "note",
  title: "Admin poznámka upravena",
  detail: { text: adminNote || "" },
});
```

V `markSupplierOrdered` a `markSupplierReceived`:
```ts
logOrderEvent({
  orderId,
  type: "supplier",
  title: "Objednáno od dodavatele", // nebo "Zboží přijato od dodavatele"
  detail: { action: "ordered" },    // nebo "received"
});
```

#### 3.2.4 Upravit Comgate callback — logovat platbu

**Soubor:** `src/app/api/comgate/callback/route.ts`

Po úspěšné platbě (řádek 35):
```ts
logOrderEvent({
  orderId: order.id,
  type: "payment",
  title: "Platba přijata",
  detail: { status: "PAID", method: order.paymentMethod, transId, amount: order.total },
});
```

Po zrušení (řádek 57):
```ts
logOrderEvent({
  orderId: order.id,
  type: "payment",
  title: "Platba zrušena",
  detail: { status: "CANCELLED", transId },
});
```

Přidat `orderId` a `emailType` do `sendEmail()` pro PaymentReceived.

### FÁZE 3: Timeline UI na order detail page

#### 3.3.1 Načítat OrderEvent z DB

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx`

Přidat do Prisma query (řádek 109-116):
```ts
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: true,
    shipping: true,
    user: { select: { id: true, email: true, firstName: true, lastName: true } },
    events: {                    // NOVÉ
      orderBy: { createdAt: "desc" },
    },
  },
});
```

#### 3.3.2 Nahradit starou timeline novou

**Smazat:** `buildTimeline()` funkci (řádky 74-96) + `TimelineEvent` interface (68-72).

**Nahradit sekci "Historie" (řádky 532-554):**

```tsx
{/* Timeline — Shopify-style */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h2 className="font-semibold text-gray-900 mb-4">Časová osa</h2>

  {/* Comment form */}
  <form action={addComment} className="mb-6">
    <input type="hidden" name="orderId" value={order.id} />
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
        A
      </div>
      <div className="flex-1">
        <textarea
          name="text"
          rows={2}
          placeholder="Přidat komentář..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Přidat komentář
          </button>
        </div>
      </div>
    </div>
  </form>

  {/* Events list */}
  <div className="space-y-0 border-l-2 border-gray-200 ml-4">
    {order.events.map((event) => (
      <OrderTimelineItem key={event.id} event={event} />
    ))}
  </div>
</div>
```

#### 3.3.3 Timeline item komponenta

**Nový soubor:** `src/app/(admin)/admin/objednavky/[id]/timeline-item.tsx`

```tsx
import { formatDateTime } from "./utils";

interface TimelineItemProps {
  event: {
    id: string;
    type: string;
    title: string;
    detail: string | null;
    createdAt: Date;
    userId: string | null;
  };
}

const EVENT_ICONS: Record<string, { bg: string; icon: string }> = {
  status_change: { bg: "bg-blue-500", icon: "arrows" },
  payment: { bg: "bg-green-500", icon: "card" },
  email_sent: { bg: "bg-purple-500", icon: "mail" },
  email_failed: { bg: "bg-red-500", icon: "mail-x" },
  comment: { bg: "bg-gray-700", icon: "chat" },
  tracking: { bg: "bg-indigo-500", icon: "truck" },
  note: { bg: "bg-yellow-500", icon: "pencil" },
  supplier: { bg: "bg-orange-500", icon: "package" },
  system: { bg: "bg-gray-400", icon: "cog" },
};

export function OrderTimelineItem({ event }: TimelineItemProps) {
  const config = EVENT_ICONS[event.type] || EVENT_ICONS.system;
  const detail = event.detail ? JSON.parse(event.detail) : null;

  return (
    <div className="flex gap-3 pl-4 py-3 relative">
      {/* Dot */}
      <div className={`absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full ${config.bg} ring-2 ring-white`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-900">
            {event.type === "comment" && detail?.text ? (
              <span className="whitespace-pre-wrap">{detail.text}</span>
            ) : (
              event.title
            )}
          </p>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {formatDateTime(event.createdAt)}
          </span>
        </div>

        {/* Email detail — "Zobrazit email" button */}
        {event.type === "email_sent" && detail && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>→ {detail.to}</span>
            {detail.resendId && (
              <span className="font-mono text-gray-400">#{detail.resendId.slice(0, 8)}</span>
            )}
          </div>
        )}

        {/* Payment detail */}
        {event.type === "payment" && detail && (
          <div className="mt-1 text-xs text-gray-500">
            {detail.transId && <span className="font-mono">Comgate: {detail.transId}</span>}
          </div>
        )}

        {/* Status change detail */}
        {event.type === "status_change" && detail && (
          <div className="mt-1 text-xs text-gray-500">
            {detail.from} → {detail.to}
          </div>
        )}

        {/* Tracking detail */}
        {event.type === "tracking" && detail?.trackingUrl && (
          <a href={detail.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-blue-600 hover:text-blue-800">
            Sledovat zásilku →
          </a>
        )}
      </div>
    </div>
  );
}
```

### FÁZE 4: Interní komentáře (server action)

#### 3.4.1 Nová server action: `addComment`

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/actions.ts`

```ts
export async function addComment(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!text) return;

  // TODO: userId z session pro identifikaci autora
  await logOrderEvent({
    orderId,
    type: "comment",
    title: "Interní komentář",
    detail: { text, internal: true },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

#### 3.4.2 Smazat starou admin note sekci

Aktuální "Admin poznámka" sekce (řádky 503-522) používá `adminNote` field na Order. Tuto sekci **NAHRADIT** komentáři v timeline. Starý `adminNote` field v DB ponechat pro zpětnou kompatibilitu, ale nové poznámky jdou přes komentáře.

**Alternativa (bezpečnější):** Ponechat admin note jako quick-edit field v sidebaru (pravý sloupec) — pro krátkou pinned note. Komentáře v timeline jsou pro diskuzi/historii.

**DOPORUČENÍ:** Ponechat admin note v sidebaru (přesunout z hlavního sloupce). Timeline komentáře jsou navíc.

#### 3.4.3 @Mentions v komentářích + notifikace

**UPŘESNĚNÍ OD UŽIVATELE:** Komentáře mají podporovat @mentions jiných adminů s notifikací (jako Shopify "Zanechte komentář").

**Jak to funguje:**
1. Admin píše komentář a napíše `@jmeno` — frontend nabídne autocomplete z User modelu (role = "admin")
2. Po odeslání komentáře se @mention parsuje na backendu
3. Zmíněný admin dostane email notifikaci: "Byli jste zmíněni v objednávce #Q2024001"

**Detekce @mentions:**
```ts
function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g);
  return matches ? matches.map(m => m.slice(1)) : [];
}
```

**Rozšířit `addComment` action:**
```ts
export async function addComment(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const text = (formData.get("text") as string)?.trim();
  if (!text) return;

  const currentUser = await getCurrentUser();

  await logOrderEvent({
    orderId,
    type: "comment",
    title: "Interní komentář",
    detail: {
      text,
      internal: true,
      authorName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Admin",
      authorId: currentUser?.id || null,
    },
  });

  // Parse @mentions and send notifications
  const mentions = extractMentions(text);
  if (mentions.length > 0) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const mentionedUsers = await prisma.user.findMany({
      where: {
        role: "admin",
        OR: [
          { firstName: { in: mentions } },
          { email: { in: mentions.map(m => m.includes("@") ? m : `${m}@%`) } },
        ],
      },
    });

    for (const user of mentionedUsers) {
      if (user.email && user.id !== currentUser?.id) {
        sendEmail({
          to: user.email,
          subject: `Zmínka v objednávce ${order.orderNumber}`,
          react: MentionNotification({
            orderNumber: order.orderNumber,
            orderId: order.id,
            mentionedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Admin",
            commentText: text,
          }),
          orderId,
          emailType: "mention-notification",
        });
      }
    }
  }

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

**Nová email šablona:** `src/lib/emails/mention-notification.tsx`
```tsx
export function MentionNotification({ orderNumber, orderId, mentionedBy, commentText }: {
  orderNumber: string; orderId: string; mentionedBy: string; commentText: string;
}) {
  return (
    <EmailLayout preview={`${mentionedBy} vás zmínil v objednávce ${orderNumber}`}>
      <Text>Dobrý den,</Text>
      <Text><strong>{mentionedBy}</strong> vás zmínil v komentáři k objednávce <strong>{orderNumber}</strong>:</Text>
      <Section style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "6px", margin: "16px 0" }}>
        <Text style={{ fontStyle: "italic" }}>{commentText}</Text>
      </Section>
      <Link href={`https://qsport.cz/admin/objednavky/${orderId}`}>
        Zobrazit objednávku
      </Link>
    </EmailLayout>
  );
}
```

**Frontend autocomplete (volitelné, Fáze 4b):**
- Comment textarea s `@` trigger → dropdown s admin uživateli
- Vyžaduje client component + API route `/api/admin/users` pro seznam adminů
- Pro MVP stačí plain text `@jméno` bez autocomplete — backend naparsuje

**DOPORUČENÍ:** Fáze 4 = plain text mentions s email notifikací. Fáze 4b (volitelné) = autocomplete UI.

### FÁZE 5: Admin email posílání z objednávky

#### 3.5.1 Custom email z objednávky

**Nová server action:** `sendCustomEmail`

```ts
export async function sendCustomEmail(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!subject || !body) throw new Error("Předmět a text jsou povinné.");

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  await sendEmail({
    to: order.email,
    subject,
    react: CustomAdminEmail({ subject, body, orderNumber: order.orderNumber }),
    orderId,
    emailType: "admin-custom",
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

#### 3.5.2 Email formulář v UI

**Přidat do header sekce (vedle "Faktura", "Balicí list"):**

```tsx
<button
  onClick={() => setShowEmailForm(true)}
  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
>
  <MailIcon /> Poslat email
</button>
```

**POZOR:** Page je RSC — email formulář musí být client component. Řešení: vyextrahovat jako `<SendEmailButton orderId={order.id} email={order.email} orderNumber={order.orderNumber} />` client component s dialog/modal.

#### 3.5.3 Nová email šablona: `CustomAdminEmail`

**Nový soubor:** `src/lib/emails/admin-custom-email.tsx`

```tsx
export function CustomAdminEmail({ subject, body, orderNumber }: {
  subject: string;
  body: string;
  orderNumber: string;
}) {
  return (
    <EmailLayout preview={subject}>
      <Text style={{ fontSize: "14px", color: "#555", whiteSpace: "pre-wrap" }}>
        {body}
      </Text>
      <Hr />
      <Text style={{ fontSize: "12px", color: "#999" }}>
        Objednávka: {orderNumber}
      </Text>
    </EmailLayout>
  );
}
```

---

## 4. MIGRACE EXISTUJÍCÍCH DAT

### 4.1 Seed historických eventů

Po vytvoření `OrderEvent` tabulky vytvořit seed script, který pro existující objednávky vytvoří základní eventy z Date polí:

```ts
// Jednorázový script
const orders = await prisma.order.findMany();
for (const order of orders) {
  const events = [];
  events.push({ orderId: order.id, type: "system", title: "Objednávka vytvořena", createdAt: order.createdAt });
  if (order.paidAt) events.push({ orderId: order.id, type: "payment", title: "Platba přijata", createdAt: order.paidAt });
  if (order.shippedAt) events.push({ orderId: order.id, type: "status_change", title: "Odesláno", createdAt: order.shippedAt });
  if (order.deliveredAt) events.push({ orderId: order.id, type: "status_change", title: "Doručeno", createdAt: order.deliveredAt });
  if (order.cancelledAt) events.push({ orderId: order.id, type: "status_change", title: "Zrušeno", createdAt: order.cancelledAt });
  if (order.supplierOrderedAt) events.push({ orderId: order.id, type: "supplier", title: "Objednáno od dodavatele", createdAt: order.supplierOrderedAt });
  if (order.supplierReceivedAt) events.push({ orderId: order.id, type: "supplier", title: "Zboží přijato od dodavatele", createdAt: order.supplierReceivedAt });

  await prisma.orderEvent.createMany({ data: events });
}
```

**POZN:** Toto je jednorázové. Nové objednávky budou mít eventy automaticky.

### 4.2 AdminNote migrace

Existující `adminNote` na objednávkách převést na komentáře:

```ts
const ordersWithNotes = await prisma.order.findMany({ where: { adminNote: { not: null } } });
for (const order of ordersWithNotes) {
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: "note",
      title: "Admin poznámka (migrováno)",
      detail: JSON.stringify({ text: order.adminNote }),
      createdAt: order.updatedAt,
    },
  });
}
```

---

## 5. UX DESIGN

### 5.1 Timeline layout (Shopify-style)

```
┌─────────────────────────────────────────────┐
│ Časová osa                                   │
│                                              │
│ [A] ┌─────────────────────────────┐          │
│     │ Přidat komentář...          │          │
│     └─────────────────────────────┘          │
│                          [Přidat komentář]   │
│                                              │
│ ──────────────────────────────────────────── │
│                                              │
│ ● Email odeslán: Objednávka odeslána  12:34 │
│   → jan@email.cz  #abc12345                 │
│                                              │
│ ● Stav změněn: Připravuje se → Odesláno     │
│   PROCESSING → SHIPPED              12:33   │
│                                              │
│ ● Tracking přidán: GLS123456         12:30  │
│   Sledovat zásilku →                         │
│                                              │
│ ● Interní komentář                   10:15  │
│   Zákazník volal, chce doručit v pátek.      │
│                                              │
│ ● Platba přijata                     09:22  │
│   Comgate: TR-123456                         │
│                                              │
│ ● Objednávka vytvořena              09:20   │
│                                              │
└─────────────────────────────────────────────┘
```

### 5.2 Event barevné kódování

| Typ | Barva dot | Popis |
|-----|-----------|-------|
| status_change | Blue | Změna stavu objednávky |
| payment | Green | Platba přijata/zrušena |
| email_sent | Purple | Email úspěšně odeslán |
| email_failed | Red | Email selhal |
| comment | Gray-700 | Interní komentář |
| tracking | Indigo | Tracking číslo přidáno |
| note | Yellow | Admin poznámka |
| supplier | Orange | Dodavatelská akce |
| system | Gray-400 | Systémová událost |

### 5.3 Admin note → sidebar

Přesunout admin note do pravého sidebaru (pod "Zákazník"):

```
┌──────────────────────┐
│ POZNÁMKA             │
│ ┌──────────────────┐ │
│ │ Pozor na křehké  │ │
│ │ zboží            │ │
│ └──────────────────┘ │
│ [Uložit poznámku]    │
└──────────────────────┘
```

Toto je quick-access pinned note. Timeline komentáře jsou pro historii/diskuzi.

---

## 6. PŘESNÉ ZMĚNY — PO SOUBORECH

### 6.1 `prisma/schema.prisma`

1. Přidat `OrderEvent` model (viz 2.1)
2. Přidat `events OrderEvent[]` do Order modelu (za `items`)

### 6.2 `src/lib/order-events.ts` (NOVÝ)

- `logOrderEvent()` funkce (viz 2.3)
- Export typů

### 6.3 `src/lib/email.ts`

- Přidat `orderId?` a `emailType?` parametry
- Import `logOrderEvent`
- Logovat úspěch/selhání emailu do OrderEvent
- Zachovat fire-and-forget pattern (logování do DB je async ale neblokující)

### 6.4 `src/app/(public)/pokladna/actions.ts`

- Import `logOrderEvent`
- Po `prisma.order.create()`: logovat "Objednávka vytvořena"
- Přidat `orderId` + `emailType` do obou `sendEmail()` volání

### 6.5 `src/app/api/comgate/callback/route.ts`

- Import `logOrderEvent`
- Po platbě: logovat "Platba přijata" nebo "Platba zrušena"
- Přidat `orderId` + `emailType` do `sendEmail()` pro PaymentReceived

### 6.6 `src/app/(admin)/admin/objednavky/[id]/actions.ts`

- Import `logOrderEvent`
- `updateOrderStatus`: logovat status_change event + přidat orderId/emailType do emailů
- `updateTracking`: logovat tracking event
- `updateAdminNote`: logovat note event
- `markSupplierOrdered`: logovat supplier event
- `markSupplierReceived`: logovat supplier event
- **NOVÁ action:** `addComment` — přidat komentář do timeline

### 6.7 `src/app/(admin)/admin/objednavky/[id]/page.tsx`

- Přidat `events` do Prisma include
- Smazat `buildTimeline()` a `TimelineEvent` interface
- Smazat staré timeline rendering (řádky 532-554)
- Nahradit novou timeline s komentářovým formulářem
- Přesunout "Admin poznámka" do sidebaru (přidat jako nová karta v pravém sloupci)
- Import `OrderTimelineItem` z timeline-item.tsx

### 6.8 `src/app/(admin)/admin/objednavky/[id]/timeline-item.tsx` (NOVÝ)

- Timeline item komponenta (viz 3.3.3)
- Barevné kódování podle typu eventu
- Detaily zobrazené podmíněně

### 6.9 `src/lib/emails/admin-custom-email.tsx` (NOVÝ, FÁZE 5)

- Jednoduchá šablona pro custom admin emaily

### 6.10 Client component pro email dialog (FÁZE 5)

- `src/app/(admin)/admin/objednavky/[id]/send-email-button.tsx` (NOVÝ)
- Dialog s subject + body textarea
- Volá `sendCustomEmail` server action

---

## 7. SOUBORY BEZ ZMĚN

- `src/lib/order-constants.ts` — beze změn
- `src/lib/zasilkovna.ts` — beze změn
- `src/lib/comgate.ts` — beze změn
- Všechny existující email šablony — beze změn
- `src/lib/admin-log.ts` — ponechat (generic admin log zůstává pro jiné entity)
- Public-facing order pages — beze změn

---

## 8. RIZIKA A EDGE CASES

### 8.1 Performance — velký počet eventů

Objednávka s mnoha akcemi může mít 20+ eventů. Query `orderBy: { createdAt: "desc" }` s indexem `[orderId, createdAt]` je efektivní. Žádné stránkování potřeba (objednávka nemá 1000+ eventů).

### 8.2 Resend API — email ID

Resend `emails.send()` vrací `{ data: { id: "..." } }`. Tento ID umožňuje pozdější kontrolu statusu přes Resend API. Pro MVP stačí uložit ID do eventu. Budoucí rozšíření: webhook pro delivery/bounce status.

### 8.3 Fire-and-forget vs await

`sendEmail()` je fire-and-forget (neblokuje order flow). `logOrderEvent()` uvnitř `sendEmail()` je taky async. **Řešení:** Celý email+log chain je fire-and-forget — pokud logování selže, order flow pokračuje.

### 8.4 RSC vs Client component

Order detail page je RSC. Comment formulář funguje přes form action (server action) — žádný client JS potřeba. Email dialog (Fáze 5) vyžaduje client component s `"use client"`.

### 8.5 Admin user identification

Aktuálně `logOrderEvent` nemá `userId`. Budoucí rozšíření: `requireAdmin()` vrátí user, předat do `logOrderEvent()`. Pro MVP stačí `userId: null` (= admin).

### 8.6 Zpětná kompatibilita

Starý `buildTimeline()` generoval eventy z Date polí. Po migraci (seed script) jsou tyto eventy v DB. `buildTimeline()` se smaže, ale data zůstávají. Objednávky vytvořené po nasazení budou mít eventy automaticky.

---

## 9. KONTROLNÍ SEZNAM

### Fáze 1 — DB + helper:
- [ ] Přidat `OrderEvent` model do schema
- [ ] Přidat `events` relaci do Order
- [ ] `npx prisma db push`
- [ ] Vytvořit `src/lib/order-events.ts`

### Fáze 2 — Napojení na akce:
- [ ] Rozšířit `sendEmail()` o orderId/emailType tracking
- [ ] `pokladna/actions.ts` — logovat vytvoření + emaily
- [ ] `comgate/callback` — logovat platbu + email
- [ ] `objednavky/[id]/actions.ts` — logovat status, tracking, note, supplier + emaily

### Fáze 3 — Timeline UI:
- [ ] Nová `timeline-item.tsx` komponenta
- [ ] Nahradit starou timeline na order detail page
- [ ] Přidat `events` do Prisma include query
- [ ] Přesunout admin note do sidebaru

### Fáze 4 — Komentáře s @mentions:
- [ ] `addComment` server action s `extractMentions()` parserem
- [ ] Comment formulář v timeline UI (s author name)
- [ ] `mention-notification.tsx` email šablona
- [ ] Email notifikace pro @zmíněné adminy
- [ ] (Volitelné 4b) Autocomplete UI pro @mentions

### Fáze 5 — Custom email z admin (volitelné):
- [ ] `admin-custom-email.tsx` šablona
- [ ] `sendCustomEmail` server action
- [ ] Client component s dialog
- [ ] Tlačítko "Poslat email" v headeru

### Migrace:
- [ ] Seed script pro historické eventy z Date polí
- [ ] AdminNote migrace do eventů (volitelné)

### QA:
- [ ] Timeline zobrazuje eventy chronologicky (nejnovější nahoře)
- [ ] Status change se loguje s from/to detailem
- [ ] Odeslaný email se zobrazí v timeline s recipient + subject
- [ ] Selhání emailu se loguje jako `email_failed`
- [ ] Komentář se přidá a zobrazí okamžitě (revalidate)
- [ ] Admin note funguje v sidebaru
- [ ] Build check: `npm run build` — žádné TS chyby
- [ ] Historické objednávky mají seeded eventy

---

## 10. SOUHRN

| Co | Rozsah |
|----|--------|
| **DB schema** | 1 nový model (OrderEvent), 1 relace |
| **order-events.ts** | ~30 řádků (nový helper) |
| **email.ts** | ~20 řádků změnit (tracking) |
| **pokladna/actions.ts** | ~15 řádků přidat (logging) |
| **comgate/callback** | ~10 řádků přidat (logging) |
| **objednavky/[id]/actions.ts** | ~40 řádků přidat (logging + addComment) |
| **objednavky/[id]/page.tsx** | ~60 řádků smazat (stará timeline), ~40 řádků přidat (nová timeline + comment form) |
| **timeline-item.tsx** | ~80 řádků (nový soubor) |
| **admin-custom-email.tsx** | ~25 řádků (nový, Fáze 5) |
| **send-email-button.tsx** | ~60 řádků (nový client component, Fáze 5) |
| **Seed script** | ~30 řádků (jednorázový) |
| **Celkem** | ~300 řádků nového/upraveného kódu |

**Doporučený postup:**
1. **Fáze 1+2** (základ): DB model + helper + napojení na akce → 1 commit
2. **Fáze 3+4** (UI): Timeline + komentáře → 1 commit
3. **Fáze 5** (email): Custom email z admin → 1 commit (volitelné)
4. **Migrace**: Seed script po nasazení Fáze 1+2
