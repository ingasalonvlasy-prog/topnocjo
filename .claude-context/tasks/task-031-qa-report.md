# QA Report — Task #31: GLS ParcelShop + pickup rename + payment simplification
**Původní datum:** 2026-11-12 (FAIL — GlsPoint.contact bug)
**Re-QA datum:** 2026-11-12 (po fixu Task #33)
**Kontrolor:** kontrolor agent  
**Verdict: PASS**

---

## RE-QA (po Task #33 fix)

### 1. TypeScript + Build

- `npx tsc --noEmit` — **PASS**, 0 chyb
- `npm run build` — **PASS**, 0 chyb

### 2. Grepy — zakázané výrazy

| Pattern | Výsledek |
|---------|----------|
| `grep -r "packetaPoint" src/` | 0 výskytů ✓ |
| `grep -r "packetaApiKey" src/` | 0 výskytů ✓ |
| `grep -r ".contact.address" src/` | 0 výskytů ✓ |
| `grep -r ".contact.city" src/` | 0 výskytů ✓ |

### 3. API `/api/shipping` — carrier + carrierConfig

Route vrací:
```ts
carrier: (parsed.carrier as string) || undefined,
carrierConfig: m.type === "pickup_point" ? {
  apiKey: (parsed.apiKey as string) || undefined,
  widgetType: (parsed.widgetType as string) || undefined,
} : undefined,
```
Žádné `packetaApiKey`, žádné `glsFilterType`. **PASS.**

### 4. ShippingSelector — carrier detection

- Zásilkovna: `method.carrier === "zasilkovna"` (ne `method.code`) ✓
- GLS: `method.carrier === "gls" && method.type === "pickup_point"` ✓
- `handleGlsPointSelect`: `point.address`, `point.city` — flat přístupy, žádné `.contact` ✓
- `carrierConfig.apiKey` pro Zásilkovnu ✓
- `carrierConfig.widgetType` pro GLS filterType ✓

**PASS.**

### 5. Pokladna — Varianta A (read-only)

Sekce "3. Doprava":
```tsx
{/* 3. Shipping (read-only — selection happens in cart) */}
{cartShipping ? (
  <div className="flex items-center justify-between p-4 bg-wash rounded-[8px]">
    <span>{cartShipping.methodName}</span>
    {cartShipping.pickupPointName && <p>{cartShipping.pickupPointName}</p>}
    <Link href="/kosik">Změnit</Link>
  </div>
) : (
  <Link href="/kosik">Vybrat v košíku</Link>
)}
```
Žádný ShippingSelector, žádné radio buttony, žádné widgety. Pouze zobrazení + "Změnit" link. **PASS.**

### 6. DB

| Název | Code | Type | Active |
|-------|------|------|--------|
| Zásilkovna | zasilkovna | pickup_point | 1 ✓ |
| GLS ParcelShop | gls-parcelshop | pickup_point | 1 ✓ |
| GLS ParcelBox | gls-parcelbox | pickup_point | 1 ✓ |
| GLS | gls | address | 1 ✓ |
| Osobní vyzvednutí | pickup | personal | 0 (deaktivováno ✓) |

**PASS.**

---

## Souhrn (re-QA)

| Kontrolní bod | Stav |
|---------------|------|
| npm run build | PASS |
| tsc --noEmit | PASS |
| packetaPoint rename | PASS |
| packetaApiKey odstraněno | PASS |
| .contact.address odstraněno | PASS |
| API vrací carrier+carrierConfig | PASS |
| ShippingSelector přes method.carrier | PASS |
| Pokladna read-only + "Změnit" | PASS |
| DB — 4 aktivní metody | PASS |

---

## Původní FAIL report (archiv)

### Původní bug (Task #33 — opraveno)

`GlsPoint` interface měl flat strukturu ale kód přistupoval k `point.contact.address` / `point.contact.city` na 3 místech:
- `GlsWidget.tsx:86`
- `ShippingSelector.tsx:131`  
- `pokladna/page.tsx:284`

Opraveno Varianta B (flat přístupy) + API refaktor na `carrier`/`carrierConfig`.
