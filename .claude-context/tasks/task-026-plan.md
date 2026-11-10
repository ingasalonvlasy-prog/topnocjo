# TASK-026: Pokladna / checkout flow — Implementační plán

**Datum:** 2026-11-10 (aktualizace)
**Hlavní soubory:** `src/app/(public)/pokladna/page.tsx` (507ř), `src/app/(public)/pokladna/actions.ts` (245ř)

---

## Analýza aktuálního stavu

### Co funguje a NEMĚNIT:
1. **Form layout** — 6 sekcí (kontakt, adresa, doprava, platba, sleva, poznámka) + sidebar rekapitulace
2. **Shipping API** — fetch `/api/shipping`, radio select, Zásilkovna widget pro pickup_point
3. **Discount code** — validate přes `/api/discount/validate`, apply/remove
4. **Server action `createOrder`** — kompletní: ověří stock, alokuje, vytvoří objednávku, decrementuje stock, posílá emaily (OrderConfirmation + AdminNewOrder), Comgate redirect s transfer fallback
5. **Zásilkovna widget** — `ZasilkovnaWidget.tsx` funguje, loaduje Packeta script, otvírá picker
6. **Empty cart redirect** — zobrazí CTA když items.length === 0
7. **Breadcrumbs** — Domů / Košík / Pokladna
8. **Brand styling** — navy/lime/wash, Manrope, pill buttons

### Problémy k opravě:

#### P1: CHYBÍ dobírka (COD) platební metoda
- Zadání říká: kartou, bankovní převod, dobírka
- Aktuální: pouze card + transfer
- `CheckoutData` type v actions.ts už má `"cod"` v union: `"card" | "transfer" | "cod"`
- ALE v page.tsx jsou jen 2 radio options

#### P2: CHYBÍ osobní odběr handling
- Schema `ShippingMethod` má `type: "personal"` 
- Ale v UI se nezobrazuje speciální chování — pro osobní odběr nepotřebuješ adresu ani Zásilkovna widget
- Aktuálně: osobní odběr se zobrazuje jako normální doprava

#### P3: Telefon by měl být povinný
- Zásilkovna i kurýr potřebují telefon
- Aktuálně: `Telefon` bez hvězdičky, bez `required`

#### P4: Chybí hydration guard
- Stejný problém jako košík — `items` starts as `[]` z cart context
- Flash "Košík je prázdný" před načtením localStorage

#### P5: Submit button text se nemění dle platby
- Vždy "Objednat a zaplatit" — ale pro transfer/COD to nedává smysl
- Správně: card → "Objednat a zaplatit", transfer → "Objednat", cod → "Objednat (dobírka)"

#### P6: Chybí loading spinner na submit buttonu
- Jen text "Zpracovávám..." bez vizuálního indikátoru

#### P7: Sticky sidebar offset
- Stejný problém jako košík: `sticky top-[80px]` vs header 92px

#### P8: Pre-fill pro přihlášené uživatele
- `createOrder` v actions.ts volá `getCurrentUser()` a přiřazuje userId
- ALE formulář v page.tsx NE-prefilluje adresu/jméno z uživatelského profilu
- Přihlášený uživatel musí vyplňovat údaje znovu

---

## Implementační kroky

### Krok 1: Přidat dobírku (COD)
**Soubor: `src/app/(public)/pokladna/page.tsx`**

Rozšířit `paymentMethod` state type a přidat třetí radio:
```diff
-  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
+  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "cod">("card");
```

Přidat třetí radio option za transfer (řádek ~326):
```tsx
<label
  className={`flex items-center gap-4 p-4 rounded-[8px] border cursor-pointer transition-all ${
    paymentMethod === "cod" ? "border-navy bg-wash" : "border-line hover:border-muted"
  }`}
>
  <input
    type="radio"
    name="paymentMethod"
    value="cod"
    checked={paymentMethod === "cod"}
    onChange={() => setPaymentMethod("cod")}
    className="w-4 h-4 text-navy focus:ring-navy"
  />
  <div className="flex-1">
    <span className="text-[14px] font-bold text-ink">Dobírka</span>
    <p className="text-[12px] text-muted mt-0.5">Platba při převzetí zásilky</p>
  </div>
</label>
```

**Soubor: `src/app/(public)/pokladna/actions.ts`**

Za handling "card" a "transfer" (řádek ~238), přidat COD handling:
```tsx
} else if (data.paymentMethod === "cod") {
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CONFIRMED" },
  });
  redirect(`/objednavka/${order.orderNumber}?new=1`);
}
```

Aktuálně: else branch (transfer) končí `redirect()` — stačí rozšířit podmínku:
```diff
-  } else {
+  } else if (data.paymentMethod === "transfer" || data.paymentMethod === "cod") {
```

### Krok 2: Telefon povinný
**Soubor: `src/app/(public)/pokladna/page.tsx`**

```diff
-                <label className={labelCls}>Telefon</label>
-                <input name="phone" type="tel" className={inputCls} />
+                <label className={labelCls}>Telefon *</label>
+                <input name="phone" type="tel" required className={inputCls} />
```

### Krok 3: Osobní odběr handling
**Soubor: `src/app/(public)/pokladna/page.tsx`**

Když vybraná doprava má `type === "personal"`:
- Skrýt sekci "Doručovací adresa je jiná" checkbox
- V sidebar: nezobrazovat shipping address

V sekci dopravy, za Zásilkovna widget (řádek ~283):
```tsx
{/* Personal pickup info */}
{selectedMethod?.type === "personal" && (
  <div className="mt-4 pl-0 sm:pl-8">
    <div className="p-3 bg-wash rounded-lg text-[13px] text-ink">
      <p className="font-bold mb-1">Osobní odběr</p>
      {selectedMethod.description && (
        <p className="text-muted">{selectedMethod.description}</p>
      )}
    </div>
  </div>
)}
```

A skrýt "Doručovací adresa je jiná" checkbox pro personal:
```diff
-            <label className="flex items-center gap-2.5 cursor-pointer">
+            {selectedMethod?.type !== "personal" && (
+            <label className="flex items-center gap-2.5 cursor-pointer">
```
(a zavřít `)}` za label)

### Krok 4: Hydration guard
**Soubor: `src/app/(public)/pokladna/page.tsx`**

Import `loaded` z cart:
```diff
-  const { items, subtotal, clearCart } = useCart();
+  const { items, subtotal, loaded, clearCart } = useCart();
```

Před empty cart check (řádek ~65):
```tsx
if (!loaded) {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-40 bg-wash rounded" />
        <div className="h-[400px] bg-wash rounded-[10px]" />
      </div>
    </div>
  );
}
```

### Krok 5: Dynamický submit button text
**Soubor: `src/app/(public)/pokladna/page.tsx`** (řádek ~494)

```diff
-              {submitting ? "Zpracovávám..." : "Objednat a zaplatit"}
+              {submitting ? (
+                <span className="flex items-center gap-2">
+                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
+                  Zpracovávám...
+                </span>
+              ) : (
+                paymentMethod === "card" ? "Objednat a zaplatit" :
+                paymentMethod === "cod" ? "Objednat na dobírku" :
+                "Objednat"
+              )}
```

### Krok 6: Sticky sidebar offset fix
```diff
-          <div className="bg-wash rounded-[10px] p-6 sticky top-[80px]">
+          <div className="bg-wash rounded-[10px] p-6 sticky top-[100px]">
```

### Krok 7: Pre-fill pro přihlášené uživatele (VOLITELNÉ)
Toto vyžaduje serverový fetch uživatele. Protože page.tsx je "use client", potřebujeme API endpoint nebo server component wrapper.

**Přístup:** Přidat API endpoint `/api/me` který vrátí profil přihlášeného uživatele, a v page.tsx fetchnout při mount:

```tsx
useEffect(() => {
  fetch("/api/me")
    .then(r => r.ok ? r.json() : null)
    .then(user => {
      if (!user) return;
      // Pre-fill form fields if empty
      const form = document.querySelector("form");
      if (!form) return;
      const fields = { email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, street: user.street, city: user.city, zip: user.zip };
      for (const [name, value] of Object.entries(fields)) {
        if (!value) continue;
        const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
        if (input && !input.value) input.value = value;
      }
    })
    .catch(() => {});
}, []);
```

**Nový soubor: `src/app/api/me/route.ts`**
```tsx
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  return NextResponse.json(user);
}
```

**POZNÁMKA:** Toto je nice-to-have. Pokud je čas, implementovat. Jinak přeskočit — uživatel může vždy vyplnit ručně.

---

## Soubory k úpravě

| # | Soubor | Změny |
|---|--------|-------|
| 1 | `src/app/(public)/pokladna/page.tsx` | +COD radio, +telefon required, +personal pickup, +hydration guard, +dynamic submit, +sticky fix, (+prefill) |
| 2 | `src/app/(public)/pokladna/actions.ts` | +COD handling v payment routing |
| 3 | `src/app/api/me/route.ts` | NOVÝ — profil endpoint pro prefill (volitelné) |

**Závislost:** Vyžaduje TASK-025 krok 1 (`loaded` export z cart.tsx). Implementovat TASK-025 cart.tsx JAKO PRVNÍ.

---

## Pořadí implementace

1. Ověřit že `loaded` je v cart.tsx (z TASK-025)
2. `page.tsx` — hydration guard
3. `page.tsx` — COD payment radio
4. `actions.ts` — COD handling  
5. `page.tsx` — telefon required
6. `page.tsx` — personal pickup handling
7. `page.tsx` — dynamic submit text + spinner
8. `page.tsx` — sticky offset
9. (Volitelné) `/api/me` route + prefill
10. Build test: `npx next build`

**Rozsah:** Střední — ~60 řádků změn v page.tsx, ~5 řádků v actions.ts, volitelně nový API route.
