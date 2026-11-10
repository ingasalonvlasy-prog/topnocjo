# TASK-028: Objednávky — zákaznický tracking + admin management — Implementační plán

**Datum:** 2026-11-10
**Rozsah:** Většina je hotová, zbývá doplnit zákaznické tracking vylepšení a drobné admin úpravy

---

## Analýza aktuálního stavu

### 1) Zákaznická strana — STAV

| Položka | Stav | Soubor |
|---------|------|--------|
| Potvrzení objednávky `/objednavka/[orderNumber]` | **HOTOVO** | `src/app/(public)/objednavka/[orderNumber]/page.tsx` (223ř) |
| Status badges (stav + platba) | **HOTOVO** | page.tsx — statusLabels + paymentStatusLabels |
| Položky objednávky | **HOTOVO** | Tabulka s qty, cenami |
| Adresy (fakturační + doručovací) | **HOTOVO** | 2-col grid |
| Bankovní převod pokyny | **HOTOVO** | Číslo účtu 6424423004/5500, VS, částka |
| Platba selhala info | **HOTOVO** | paymentFailed handling |
| ClearCart po novém objednání | **HOTOVO** | ClearCartOnMount component |

| Položka | Stav | Detail |
|---------|------|--------|
| Tracking číslo + URL na zákaznické stránce | **CHYBÍ** | Admin ho může zadat, ale zákazník ho nevidí |
| Email: potvrzení objednávky | **HOTOVO** | `order-confirmation.tsx` |
| Email: objednávka odeslána | **HOTOVO** | `order-shipped.tsx` |
| Email: objednávka zrušena | **HOTOVO** | `order-cancelled.tsx` |
| Email: platba přijata | **HOTOVO** | `payment-received.tsx` |
| Email: objednávka doručena | **CHYBÍ** | Žádná šablona |
| Tracking progress vizualizace | **CHYBÍ** | Zákazník nevidí timeline |

### 2) Admin strana — STAV

| Položka | Stav | Soubor |
|---------|------|--------|
| Seznam objednávek s tabulkou | **HOTOVO** | `admin/objednavky/page.tsx` (317ř) |
| Filtry (stav, platba, datum, search) | **HOTOVO** | `OrderFilters.tsx` (114ř) |
| Quick stats (nové, čeká platba, dodavatel, k odeslání) | **HOTOVO** | page.tsx — 4 stat links |
| Detail objednávky | **HOTOVO** | `admin/objednavky/[id]/page.tsx` (493ř) |
| Položky tabulka se zdrojem (vlastní/dodavatel) | **HOTOVO** | |
| Status přechody s tlačítky | **HOTOVO** | ORDER_STATUS_TRANSITIONS |
| Tracking input (číslo + URL) | **HOTOVO** | s auto-generate URL pro Zásilkovnu/GLS |
| Admin poznámka | **HOTOVO** | textarea + save |
| Zákazník poznámka | **HOTOVO** | readonly zobrazení |
| Timeline historie | **HOTOVO** | buildTimeline s color-coded events |
| Dodavatel banner (objednat/přijmout) | **HOTOVO** | markSupplierOrdered/Received actions |
| Faktura tisk | **HOTOVO** | `/admin/objednavky/[id]/faktura/` |
| Balicí list tisk | **HOTOVO** | `/admin/objednavky/[id]/balici-list/` |
| Export CSV | **HOTOVO** | ExportOrdersButton → `/api/admin/orders/export` |
| Stránkování | **HOTOVO** | 20/stránka s pagination |
| Email při změně stavu | **HOTOVO** | shipped → email, cancelled → email |

| Položka | Stav | Detail |
|---------|------|--------|
| Hromadné akce | **CHYBÍ** | Žádné checkboxy, žádné bulk operace |
| Email po doručení | **CHYBÍ** | Při DELIVERED status se neposílá email |

### 3) Order status flow

Implementované stavy v `order-constants.ts`:
```
NEW → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                → AWAITING_SUPPLIER → PROCESSING
                → CANCELLED (z většiny stavů)
```

Email šablony existující:
- `order-confirmation.tsx` — při vytvoření
- `order-shipped.tsx` — při SHIPPED
- `order-cancelled.tsx` — při CANCELLED  
- `payment-received.tsx` — při zaplacení
- `admin-new-order.tsx` — admin notifikace

---

## Implementační kroky

### Krok 1: Tracking info na zákaznické stránce
**Soubor: `src/app/(public)/objednavka/[orderNumber]/page.tsx`**

Za status badges (řádek ~98), přidat tracking sekci pokud existuje:

```tsx
{/* Tracking info */}
{order.trackingNumber && (
  <div className="bg-wash rounded-[10px] p-5 mb-6">
    <h3 className="text-[14px] font-bold text-navy mb-2">Sledování zásilky</h3>
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-ink">
        Tracking: <span className="font-bold font-mono">{order.trackingNumber}</span>
      </span>
      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-blue hover:underline"
        >
          Sledovat zásilku
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      )}
    </div>
  </div>
)}
```

### Krok 2: Order progress vizualizace na zákaznické stránce
**Soubor: `src/app/(public)/objednavka/[orderNumber]/page.tsx`**

Přidat vizuální progress bar pod status badges. Jednoduchý stepper:

```tsx
{/* Order progress stepper */}
{order.status !== "CANCELLED" && (
  <div className="mb-8">
    <div className="flex items-center justify-between max-w-[500px] mx-auto">
      {[
        { key: "NEW", label: "Přijato" },
        { key: "CONFIRMED", label: "Potvrzeno" },
        { key: "SHIPPED", label: "Odesláno" },
        { key: "DELIVERED", label: "Doručeno" },
      ].map((step, idx, arr) => {
        const stepOrder = ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER", "SHIPPED", "DELIVERED"];
        const currentIdx = stepOrder.indexOf(order.status);
        const stepIdx = stepOrder.indexOf(step.key);
        const isActive = currentIdx >= stepIdx;
        const isCurrent = order.status === step.key || 
          (step.key === "CONFIRMED" && ["CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"].includes(order.status));
        
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${
                isActive 
                  ? "bg-navy text-white" 
                  : "bg-wash text-muted border border-line"
              }`}>
                {isActive ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`text-[11px] mt-1.5 font-medium ${isActive ? "text-navy" : "text-muted"}`}>
                {step.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${isActive ? "bg-navy" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
```

### Krok 3: Email při doručení
**Nový soubor: `src/lib/emails/order-delivered.tsx`**

Jednoduchá email šablona (podobně jako order-shipped):

```tsx
import { Html, Head, Body, Container, Section, Heading, Text, Hr, Link } from "@react-email/components";

interface OrderDeliveredProps {
  orderNumber: string;
  firstName: string;
}

export function OrderDelivered({ orderNumber, firstName }: OrderDeliveredProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f5f6", fontFamily: "'Manrope', system-ui, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: 10, padding: 32 }}>
            <Heading style={{ fontSize: 22, fontWeight: 800, color: "#0B1727", margin: "0 0 16px" }}>
              Objednávka doručena
            </Heading>
            <Text style={{ fontSize: 14, color: "#111C2E", margin: "0 0 12px" }}>
              Ahoj {firstName}, tvoje objednávka <strong>{orderNumber}</strong> byla doručena.
            </Text>
            <Text style={{ fontSize: 14, color: "#667085", margin: "0 0 12px" }}>
              Doufáme, že budeš se zbožím spokojený/á. Pokud máš jakékoliv dotazy, neváhej se na nás obrátit.
            </Text>
            <Hr style={{ borderColor: "#DCE2E8", margin: "16px 0" }} />
            <Text style={{ fontSize: 12, color: "#667085" }}>
              Qsport.cz — výkon bez kompromisů
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Krok 4: Odeslat email při DELIVERED stavu
**Soubor: `src/app/(admin)/admin/objednavky/[id]/actions.ts`**

V `updateOrderStatus` funkci, za `if (newStatus === "CANCELLED")` blok (řádek ~63), přidat:

```tsx
import { OrderDelivered } from "@/lib/emails/order-delivered";

// ... v updateOrderStatus, za cancelled blok:

if (newStatus === "DELIVERED") {
  sendEmail({
    to: order.email,
    subject: `Objednávka ${order.orderNumber} byla doručena`,
    react: OrderDelivered({
      orderNumber: order.orderNumber,
      firstName: order.firstName,
    }),
  });
}
```

### Krok 5: Hromadné akce v admin (VOLITELNÉ / ODLOŽITELNÉ)
Toto je nice-to-have. Checkboxy v tabulce + bulk status change / export by vyžadovaly přepis na "use client" nebo nový server action pattern. 

**Doporučení:** Odložit do samostatného tasku. Aktuální admin stránka funguje dobře pro jednotlivé objednávky. Hromadné akce budou potřeba až při vyšším objemu (100+ objednávek/den).

---

## Soubory k úpravě

| # | Soubor | Změny |
|---|--------|-------|
| 1 | `src/app/(public)/objednavka/[orderNumber]/page.tsx` | +tracking info sekce, +progress stepper |
| 2 | `src/lib/emails/order-delivered.tsx` | NOVÝ — email šablona pro doručení |
| 3 | `src/app/(admin)/admin/objednavky/[id]/actions.ts` | +import OrderDelivered, +DELIVERED email sending |

---

## Co NEMĚNIT (už je hotové)

- Admin objednávky seznam + filtry + stránkování + export CSV
- Admin objednávky detail + timeline + status transitions + tracking + admin poznámka
- Admin faktura + balicí list tisky
- Admin supplier ordering flow (objednat/přijmout)
- Zákaznická objednávka confirmation page (základ)
- Email šablony: confirmation, shipped, cancelled, payment-received, admin-new-order
- Order status constants + transitions
- Order creation action s emaily

---

## Pořadí implementace

1. `src/app/(public)/objednavka/[orderNumber]/page.tsx` — tracking info + progress stepper
2. `src/lib/emails/order-delivered.tsx` — nová šablona
3. `src/app/(admin)/admin/objednavky/[id]/actions.ts` — DELIVERED email
4. Build test: `npx next build`
5. Vizuální test: localhost:9999/objednavka/[existující číslo]

**Rozsah:** Malý-střední — ~80 řádků změn v 2 existujících souborech + 1 nový email soubor. Admin část je kompletní.
