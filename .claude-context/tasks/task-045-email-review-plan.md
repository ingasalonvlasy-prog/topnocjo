# TASK-045: Review + vylepšení transaktních emailů

**Datum:** 2026-11-14
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ ANALÝZA

---

## 1. PŘEHLED EMAILOVÝCH ŠABLON

### Existující šablony (7 souborů v `src/lib/emails/`):

| # | Šablona | Soubor | Řádků | Trigger |
|---|---------|--------|-------|---------|
| 1 | Potvrzení objednávky | `order-confirmation.tsx` | 151 | Checkout action (pokladna/actions.ts:176) |
| 2 | Platba přijata | `payment-received.tsx` | 66 | Comgate callback (api/comgate/callback/route.ts:38) |
| 3 | Objednávka odeslána | `order-shipped.tsx` | 83 | Admin status → SHIPPED (actions.ts:52-63) |
| 4 | Objednávka doručena | `order-delivered.tsx` | 56 | Admin status → DELIVERED (actions.ts:96-104) |
| 5 | Objednávka zrušena | `order-cancelled.tsx` | 69 | Admin status → CANCELLED (actions.ts:135-146) |
| 6 | Výzva k hodnocení | `review-invitation.tsx` | 50 | Po DELIVERED (actions.ts:107-132) |
| 7 | Admin notifikace | `admin-new-order.tsx` | 143 | Checkout action (pokladna/actions.ts:198) |

### Layout: `layout.tsx` (54 řádků)
- Header: Navy #0B1727 s "Qsport.cz" v Lime #CEFF2F
- Content: bílé pozadí, padding 32px 28px
- Footer: "Sportovní vybavení", auto-email upozornění, odhlášení newsletteru

---

## 2. AUDIT KAŽDÉ ŠABLONY

### 2.1 Order Confirmation (`order-confirmation.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav s křestním jménem
- ✅ Číslo objednávky v boxu
- ✅ Seznam položek (jméno, varianta × množství, cena)
- ✅ Mezisoučet + doprava + celkem
- ✅ Platební info (karta/převod)
- ✅ Doručení (dopravce + výdejní místo + adresa)
- ✅ CTA "Zobrazit objednávku"

**CHYBÍ:**
1. **Sleva** — `discountCode` a `discountAmount` se nepředávají do šablony
   - Aktuální props NEMAJÍ `discountCode` ani `discountAmount`
   - V checkout action (pokladna/actions.ts:176-194) se discount data nepředávají
   - Zákazník vidí "Celkem" ale nevidí kolik ušetřil
2. **DPH řádek** — admin detail ukazuje DPH 21%, email ne
3. **Doručovací adresa** — pokud `differentShipping`, email ukazuje fakturační, ne doručovací
   - Props mají jen `street`, `city`, `zip` — chybí shipping varianty
4. **COD (dobírka)** — text říká jen "kartou" nebo "převodem", ale schema má `paymentMethod: "card" | "transfer" | "cod"`
5. **Datum objednávky** — chybí, zákazník neví kdy objednal
6. **Telefonní číslo** — chybí v souhrnu (pro rychlý kontakt kurýra)

**HODNOCENÍ:** 7/10 — solidní základ, chybí discount + COD + doručovací adresa

### 2.2 Payment Received (`payment-received.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav
- ✅ Číslo objednávky v zeleném boxu
- ✅ Částka + datum zaplacení
- ✅ Info o dalším kroku (připravujeme k odeslání)
- ✅ CTA "Zobrazit objednávku"

**CHYBÍ:**
1. ~~Nic kritického~~ — tento email je informativní, stručnost je OK
2. **Nice-to-have:** Odhadovaný datum odeslání

**HODNOCENÍ:** 9/10 — stručný a účelný, OK

### 2.3 Order Shipped (`order-shipped.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav
- ✅ "Vaše objednávka byla odeslána a je na cestě k Vám!"
- ✅ Číslo objednávky v purple boxu
- ✅ Dopravce + tracking číslo
- ✅ CTA "Sledovat zásilku" (pokud tracking URL) NEBO "Zobrazit objednávku"

**CHYBÍ:**
1. **Seznam položek** — zákazník neví CO je na cestě (musí kliknout na odkaz)
2. **Doručovací adresa / výdejní místo** — zákazník neví KAM to jede
3. **Odhadované doručení** — "2-4 pracovní dny" nebo konkrétní range

**HODNOCENÍ:** 6/10 — chybí klíčové info (co + kam + kdy)

### 2.4 Order Delivered (`order-delivered.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav
- ✅ "Úspěšně doručena"
- ✅ Číslo objednávky v zeleném boxu
- ✅ Kontakt pro dotazy
- ✅ CTA "Zobrazit objednávku"

**CHYBÍ:**
1. ~~Nic kritického~~ — krátký email, funguje jako trigger pro review-invitation
2. **Nice-to-have:** Link na hodnocení přímo zde (místo separátního emailu)

**HODNOCENÍ:** 8/10 — OK, review invitation jde hned po tomto

### 2.5 Order Cancelled (`order-cancelled.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav
- ✅ "Vaše objednávka byla zrušena"
- ✅ Číslo objednávky v červeném boxu + částka
- ✅ Info o vrácení peněz (pokud zaplaceno)
- ✅ Kontakt email
- ✅ CTA zpět na web

**CHYBÍ:**
1. ~~Nic kritického~~

**HODNOCENÍ:** 9/10 — kompletní

### 2.6 Review Invitation (`review-invitation.tsx`)

**Aktuální obsah:**
- ✅ Pozdrav
- ✅ Info o doručení + číslo objednávky
- ✅ Seznam produktů s CTA tlačítky (max 5)
- ✅ Poděkování

**CHYBÍ:**
1. ~~Nic kritického~~

**HODNOCENÍ:** 9/10 — dobře navrženo

### 2.7 Admin New Order (`admin-new-order.tsx`)

**Aktuální obsah:**
- ✅ "Nová objednávka" heading
- ✅ Číslo objednávky v purple boxu
- ✅ Zákazník: jméno, email, telefon, platební metoda
- ✅ Supplier warning banner
- ✅ Položky s cenami
- ✅ Mezisoučet + doprava + celkem
- ✅ CTA do administrace

**CHYBÍ:**
1. **Sleva** — stejně jako order-confirmation, discount chybí
2. **Adresa** — admin nevidí kam poslat (ani fakturační ani doručovací)

**HODNOCENÍ:** 7/10 — chybí discount + adresa

---

## 3. LAYOUT — SPOLEČNÉ PROBLÉMY

### 3.1 Footer

**Aktuální (layout.tsx:36-48):**
```
Qsport.cz — Sportovní vybavení
Tento email byl odeslán automaticky, neodpovídejte na něj.
Odhlásit z newsletteru
```

**Problémy:**
1. **"Neodpovídejte na něj"** — nefriendly, zákazník by měl moci odpovědět
   - Řešení: `FROM: "Qsport.cz <objednavky@qsport.cz>"` → zachovat, ale text změnit na "Máte dotaz? Odpovězte na tento email."
   - Nebo: odebrat varování úplně
2. **"Odhlásit z newsletteru"** — transaktní emaily NESMÍ mít unsubscribe (legislativa)
   - Transaktní emaily jsou povinné (potvrzení objednávky, tracking)
   - Newsletter unsubscribe patří POUZE do marketingových emailů
   - **SMAZAT** tento řádek z layoutu
3. **Chybí firemní údaje** — IČO, adresa sídla (povinné pro e-shop emaily v ČR)

### 3.2 Branding

**Aktuální:** Navy header s lime textem — OK, konzistentní s webem.

**Vylepšení:**
- Logo místo textu "Qsport.cz" (pokud existuje SVG/PNG)
- Drobný brand accent pod header

---

## 4. KONKRÉTNÍ NÁVRHY ZMĚN

### 4.1 PRIORITA 1 — Order Confirmation (potvrzení objednávky)

**Soubor:** `src/lib/emails/order-confirmation.tsx`

**Přidat props:**
```ts
interface OrderConfirmationProps {
  orderNumber: string;
  firstName: string;
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;      // NOVÉ
  discountAmount?: number;     // NOVÉ
  shippingPrice: number;
  shippingName: string;
  total: number;
  paymentMethod: string;
  street: string;
  city: string;
  zip: string;
  shippingStreet?: string;     // NOVÉ — doručovací adresa
  shippingCity?: string;       // NOVÉ
  shippingZip?: string;        // NOVÉ
  shippingName2?: string;      // NOVÉ — jméno příjemce (pokud jiný)
  pickupPointName?: string;
  phone?: string;              // NOVÉ
  createdAt?: string;          // NOVÉ — datum objednávky
  viewToken?: string;
}
```

**Přidat do template:**

1. **Datum objednávky** — pod číslo objednávky v boxu:
```tsx
<Text style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>
  {createdAt}
</Text>
```

2. **Sleva** — mezi mezisoučet a doprava:
```tsx
{discountAmount && discountAmount > 0 && (
  <Row>
    <Column>
      <Text style={{ fontSize: "13px", color: "#16a34a", margin: "4px 0" }}>
        Sleva{discountCode && ` (${discountCode})`}
      </Text>
    </Column>
    <Column style={{ textAlign: "right" }}>
      <Text style={{ fontSize: "13px", color: "#16a34a", fontWeight: "bold", margin: "4px 0" }}>
        -{formatPrice(discountAmount)}
      </Text>
    </Column>
  </Row>
)}
```

3. **DPH řádek:**
```tsx
<Row>
  <Column>
    <Text style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>
      vč. DPH 21%
    </Text>
  </Column>
  <Column style={{ textAlign: "right" }}>
    <Text style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>
      {formatPrice(Math.round(total * 0.1736))}
    </Text>
  </Column>
</Row>
```

4. **COD platba:**
```tsx
{paymentMethod === "card"
  ? "Platba kartou online — zpracováváme Vaši platbu."
  : paymentMethod === "cod"
    ? "Platba dobírkou — zaplatíte při převzetí zásilky."
    : "Platba bankovním převodem — po připsání platby objednávku potvrdíme."}
```

5. **Doručovací adresa (pokud jiná):**
```tsx
{(shippingStreet || pickupPointName) && (
  <>
    <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
      Doručovací adresa
    </Text>
    {shippingName2 && (
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>{shippingName2}</Text>
    )}
    {pickupPointName ? (
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {shippingName} — {pickupPointName}
      </Text>
    ) : (
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {shippingStreet}, {shippingZip} {shippingCity}
      </Text>
    )}
  </>
)}
```

**Aktualizovat checkout action** (`src/app/(public)/pokladna/actions.ts` řádky 176-194):

```ts
sendEmail({
  to: data.email,
  subject: `Objednávka ${orderNumber} byla přijata`,
  react: OrderConfirmation({
    orderNumber,
    firstName: data.firstName,
    items: orderItems,
    subtotal,
    discountCode: discountCodeStr || undefined,     // NOVÉ
    discountAmount: discountAmount || undefined,     // NOVÉ
    shippingPrice,
    shippingName: shippingMethod.name,
    total,
    paymentMethod: data.paymentMethod,
    street: data.street,
    city: data.city,
    zip: data.zip,
    shippingStreet: data.differentShipping ? data.shippingStreet || undefined : undefined,  // NOVÉ
    shippingCity: data.differentShipping ? data.shippingCity || undefined : undefined,      // NOVÉ
    shippingZip: data.differentShipping ? data.shippingZip || undefined : undefined,        // NOVÉ
    shippingName2: data.differentShipping ? data.shippingName || undefined : undefined,     // NOVÉ
    pickupPointName: data.pickupPointName || undefined,
    phone: data.phone || undefined,                 // NOVÉ
    createdAt: new Date().toLocaleDateString("cs-CZ", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    }),                                             // NOVÉ
    viewToken,
  }),
});
```

### 4.2 PRIORITA 2 — Order Shipped (objednávka odeslána)

**Soubor:** `src/lib/emails/order-shipped.tsx`

**Přidat props:**
```ts
interface OrderShippedProps {
  orderNumber: string;
  firstName: string;
  shippingName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  viewToken?: string;
  items?: Array<{ name: string; quantity: number }>;  // NOVÉ
  pickupPointName?: string;                            // NOVÉ
  deliveryAddress?: string;                            // NOVÉ — "Vinohradská 42, 120 00 Praha"
}
```

**Přidat do template (za tracking box, před CTA):**

1. **Co je na cestě:**
```tsx
{items && items.length > 0 && (
  <>
    <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
      Co je na cestě
    </Text>
    {items.map((item, i) => (
      <Text key={i} style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>
        {item.quantity}× {item.name}
      </Text>
    ))}
  </>
)}
```

2. **Kam to jede:**
```tsx
{(pickupPointName || deliveryAddress) && (
  <>
    <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
      Doručení
    </Text>
    <Text style={{ fontSize: "13px", color: "#555", margin: "0" }}>
      {pickupPointName ? `${shippingName} — ${pickupPointName}` : deliveryAddress}
    </Text>
  </>
)}
```

**Aktualizovat actions.ts** (admin objednavky/[id]/actions.ts, SHIPPED blok řádky 47-63):

```ts
// Fetch items for email
const orderItems = await prisma.orderItem.findMany({
  where: { orderId },
  select: { productName: true, quantity: true },
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
    viewToken: updatedOrder.viewToken || undefined,
    items: orderItems.map(i => ({ name: i.productName, quantity: i.quantity })),  // NOVÉ
    pickupPointName: updatedOrder.pickupPointName || undefined,                   // NOVÉ
    deliveryAddress: updatedOrder.shippingStreet                                  // NOVÉ
      ? `${updatedOrder.shippingStreet}, ${updatedOrder.shippingZip} ${updatedOrder.shippingCity}`
      : `${updatedOrder.street}, ${updatedOrder.zip} ${updatedOrder.city}`,
  }),
});
```

### 4.3 PRIORITA 3 — Admin New Order (admin notifikace)

**Soubor:** `src/lib/emails/admin-new-order.tsx`

**Přidat props:**
```ts
interface AdminNewOrderProps {
  // ... existující ...
  discountCode?: string;     // NOVÉ
  discountAmount?: number;   // NOVÉ
  street: string;            // NOVÉ — fakturační
  city: string;              // NOVÉ
  zip: string;               // NOVÉ
  pickupPointName?: string;  // NOVÉ
}
```

**Přidat do template:**

1. **Sleva** (stejný pattern jako order-confirmation)
2. **Adresa** za customer info box:
```tsx
<Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
  Adresa
</Text>
<Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
  {street}, {zip} {city}
</Text>
{pickupPointName && (
  <Text style={{ fontSize: "13px", color: "#555", margin: "0" }}>
    Výdejní místo: {pickupPointName}
  </Text>
)}
```

**Aktualizovat checkout action** (pokladna/actions.ts:198-215):
```ts
sendEmail({
  to: adminEmail,
  subject: `Nová objednávka ${orderNumber}`,
  react: AdminNewOrder({
    // ... existující ...
    discountCode: discountCodeStr || undefined,    // NOVÉ
    discountAmount: discountAmount || undefined,   // NOVÉ
    street: data.street,                           // NOVÉ
    city: data.city,                               // NOVÉ
    zip: data.zip,                                 // NOVÉ
    pickupPointName: data.pickupPointName || undefined, // NOVÉ
  }),
});
```

### 4.4 PRIORITA 4 — Layout fix (footer)

**Soubor:** `src/lib/emails/layout.tsx`

**Změnit footer (řádky 36-48):**

```tsx
{/* Footer */}
<Section style={{ padding: "20px", textAlign: "center" as const }}>
  <Text style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>
    Qsport.cz — Sportovní vybavení
  </Text>
  <Text style={{ color: "#999", fontSize: "11px", margin: "0 0 4px" }}>
    Máte dotaz? Odpovězte na tento email nebo nás kontaktujte na info@qsport.cz
  </Text>
  <Text style={{ color: "#999", fontSize: "11px", margin: 0 }}>
    Qsport.cz | IČO: XXXXXXXX
  </Text>
</Section>
```

**Změny:**
1. **SMAZAT** "Neodpovídejte na něj" → nahradit "Máte dotaz? Odpovězte..."
2. **SMAZAT** "Odhlásit z newsletteru" link — transaktní emaily NESMÍ mít unsubscribe
3. **Přidat** IČO (doplní se reálné číslo)

---

## 5. SOUHRN ZMĚN PO SOUBORECH

| Soubor | Akce | Rozsah |
|--------|------|--------|
| `order-confirmation.tsx` | Přidat discount, DPH, COD, doručovací adresa, datum, telefon | +40 řádků, ~6 nových props |
| `order-shipped.tsx` | Přidat seznam položek, doručovací adresa | +25 řádků, ~3 nové props |
| `admin-new-order.tsx` | Přidat discount, adresa | +15 řádků, ~5 nových props |
| `layout.tsx` | Fix footer (smazat unsubscribe, přidat IČO) | ±5 řádků |
| `payment-received.tsx` | Beze změn | — |
| `order-delivered.tsx` | Beze změn | — |
| `order-cancelled.tsx` | Beze změn | — |
| `review-invitation.tsx` | Beze změn | — |
| `pokladna/actions.ts` | Předat nové props do OrderConfirmation + AdminNewOrder | +15 řádků |
| `admin/objednavky/[id]/actions.ts` | Předat nové props do OrderShipped (items, adresa) | +10 řádků |
| **Celkem** | | ~110 řádků nového kódu |

---

## 6. FÁZOVÁNÍ

### Fáze 1 — Layout fix + Order Confirmation (jeden commit)
1. `layout.tsx` — footer fix
2. `order-confirmation.tsx` — discount, DPH, COD, doručovací adresa, datum
3. `pokladna/actions.ts` — předat nové props

### Fáze 2 — Shipped email + Admin email (jeden commit)
1. `order-shipped.tsx` — items, adresa
2. `admin-new-order.tsx` — discount, adresa
3. `actions.ts` — předat nové props

### Fáze 3 — Nice-to-have (volitelné)
- Odhadované doručení v shipped emailu
- Logo místo textu v headeru
- Delivered email + review combined (jeden email místo dvou)

---

## 7. KONTROLNÍ SEZNAM

- [ ] `layout.tsx` — smazat unsubscribe link, smazat "neodpovídejte", přidat IČO
- [ ] `order-confirmation.tsx` — přidat discountCode/Amount, DPH, COD text, doručovací adresa, datum, telefon
- [ ] `pokladna/actions.ts` — předat discountCode, discountAmount, shipping address, phone, createdAt
- [ ] `order-shipped.tsx` — přidat items list, pickupPointName, deliveryAddress
- [ ] `admin/objednavky/[id]/actions.ts` — předat items, adresa do OrderShipped
- [ ] `admin-new-order.tsx` — přidat discount, adresa, výdejní místo
- [ ] `pokladna/actions.ts` — předat discount, adresa do AdminNewOrder
- [ ] `npm run build` — žádné TS chyby
- [ ] Test: objednat s kartou → email s položkami, cenami, adresou
- [ ] Test: objednat s převodem → jiný platební text
- [ ] Test: objednat s dobírkou → "zaplatíte při převzetí"
- [ ] Test: objednat se slevou → sleva viditelná v emailu
- [ ] Test: jiná doručovací adresa → obě adresy v emailu
- [ ] Test: SHIPPED → email obsahuje seznam položek + kam to jede

---

## 8. CELKOVÉ HODNOCENÍ

**Stávající emaily jsou solidní základ** — branding konzistentní, react-email clean, Resend funguje.

**Hlavní mezery:**
1. Order confirmation chybí discount (zákazník nevidí kolik ušetřil) — **KRITICKÉ**
2. Shipped email chybí CO a KAM — **DŮLEŽITÉ**
3. Layout footer má unsubscribe na transaktních emailech — **LEGISLATIVNÍ BUG**
4. Admin email chybí adresa — **DŮLEŽITÉ**

**Po implementaci:** Všechny emaily budou kompletní a profesionální. Žádné nové šablony nejsou potřeba — stačí rozšířit existující.
