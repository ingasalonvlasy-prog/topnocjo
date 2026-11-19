# QA Report: Opuštěné pokladny — Kompletní feature (Task #33)

**Datum:** 2026-11-11  
**Kontrolor:** Evžen-the-King  
**Výsledek: PASS**

---

## 1. Prisma Model — AbandonedCheckout

- [x] Všechna pole: id, email, phone?, firstName?, lastName?, items (JSON), itemCount, subtotal, shippingMethodId?, paymentMethod?, status, recoveredOrderId?, recoveryToken (unique), recoveryEmailSentAt?, recoveredAt?, createdAt, updatedAt — OK
- [x] Statusy: OPEN → EMAIL_SENT → RECOVERED / EXPIRED — kompletní lifecycle — OK
- [x] Indexy: @@index([email]), @@index([status]), @@index([createdAt]) — OK
- [x] `recoveryToken String @unique` — bezpečné pro lookup — OK

**Hodnocení: 4/4 PASS**

---

## 2. Tracking API (`/api/checkout/track`, POST)

- [x] Validace emailu: regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` — OK
- [x] Pokud `checkoutId` existuje → update existujícího OPEN/EMAIL_SENT checkoutu — OK
- [x] Deduplikace: hledá existující OPEN checkout se stejným emailem za 24h — OK
- [x] Nový checkout: `crypto.randomUUID()` pro `recoveryToken` — OK
- [x] Serializace items: `variantId, productName, variantTitle, quantity, unitPrice, photo` — OK
- [x] Vrací `{ checkoutId, recoveryToken }` — OK
- [x] Error handling: try/catch, 400 pro invalid email, 500 pro interní chyby — OK

**Hodnocení: 7/7 PASS**

---

## 3. Recovery API (`/api/checkout/recover`, GET)

- [x] Token z query params — OK
- [x] Lookup: `findUnique({ where: { recoveryToken } })` — OK
- [x] 404 pokud checkout neexistuje nebo je EXPIRED — OK
- [x] Vrací: email, phone, firstName, lastName, items (parsed JSON), subtotal — OK

**Hodnocení: 4/4 PASS**

---

## 4. Cron Job (`/api/cron/abandoned-checkouts`, GET)

- [x] Auth: `CRON_SECRET` z env — OK
- [x] Timing: OPEN checkouty starší než 1h ale mladší než 48h — OK (správný window)
- [x] Odesílá `AbandonedCheckoutEmail` přes `sendEmail` — OK
- [x] Po odeslání: update status na `EMAIL_SENT`, set `recoveryEmailSentAt` — OK
- [x] Expirace: OPEN/EMAIL_SENT starší 30 dní → EXPIRED — OK
- [x] Logging: `logAdminAction("ABANDONED_CHECKOUT_CRON", ...)` — OK
- [x] Vrací: `{ emailsSent, expired, processed }` — OK
- [x] `recoveryUrl`: `${baseUrl}/pokladna?recover=${token}` — OK

**Hodnocení: 8/8 PASS**

---

## 5. Email template (`abandoned-checkout.tsx`)

- [x] Používá `EmailLayout` (konzistentní s ostatními emaily) — OK
- [x] Subject: "Zapomněli jste něco v košíku?" — OK
- [x] Personalizace: `firstName` pokud existuje — OK
- [x] Položky: productName, variantTitle × quantity, cena — OK
- [x] Celkem: `formatPrice(subtotal)` — OK
- [x] CTA tlačítko: "Dokončit objednávku" s `recoveryUrl`, barva `#CEFF2F` (brand Qsport) — OK
- [x] Opt-out text: "Pokud si nepřejete dostávat tyto upomínky, tento email ignorujte." — OK
- [x] React Email komponenty: Text, Section, Row, Column, Link, Hr — OK

**Hodnocení: 8/8 PASS**

---

## 6. Pokladna integrace (public)

### Tracking (fire-and-forget)
- [x] `trackCheckout()` debounced (2s timeout) — OK
- [x] Odesílá email + cart items na `/api/checkout/track` — OK
- [x] Ukládá `checkoutTrackId` pro následné updaty — OK
- [x] Odesílá: email, phone, firstName, lastName, items, subtotal, shippingMethodId, paymentMethod — OK

### Recovery (URL token)
- [x] `?recover=TOKEN` v URL → fetch `/api/checkout/recover?token=TOKEN` — OK
- [x] Pre-fill: email, phone, firstName, lastName do formuláře přes `recoveryData` + `defaultValue` — OK
- [x] Cart recovery: `window.dispatchEvent(new CustomEvent("qsport-recovery-item", { detail: item }))` — OK
- [x] Recovery banner: zelený, "Vítejte zpět! Vaše položky jsou připravené k dokončení objednávky." — OK

### Order completion
- [x] Po úspěšné objednávce: `abandonedCheckout.updateMany({ email, status → RECOVERED, recoveredOrderId, recoveredAt })` — OK
- [x] Fire-and-forget (`.catch(() => {})`) — neblokuje objednávku — OK

**Hodnocení: 10/10 PASS**

---

## 7. Admin stránka (`opustene-pokladny/page.tsx`)

### Header + stat karty
- [x] Nadpis "Opuštěné pokladny" + popis — OK
- [x] 4 StatCards: Celkem opuštěných (sparkline 30d), Obnovených, Míra obnovy (%), Ztracená hodnota — OK
- [x] Sparkline: daily abandoned count za 30 dní — OK
- [x] Všechny StatCards mají ikony — OK
- [x] `searchParams: Promise<...>` — správně pro Next.js 15+ — OK

### Tabs + filtry
- [x] 4 taby: Vše, Otevřené (OPEN), Email odeslán (EMAIL_SENT), Obnovené (RECOVERED) — OK
- [x] Počty na každém tabu — OK
- [x] Search: email filter (`contains`) — OK
- [x] URL: `?stav=OPEN/EMAIL_SENT/RECOVERED/all&q=search&stranka=1` — OK

### Tabulka
- [x] Sloupce: Datum, Zákazník (email + jméno), Položky (count + preview 2 items), Celkem, Stav (badge), Akce — OK
- [x] STATUS_LABELS: OPEN=žlutá, EMAIL_SENT=modrá, RECOVERED=zelená, EXPIRED=šedá — OK
- [x] `recoveryEmailSentAt` zobrazeno pod badge — OK
- [x] Akce OPEN/EMAIL_SENT: "Odeslat upomínku" / "Znovu odeslat" — server action `sendRecoveryEmail` — OK
- [x] Akce RECOVERED: "Zobrazit objednávku" link na `/admin/objednavky/${recoveredOrderId}` — OK
- [x] Empty state: SVG ikona + "Žádné opuštěné pokladny." — OK

### Paginace
- [x] 25 per page — OK
- [x] "Předchozí" / "Další" linky s `stav` + `q` parametry — OK
- [x] Range text: "1–25 z 50" — OK

### Server actions (actions.ts)
- [x] `"use server"` direktiva — OK
- [x] `sendRecoveryEmail`: validace statusu (ne RECOVERED/EXPIRED), sendEmail, update status, logAdminAction, revalidatePath — OK
- [x] `deleteAbandonedCheckout`: prisma.delete + revalidatePath — OK

**Hodnocení: 20/20 PASS**

---

## Technické kontroly

- [x] Všechna DB pole v schema odpovídají použití v kódu — OK
- [x] `recoveryToken` je `@unique` — bezpečné pro findUnique — OK
- [x] Email template používá `EmailLayout` + React Email — konzistentní — OK
- [x] CTA barva `#CEFF2F` odpovídá Qsport brandu — OK
- [x] Cron: CRON_SECRET autentizace, logování — OK
- [x] DPH výpočet v emailu: není třeba (zobrazuje subtotal, ne total s DPH) — OK
- [x] Pokladna tracking: debounced 2s, fire-and-forget — neblokuje UX — OK
- [x] Recovery: pre-fill formuláře + cart items přes CustomEvent — OK

---

## Shrnutí

| Oblast | Body | Status |
|--------|------|--------|
| Prisma model | 4/4 | PASS |
| Tracking API | 7/7 | PASS |
| Recovery API | 4/4 | PASS |
| Cron Job | 8/8 | PASS |
| Email template | 8/8 | PASS |
| Pokladna integrace | 10/10 | PASS |
| Admin stránka | 20/20 | PASS |
| **Celkem** | **61/61** | **PASS** |

**Závěr: Kompletní implementace opuštěných pokladen — od trackingu přes cron email po recovery a admin dashboard. Odpovídá Shopify "Opuštěné pokladny" funkcionalitou. QA PASSED.**
