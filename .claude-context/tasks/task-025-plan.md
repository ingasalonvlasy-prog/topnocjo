# TASK-025: Košík polish + UX — Implementační plán

**Datum:** 2026-11-10 (aktualizace)
**Soubory k úpravě:** `src/app/(public)/kosik/page.tsx`, `src/lib/cart.tsx`, `src/components/AddToCartButton.tsx`, `src/components/ProductCard.tsx`

---

## Analýza aktuálního stavu

### Co funguje a NEMĚNIT:
1. **localStorage persistence** — `src/lib/cart.tsx` má `loadCart()` / `saveCart()` s `STORAGE_KEY = "qsport_cart"`, CartProvider načítá při mount + ukládá při změně items. HOTOVO.
2. **Přidání/odebrání/množství** — `addItem`, `updateQuantity` (auto-remove při qty<=0), `removeItem`. MAX_QTY = 10. HOTOVO.
3. **Prázdný stav** — custom empty state s ikonou, textem, CTA "Pokračovat v nákupu". Odpovídá brand briefu.
4. **Celková cena** — subtotal + estimated shipping + total. HOTOVO.
5. **Free shipping progress bar** — 2000 Kč threshold, lime progress bar. HOTOVO.
6. **Odkaz na pokladnu** — lime CTA → /pokladna. HOTOVO.
7. **Responsivita** — grid 1col mobile, 2col (1fr + 380px) desktop. HOTOVO.
8. **CartProvider** v `src/app/(public)/layout.tsx` wraps Header+main+Footer. HOTOVO.
9. **Header badge** — lime badge s itemCount. HOTOVO.

### Problémy k opravě:

#### P1: Chybí hydration guard (flash prázdného košíku)
- Cart state starts as `[]`, hydrates from localStorage after mount
- Uživatel vidí flash "Košík je prázdný" před načtením
- `cart.tsx` má `loaded` state ale NEEXPORTUJE ho

#### P2: Minus na qty=1 tiše odebere položku
- `updateQuantity(id, 0)` → filter removes item, bez jakéhokoliv vizuálního varování
- UX: uživatel nechtěně ztratí položku

#### P3: Chybí comparePrice (přeškrtnutá cena) v košíku
- `CartItem` interface nemá `comparePrice` field
- Slevové produkty v košíku nezobrazují původní cenu ani úsporu
- ProductCard a AddToCartButton comparePrice nepředávají do addItem

#### P4: Chybí unit price při qty > 1
- Při qty=2 vidí jen total (2x cena), ne "2 × 1 990 Kč"

#### P5: Malé obrázky
- 80x80 je malé pro sportovní produkty na desktopu

#### P6: Accessibility
- Qty +/- a X buttons bez aria-labels

#### P7: Drobné textové nesoulady s brand briefem
- "Zatím tu nic není. Mrkni, co máme nového." → brief říká "Zatím tu nic není. Mrkni na novinky."

#### P8: Sticky sidebar offset
- `sticky top-[80px]` ale header = 32px (top bar) + 60px (main) = 92px
- Sidebar se překrývá s headerem

---

## Implementační kroky (přesné diff instrukce)

### Krok 1: Export `loaded` z cart.tsx + hydration guard

**Soubor: `src/lib/cart.tsx`**

Přidat `loaded` do CartContextValue interface (řádek ~16):
```diff
 interface CartContextValue {
   items: CartItem[];
   itemCount: number;
   subtotal: number;
+  loaded: boolean;
   addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
   updateQuantity: (variantId: string, quantity: number) => void;
   removeItem: (variantId: string) => void;
   clearCart: () => void;
 }
```

Default context (řádek ~29):
```diff
 const CartContext = createContext<CartContextValue>({
   items: [],
   itemCount: 0,
   subtotal: 0,
+  loaded: false,
   addItem: () => {},
```

Provider value (řádek ~107):
```diff
-    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart }}>
+    <CartContext.Provider value={{ items, itemCount, subtotal, loaded, addItem, updateQuantity, removeItem, clearCart }}>
```

Přidat `comparePrice` do CartItem interface (řádek ~6):
```diff
 export interface CartItem {
   variantId: string;
   productId: string;
   productSlug: string;
   productName: string;
   variantTitle: string;
   price: number;
+  comparePrice?: number;
   photo: string;
   quantity: number;
 }
```

### Krok 2: Předávat comparePrice v AddToCartButton

**Soubor: `src/components/AddToCartButton.tsx`**

Props interface (řádek ~8):
```diff
   variant: {
     id: string;
     title: string;
     price: number;
+    comparePrice: number | null;
     ownStock: number;
     supplierStock: number;
   };
```

addItem call (řádek ~27):
```diff
     addItem({
       variantId: variant.id,
       productId: product.id,
       productSlug: product.slug,
       productName: product.name,
       variantTitle: variant.title,
       price: variant.price,
+      comparePrice: variant.comparePrice || undefined,
       photo: product.photo,
     });
```

### Krok 3: Předávat comparePrice v ProductCard

**Soubor: `src/components/ProductCard.tsx`**

doAddToCart funkce (řádek ~76):
```diff
     addItem({
       variantId: variant.id,
       productId: product.id,
       productSlug: product.slug,
       productName: product.name,
       variantTitle: variant.title,
       price: variant.price,
+      comparePrice: variant.comparePrice || undefined,
       photo,
     });
```

**Zkontrolovat také:** `src/components/ProductActions.tsx` — pokud volá addItem, přidat comparePrice tam taky.

### Krok 4: Kompletní přepis košíku page

**Soubor: `src/app/(public)/kosik/page.tsx`**

Kompletní změny v jednom souboru:

**A) Import loaded:**
```diff
-import { useCart } from "@/lib/cart";
+import { useCart } from "@/lib/cart";
```
(import zůstane stejný, ale destructure se změní)

**B) Destructure loaded (řádek ~12):**
```diff
-  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();
+  const { items, itemCount, subtotal, loaded, updateQuantity, removeItem } = useCart();
```

**C) Hydration guard — před empty state check (řádek ~19):**
```tsx
  // Hydration guard — prevent flash of empty cart
  if (!loaded) {
    return (
      <div className="max-w-[var(--container)] mx-auto px-6 py-12">
        <nav className="text-[13px] text-muted mb-6">
          <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
          <span className="mx-1.5 text-line">/</span>
          <span className="text-ink font-medium">Košík</span>
        </nav>
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-48 bg-wash rounded" />
          <div className="h-24 bg-wash rounded-[10px]" />
          <div className="h-24 bg-wash rounded-[10px]" />
        </div>
      </div>
    );
  }
```

**D) Text brand briefu (řádek ~35 v empty state):**
```diff
-          <p className="text-[14px] text-muted mb-6">Zatím tu nic není. Mrkni, co máme nového.</p>
+          <p className="text-[14px] text-muted mb-6">Zatím tu nic není. Mrkni na novinky.</p>
```

**E) Savings calculation (přidat za total computation, řádek ~17):**
```tsx
  const totalSavings = items.reduce((sum, item) => {
    if (item.comparePrice && item.comparePrice > item.price) {
      return sum + (item.comparePrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);
```

**F) Image zvětšení (řádek ~95):**
```diff
-                  <div className="w-[80px] h-[80px] bg-wash rounded-[8px] overflow-hidden">
+                  <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] bg-wash rounded-[8px] overflow-hidden">
```
A Image component:
```diff
-                        width={80}
-                        height={80}
+                        width={100}
+                        height={100}
```

**G) Unit price pod variant title (řádek ~119, za `<p>` variantTitle):**
```tsx
                  {item.quantity > 1 && (
                    <p className="text-[12px] text-muted mt-0.5">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  )}
```

**H) Minus button → trash icon při qty=1 (řádek ~124):**
Nahradit celý minus button:
```tsx
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            removeItem(item.variantId);
                          } else {
                            updateQuantity(item.variantId, item.quantity - 1);
                          }
                        }}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
                        aria-label={item.quantity === 1 ? "Odebrat z košíku" : "Snížit množství"}
                      >
                        {item.quantity === 1 ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sale">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                      </button>
```

**I) Plus button aria-label (řádek ~136):**
```diff
-                      <button
-                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
-                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
-                      >
+                      <button
+                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
+                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
+                        aria-label="Zvýšit množství"
+                      >
```

**J) ComparePrice + price layout (řádek ~145):**
```tsx
                    <div className="flex items-center gap-3">
                      {item.comparePrice && item.comparePrice > item.price && (
                        <span className="text-[13px] text-muted line-through">
                          {formatPrice(item.comparePrice * item.quantity)}
                        </span>
                      )}
                      <span className="text-[16px] font-extrabold text-navy">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="w-10 h-10 flex items-center justify-center text-muted hover:text-sale transition-colors"
                        aria-label="Odebrat položku"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
```

**K) Savings řádek v summary sidebar (za mezisoučet řádek, ~180):**
```tsx
              {totalSavings > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Ušetříš</span>
                  <span className="font-bold text-sale">−{formatPrice(totalSavings)}</span>
                </div>
              )}
```

**L) Sticky offset fix (řádek ~174):**
```diff
-          <div className="bg-wash rounded-[10px] p-6 sticky top-[80px]">
+          <div className="bg-wash rounded-[10px] p-6 sticky top-[100px]">
```

**M) Responsive qty/cena layout (řádek ~122):**
```diff
-                  <div className="flex items-center justify-between mt-3">
+                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-2">
```

---

## Soubory k úpravě (shrnutí)

| # | Soubor | Změny |
|---|--------|-------|
| 1 | `src/lib/cart.tsx` | +comparePrice do CartItem, +loaded do context |
| 2 | `src/components/AddToCartButton.tsx` | +comparePrice v props a addItem call |
| 3 | `src/components/ProductCard.tsx` | +comparePrice v doAddToCart |
| 4 | `src/app/(public)/kosik/page.tsx` | hydration guard, trash icon, unit price, comparePrice zobrazení, savings, responsive, accessibility, texty, sticky offset |

**Ověřit:** `src/components/ProductActions.tsx` — pokud volá addItem, přidat comparePrice.

---

## Pořadí implementace

1. `src/lib/cart.tsx` — rozšířit CartItem interface + export loaded
2. `src/components/AddToCartButton.tsx` — comparePrice prop
3. `src/components/ProductCard.tsx` — comparePrice v doAddToCart
4. Ověřit ProductActions.tsx
5. `src/app/(public)/kosik/page.tsx` — všechny UI změny
6. Build test: `npx next build`
7. Vizuální test: localhost:9999/kosik (prázdný + s položkami)

**Rozsah:** Střední — ~80 řádků změn napříč 4 souborů. Žádné nové soubory, žádné schema změny.
