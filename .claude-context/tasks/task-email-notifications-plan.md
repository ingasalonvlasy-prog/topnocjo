# Plán: Email notifikace pro objednávky

**Status:** Ready for implementation  
**Priority:** High  
**Date:** 2026-11-08  

---

## Aktuální stav

### Co existuje
- **Žádný email setup** — v package.json není resend, nodemailer, sendgrid ani react-email
- **Žádné env proměnné** pro email (.env.local nemá RESEND/SMTP/MAIL)
- **Comgate callback** (`src/app/api/comgate/callback/route.ts`) — nastavuje paymentStatus + status, ale neposílá email
- **Checkout action** (`src/app/(public)/pokladna/actions.ts`) — vytváří objednávku, ale neposílá email
- **Admin order actions** (`src/app/(admin)/admin/objednavky/[id]/actions.ts`) — updateOrderStatus, updateTracking — bez emailů

### Brand barvy (pro šablony)
- Navy: `#0B1727`
- Lime: `#CEFF2F`
- Mint: `#DCECE4`
- Wash: `#F3F3F0`

---

## Rozhodnutí: Resend

**Proč Resend místo NodeMailer:**
- Free tier: 100 emails/den, 3000/měsíc — pro začátek e-shopu dostačující
- Nativní podpora React Email šablon (JSX → HTML)
- Jednoduchá integrace: 1 API klíč, 1 řádek `resend.emails.send()`
- Dobrá deliverability bez SMTP konfiguraci
- Snadný upgrade na placený tier (100 emails/den → 50 000/měsíc za $20)

**Proč React Email šablony:**
- Type-safe JSX komponenty
- Preview v browseru při vývoji
- Responsive email HTML automaticky
- Konzistentní styl přes sdílený layout

---

## Architektura

```
src/lib/email.ts              — Resend klient + sendOrderEmail() wrapper
src/emails/                   — React Email šablony (adresář)
  components/
    Layout.tsx                — Sdílený layout (header, footer, brand)
  OrderConfirmation.tsx       — Email #1: potvrzení objednávky
  PaymentReceived.tsx         — Email #2: platba přijata
  OrderShipped.tsx            — Email #3: objednávka odeslána
  OrderCancelled.tsx          — Email #4: objednávka zrušena
```

### Trigger body

| Email | Kdy se odešle | Kde v kódu |
|-------|---------------|------------|
| Potvrzení objednávky | Po `prisma.order.create()` | `src/app/(public)/pokladna/actions.ts` → po vytvoření objednávky |
| Platba přijata | Po Comgate PAID callbacku | `src/app/api/comgate/callback/route.ts` → po update na PAID |
| Objednávka odeslána | Po změně statusu na SHIPPED | `src/app/(admin)/admin/objednavky/[id]/actions.ts` → v `updateOrderStatus()` |
| Objednávka zrušena | Po změně statusu na CANCELLED | `src/app/(admin)/admin/objednavky/[id]/actions.ts` → v `updateOrderStatus()` |

### Email wrapper pattern

```typescript
// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Qsport.cz <objednavky@qsport.cz>";

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email:", subject);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      react,
    });
  } catch (error) {
    // Log but don't throw — email failure should never block order flow
    console.error("[email] Failed to send:", subject, error);
  }
}
```

**Důležité:** Email odesílání je fire-and-forget s try/catch. Selhání emailu NIKDY nesmí blokovat objednávkový flow.

---

## Fáze 1: Setup

### 1.1 Instalace závislostí

```bash
npm install resend @react-email/components
```

### 1.2 Env proměnné

```
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
```

Resend setup:
1. Registrace na resend.com
2. Přidat doménu qsport.cz → DNS záznamy (SPF, DKIM)
3. Vytvořit API klíč
4. Než bude doména ověřena, posílat z `onboarding@resend.dev` (testovací)

---

## Fáze 2: Sdílený layout

### `src/emails/components/Layout.tsx`

```tsx
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F3F3F0", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          {/* Header */}
          <Section style={{ backgroundColor: "#0B1727", padding: "24px", borderRadius: "8px 8px 0 0", textAlign: "center" }}>
            <Text style={{ color: "#CEFF2F", fontSize: "24px", fontWeight: "bold", margin: 0 }}>
              Qsport.cz
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ backgroundColor: "#FFFFFF", padding: "32px", borderRadius: "0 0 8px 8px" }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "24px", textAlign: "center" }}>
            <Text style={{ color: "#666", fontSize: "12px" }}>
              Qsport.cz — Sportovní vybavení
            </Text>
            <Text style={{ color: "#999", fontSize: "11px" }}>
              Tento email byl odeslán automaticky, neodpovídejte na něj.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## Fáze 3: Emailové šablony

### 3.1 Email #1: Potvrzení objednávky (`OrderConfirmation.tsx`)

**Trigger:** Po vytvoření objednávky v checkoutu  
**Příjemce:** Zákazník (order.email)  
**Předmět:** `Objednávka ${orderNumber} byla přijata`

**Obsah:**
- Děkujeme za objednávku
- Číslo objednávky (velký, výrazný)
- Tabulka položek (produkt, varianta, ks, cena)
- Mezisoučet, doprava, celkem
- Platební metoda + instrukce:
  - Karta → "Platba bude zpracována online"
  - Převod → "Zašlete platbu na účet: ..., VS: {orderNumber}"
- Doručovací adresa
- Doprava (Zásilkovna / výdejní místo)
- Odkaz na stránku objednávky: `/objednavka/{orderNumber}`

**Props:**
```typescript
interface OrderConfirmationProps {
  orderNumber: string;
  firstName: string;
  items: { productName: string; variantTitle: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  shippingPrice: number;
  shippingName: string;
  total: number;
  paymentMethod: string;
  street: string;
  city: string;
  zip: string;
  packetaPointName?: string;
}
```

### 3.2 Email #2: Platba přijata (`PaymentReceived.tsx`)

**Trigger:** Comgate callback → PAID  
**Příjemce:** Zákazník (order.email)  
**Předmět:** `Platba za objednávku ${orderNumber} přijata`

**Obsah:**
- Platba byla úspěšně přijata
- Číslo objednávky
- Zaplacená částka
- Další krok: "Vaši objednávku nyní připravujeme k odeslání"
- Odkaz na stránku objednávky

**Props:**
```typescript
interface PaymentReceivedProps {
  orderNumber: string;
  firstName: string;
  total: number;
  paidAt: string; // formatted date
}
```

### 3.3 Email #3: Objednávka odeslána (`OrderShipped.tsx`)

**Trigger:** Admin změní status na SHIPPED  
**Příjemce:** Zákazník (order.email)  
**Předmět:** `Objednávka ${orderNumber} byla odeslána`

**Obsah:**
- Objednávka byla odeslána
- Číslo objednávky
- Dopravce + tracking číslo (pokud existuje)
- Odkaz na tracking (pokud existuje trackingUrl)
- Odhadovaná doba doručení (volitelný text)
- Odkaz na stránku objednávky

**Props:**
```typescript
interface OrderShippedProps {
  orderNumber: string;
  firstName: string;
  shippingName: string;
  trackingNumber?: string;
  trackingUrl?: string;
}
```

### 3.4 Email #4: Objednávka zrušena (`OrderCancelled.tsx`)

**Trigger:** Admin změní status na CANCELLED  
**Příjemce:** Zákazník (order.email)  
**Předmět:** `Objednávka ${orderNumber} byla zrušena`

**Obsah:**
- Objednávka byla zrušena
- Číslo objednávky
- Pokud byla zaplacena (paymentStatus === "PAID"): "Platba vám bude vrácena"
- Kontakt pro dotazy
- Odkaz na e-shop

**Props:**
```typescript
interface OrderCancelledProps {
  orderNumber: string;
  firstName: string;
  total: number;
  wasPaid: boolean;
}
```

---

## Fáze 4: Integrace do existujícího kódu

### 4.1 Checkout — po vytvoření objednávky

**Soubor:** `src/app/(public)/pokladna/actions.ts`

Po `prisma.order.create()` (řádek ~123), před payment routing:

```typescript
// Send order confirmation email (fire-and-forget)
import { sendEmail } from "@/lib/email";
import { OrderConfirmation } from "@/emails/OrderConfirmation";

sendEmail({
  to: data.email,
  subject: `Objednávka ${orderNumber} byla přijata`,
  react: OrderConfirmation({
    orderNumber,
    firstName: data.firstName,
    items: orderItems,
    subtotal,
    shippingPrice,
    shippingName: shippingMethod.name,
    total,
    paymentMethod: data.paymentMethod,
    street: data.street,
    city: data.city,
    zip: data.zip,
    packetaPointName: data.packetaPointName || undefined,
  }),
});
```

**Pozn:** Nečekáme na await — email jde na pozadí, neblokuje redirect.

### 4.2 Comgate callback — po zaplacení

**Soubor:** `src/app/api/comgate/callback/route.ts`

Po `prisma.order.update()` s PAID statusem (řádek ~32):

```typescript
import { sendEmail } from "@/lib/email";
import { PaymentReceived } from "@/emails/PaymentReceived";

// ... po update ...
sendEmail({
  to: order.email,
  subject: `Platba za objednávku ${order.orderNumber} přijata`,
  react: PaymentReceived({
    orderNumber: order.orderNumber,
    firstName: order.firstName,
    total: order.total,
    paidAt: new Date().toLocaleDateString("cs-CZ"),
  }),
});
```

### 4.3 Admin actions — po změně statusu

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/actions.ts`

V `updateOrderStatus()`, po `prisma.order.update()`:

```typescript
import { sendEmail } from "@/lib/email";
import { OrderShipped } from "@/emails/OrderShipped";
import { OrderCancelled } from "@/emails/OrderCancelled";

// Po update...
if (newStatus === "SHIPPED") {
  const updatedOrder = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { shipping: true },
  });
  sendEmail({
    to: updatedOrder.email,
    subject: `Objednávka ${updatedOrder.orderNumber} byla odeslána`,
    react: OrderShipped({
      orderNumber: updatedOrder.orderNumber,
      firstName: updatedOrder.firstName,
      shippingName: updatedOrder.shipping.name,
      trackingNumber: updatedOrder.trackingNumber || undefined,
      trackingUrl: updatedOrder.trackingUrl || undefined,
    }),
  });
}

if (newStatus === "CANCELLED") {
  sendEmail({
    to: order.email,
    subject: `Objednávka ${order.orderNumber} byla zrušena`,
    react: OrderCancelled({
      orderNumber: order.orderNumber,
      firstName: order.firstName,
      total: order.total,
      wasPaid: order.paymentStatus === "PAID",
    }),
  });
}
```

---

## Fáze 5: Admin notifikace (bonus)

Volitelně: posílat email adminovi při nové objednávce.

```typescript
// V checkout action, po odeslání zákaznického emailu:
sendEmail({
  to: "info@qsport.cz", // nebo z env: ADMIN_EMAIL
  subject: `[Nová objednávka] ${orderNumber} — ${formatPrice(total)}`,
  react: AdminNewOrder({ orderNumber, total, customerName: `${data.firstName} ${data.lastName}` }),
});
```

---

## Pořadí implementace

| # | Fáze | Soubory | Složitost |
|---|------|---------|-----------|
| 1 | Setup: install, env, `src/lib/email.ts` | 1 nový | Nízká |
| 2 | Sdílený layout | `src/emails/components/Layout.tsx` | Nízká |
| 3 | 4 emailové šablony | `src/emails/*.tsx` (4 nové) | Střední |
| 4 | Integrace do checkout | `src/app/(public)/pokladna/actions.ts` (edit) | Nízká |
| 5 | Integrace do Comgate callback | `src/app/api/comgate/callback/route.ts` (edit) | Nízká |
| 6 | Integrace do admin actions | `src/app/(admin)/admin/objednavky/[id]/actions.ts` (edit) | Nízká |

**Implementovat v pořadí: 1 → 2 → 3 → 4+5+6**

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `package.json` | **EDIT** — přidat `resend`, `@react-email/components` |
| `.env.local` | **EDIT** — přidat `RESEND_API_KEY` |
| `src/lib/email.ts` | **NOVÝ** — Resend klient + sendEmail wrapper |
| `src/emails/components/Layout.tsx` | **NOVÝ** — sdílený email layout |
| `src/emails/OrderConfirmation.tsx` | **NOVÝ** — šablona potvrzení |
| `src/emails/PaymentReceived.tsx` | **NOVÝ** — šablona platba přijata |
| `src/emails/OrderShipped.tsx` | **NOVÝ** — šablona odesláno |
| `src/emails/OrderCancelled.tsx` | **NOVÝ** — šablona zrušeno |
| `src/app/(public)/pokladna/actions.ts` | **EDIT** — přidat email po vytvoření |
| `src/app/api/comgate/callback/route.ts` | **EDIT** — přidat email po PAID |
| `src/app/(admin)/admin/objednavky/[id]/actions.ts` | **EDIT** — přidat email po SHIPPED/CANCELLED |

---

## Klíčové principy

1. **Fire-and-forget** — email selhání nikdy neblokuje objednávkový flow
2. **Graceful degradation** — bez RESEND_API_KEY se jen loguje warning, aplikace funguje normálně
3. **Konzistentní branding** — Navy/Lime/Mint přes sdílený Layout
4. **Jednoduché šablony** — inline CSS (email klienty nepodporují external CSS)
5. **Čeština** — všechny texty v emailech česky, datum cs-CZ locale
