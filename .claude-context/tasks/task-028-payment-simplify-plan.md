# TASK-028b: Zjednodušení platby — pouze Comgate online

## Požadavek

Uživatel chce **POUZE online platbu přes Comgate**. Žádný bankovní převod, žádná dobírka.

## Aktuální stav

### Pokladna (`src/app/(public)/pokladna/page.tsx`)

**Řádky 537-596 — Sekce "4. Platba":**
- 3 radio buttony: `card` (Comgate), `transfer` (bankovní převod), `cod` (dobírka)
- `paymentMethod` state s typem `"card" | "transfer" | "cod"` (řádek 28)
- Default: `"card"` (řádek 53)

**Řádky 299-304 — Submit button label:**
```tsx
const submitLabel =
  paymentMethod === "card"
    ? "Objednat a zaplatit"
    : paymentMethod === "cod"
      ? "Objednat na dobírku"
      : "Objednat";
```

### Server action (`src/app/(public)/pokladna/actions.ts`)

**Řádek 35:** `paymentMethod: "card" | "transfer" | "cod"`

**Řádky 233-263 — Payment routing:**
- `card` → Comgate `createPayment()` → redirect na platební bránu
- `transfer`/`cod` → `status: "CONFIRMED"`, redirect na potvrzení

**Fallback (řádky 249-255):** Pokud Comgate selže, order se vytvoří jako `transfer` — to je bezpečnostní fallback, PONECHAT.

### Order konstanty (`src/lib/order-constants.ts`)

**Řádky 81-85:**
```ts
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Kartou online",
  transfer: "Bankovním převodem",
  cod: "Dobírkou",
};
```

### Emaily
- `src/lib/emails/order-confirmation.tsx` řádek 115: text o bankovním převodu
- `src/lib/emails/admin-new-order.tsx` řádek 69: rozlišení card vs bankovní převod

### Abandoned checkout tracking
- `src/app/(public)/pokladna/page.tsx` řádek 108: `paymentMethod` se odesílá do tracking

---

## IMPLEMENTAČNÍ PLÁN

### Co SMAZAT:

1. **Pokladna sekce 4 "Platba"** (řádky 537-596) — celá sekce se 3 radio buttony. Platba je vždy `card`, nepotřebujeme výběr.

2. **PaymentMethod type** (řádek 28) — smazat `type PaymentMethod = "card" | "transfer" | "cod"`

3. **paymentMethod state** (řádek 53) — smazat `const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")`

4. **submitLabel logika** (řádky 299-304) — zjednodušit na konstantu `"Objednat a zaplatit"`

### Co UPRAVIT:

1. **`src/app/(public)/pokladna/page.tsx`:**
   - Smazat celou sekci 4 (radio buttony)
   - Hardcode `paymentMethod: "card"` v `handleSubmit` → `createOrder({ ..., paymentMethod: "card" })`
   - Přečíslovat sekce: Kontakt (1), Adresa (2), Doprava (3), Sleva (4), Poznámka (5) — bez Platba
   - Submit label: konstanta `"Objednat a zaplatit"`
   - V tracking (řádek 108): hardcode `paymentMethod: "card"`

2. **`src/app/(public)/pokladna/actions.ts`:**
   - CheckoutData interface: `paymentMethod: "card"` (literal type, ne union)
   - Nebo úplně smazat `paymentMethod` z CheckoutData a hardcode `"card"` v createOrder
   - **PONECHAT** Comgate fallback na transfer (řádky 249-255) — důležité pro robustnost
   - **PONECHAT** `paymentMethod` field v Order (DB) — historické objednávky mohou mít transfer/cod

3. **`src/lib/order-constants.ts`:**
   - **PONECHAT** `transfer` a `cod` v `PAYMENT_METHOD_LABELS` — admin stále potřebuje zobrazit labely pro historické objednávky
   - Alternativně: ponechat jako je, žádná změna potřeba

4. **Emaily:**
   - `order-confirmation.tsx`: podmínka pro transfer text se nikdy netriggerne (card je default), ale **PONECHAT** pro případ Comgate fallbacku
   - `admin-new-order.tsx`: dtto — ponechat

### Co NEMĚNIT:

- DB schema — `paymentMethod String @default("card")` zůstává (historická kompatibilita)
- Order konstanty — labely pro admin zobrazení historických objednávek
- Email šablony — fallback na transfer stále možný
- Comgate integrace — beze změn

---

## PŘESNÉ ZMĚNY

### Soubor: `src/app/(public)/pokladna/page.tsx`

**1. Smazat řádek 28:**
```tsx
// SMAZAT:
type PaymentMethod = "card" | "transfer" | "cod";
```

**2. Smazat řádek 53:**
```tsx
// SMAZAT:
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
```

**3. Řádky 299-304 — zjednodušit:**
```tsx
// SMAZAT:
const submitLabel = paymentMethod === "card" ? "Objednat a zaplatit" : ...

// NAHRADIT:
const submitLabel = "Objednat a zaplatit";
```

**4. Řádek 108 — tracking:**
```tsx
// ZMĚNIT:
paymentMethod,
// NA:
paymentMethod: "card",
```

**5. Řádek 283 — handleSubmit:**
```tsx
// ZMĚNIT:
paymentMethod,
// NA:
paymentMethod: "card",
```

**6. Smazat celou sekci 4 "Platba" (řádky 537-596):**
Celý `<div className="bg-white border border-line rounded-[10px] p-6">` blok s radiem pro card/transfer/cod.

**7. Přečíslovat zbylé sekce:**
- 1. Kontaktní údaje (beze změn)
- 2. Fakturační adresa (beze změn)
- 3. Doprava (beze změn)
- 4. Slevový kód (bylo 5.)
- 5. Poznámka (bylo 6.)

### Soubor: `src/app/(public)/pokladna/actions.ts`

**Řádek 35:**
```tsx
// ZMĚNIT:
paymentMethod: "card" | "transfer" | "cod";
// NA:
paymentMethod: "card";
// NEBO ponechat union pro zpětnou kompatibilitu
```

**DOPORUČENÍ:** Ponechat union type `"card" | "transfer" | "cod"` v actions.ts — Comgate fallback může nastavit `transfer`, historické objednávky mohou mít `cod`. Backend by neměl být příliš restriktivní.

---

## KONTROLNÍ SEZNAM

### Soubory k úpravě (1):
- [ ] `src/app/(public)/pokladna/page.tsx` — smazat sekci 4 "Platba", smazat PaymentMethod type + state, hardcode "card", přečíslovat sekce

### Volitelné:
- [ ] `src/app/(public)/pokladna/actions.ts` — zúžit type (volitelné)

### Bez změn:
- `src/lib/order-constants.ts` — ponechat (admin historické objednávky)
- `src/lib/emails/*` — ponechat (Comgate fallback)
- `prisma/schema.prisma` — ponechat
- `src/lib/comgate.ts` — ponechat

### QA:
- [ ] V pokladně NENÍ sekce "Platba" — žádné radio buttony
- [ ] Submit button říká "Objednat a zaplatit"
- [ ] Po submitu → redirect na Comgate platební bránu
- [ ] Pokud Comgate selže → fallback na transfer (stále funguje)
- [ ] Admin vidí `paymentMethod: "card"` na nových objednávkách
- [ ] Historické objednávky s transfer/cod se stále správně zobrazují
- [ ] `npm run build` — žádné TS chyby

## ROZSAH

~60 řádků SMAZÁNO, ~5 řádků změněno. 1 soubor. Minimální zásah.
