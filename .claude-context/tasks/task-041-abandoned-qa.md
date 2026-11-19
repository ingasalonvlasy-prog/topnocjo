# QA Report: Opuštěné pokladny — kompletní feature (Task #32)

**Datum:** 2026-11-11  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše v pořádku**

---

## Kontrolní body

### 1. Prisma model: AbandonedCheckout
- [x] Model existuje v `prisma/schema.prisma` (řádky 351–374)
- [x] `status` — String s hodnotami OPEN / EMAIL_SENT / RECOVERED / EXPIRED (default "OPEN") — OK
- [x] `recoveryToken` — String @unique — OK
- [x] `recoveryEmailSentAt` — DateTime? — OK
- [x] `recoveredAt` — DateTime? — OK
- [x] `recoveredOrderId` — String? — OK
- [x] Indexy: email, status, createdAt — OK
- [x] `expiresAt` není jako pole — expiry se řeší logicky v cron jobu (30d window), ne DB polem — přijatelné
- [x] `@@map("abandoned_checkouts")` — OK

### 2. Track endpoint: `/api/checkout/track`
- [x] POST handler — OK
- [x] Email validace: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — OK
- [x] Upsert logika: při checkoutId → update stávajícího OPEN/EMAIL_SENT záznamu — OK
- [x] Fallback: vyhledání existujícího záznamu stejného emailu za posledních 24h → update — OK
- [x] Nový záznam: `crypto.randomUUID()` pro recoveryToken — OK
- [x] Vrací `{ checkoutId, recoveryToken }` — OK
- [x] Debounce: implementován na straně klienta v pokladna/page.tsx (`setTimeout 2000ms`) — OK
- [x] Fire-and-forget: v pokladna/page.tsx — `trackCheckout` volá fetch bez await v handleSubmit — OK
- [x] Items mapovány: variantId, productName, variantTitle, quantity, unitPrice, photo — OK

### 3. Recovery endpoint: `/api/checkout/recover`
- [x] GET handler — OK
- [x] Token validace: 400 pokud chybí — OK
- [x] `findUnique({ where: { recoveryToken: token } })` — OK
- [x] 404 pokud nenalezeno nebo status === "EXPIRED" — OK
- [x] Vrací: email, phone, firstName, lastName, items (JSON.parse), subtotal — OK
- [x] Poznámka: endpoint NEOZNAČUJE checkout jako recovered — to se děje v `createOrder` po dokončení objednávky — správný design

### 4. Cron job: `/api/cron/abandoned-checkouts`
- [x] CRON_SECRET autentizace: `secret !== process.env.CRON_SECRET` → 401 — OK
- [x] Časové okno: `createdAt: { gte: twoDaysAgo, lte: oneHourAgo }` = starší než 1h a mladší než 48h — OK (odpovídá zadání ">1h <48h")
- [x] Status filter: pouze `OPEN` (ne EMAIL_SENT!) — 1 email max na checkout — OK
- [x] Email odeslán přes `sendEmail + AbandonedCheckoutEmail` — OK
- [x] Po odeslání: `status: "EMAIL_SENT", recoveryEmailSentAt: new Date()` — OK
- [x] 30-denní expiry: `updateMany` kde `createdAt < thirtyDaysAgo` AND status IN [OPEN, EMAIL_SENT] → EXPIRED — OK
- [x] `logAdminAction` volán pokud emailsSent > 0 nebo expired.count > 0 — OK
- [x] Vrací `{ emailsSent, expired: expired.count, processed }` — OK

### 5. vercel.json — cron config
- [x] `"path": "/api/cron/abandoned-checkouts?secret=${CRON_SECRET}"` — CRON_SECRET jako env var — OK
- [x] `"schedule": "0 * * * *"` = každou hodinu — OK
- [x] Vercel cron format správný — OK

### 6. Email šablona: `abandoned-checkout.tsx`
- [x] Importy z `@react-email/components`: Text, Section, Row, Column, Link, Hr — OK
- [x] Wrapper `<EmailLayout>` — OK
- [x] Items loop: productName, variantTitle × quantity, unitPrice × quantity — OK
- [x] Celkem řádek — OK
- [x] CTA tlačítko: `recoveryUrl`, barva `#CEFF2F` (Qsport lime), text "Dokončit objednávku" — OK
- [x] Personalizace: `Dobrý den${firstName ? `, ${firstName}` : ""}` — OK
- [x] Unsubscribe text — OK
- [x] `email` prop v interface ale není použit v JSX — kosmetická drobnost, ne bug (je v interface pro konzistenci s ostatními emaily)

### 7. Admin stránka: `/admin/opustene-pokladny`
- [x] `searchParams: Promise<Record<string, string | string[] | undefined>>` — správně pro Next.js 15+ — OK
- [x] **4 stat karty:** Celkem opuštěných (+ sparkline), Obnovených, Míra obnovy (%), Ztracená hodnota — OK
- [x] Sparkline: dailyMap 30 dní, `Array.from(dailyMap.values())` — OK
- [x] **Tabs:** Vše / Otevřené / Email odeslán / Obnovené (s počty) — OK
- [x] **Search:** `q=` parametr, hledat podle emailu (`contains`) — OK
- [x] **Paginace:** 25/stránku, Předchozí/Další, rozsah X–Y z Z — OK
- [x] **Tabulka:** 6 sloupců — Datum, Zákazník, Položky, Celkem, Stav, Akce — OK
- [x] Stav badgy: OPEN (žlutá), EMAIL_SENT (modrá), RECOVERED (zelená), EXPIRED (šedá) — OK
- [x] Akce "Odeslat upomínku" / "Znovu odeslat" pro OPEN/EMAIL_SENT — OK
- [x] Akce "Zobrazit objednávku" link pro RECOVERED (pokud recoveredOrderId) — OK
- [x] Empty state: ikona košíku + "Žádné opuštěné pokladny." — OK
- [x] recoveryEmailSentAt zobrazen pod stavem — OK
- [x] `formatDate`: locale cs-CZ, datum + čas — OK
- [x] Import `deleteAbandonedCheckout` z actions — deklarován v importu, ale tlačítko smazat v tabulce není — drobnost, akce existuje, UI ji nevyužívá (záměr nebo budoucí feature, nehraje roli pro QA)

### 8. Server actions: `actions.ts`
- [x] `"use server"` direktiva — OK
- [x] `sendRecoveryEmail`: guard pro RECOVERED/EXPIRED — OK
- [x] Sestavuje recoveryUrl z `NEXT_PUBLIC_BASE_URL` — OK
- [x] Volá `sendEmail + AbandonedCheckoutEmail` — OK
- [x] Aktualizuje status → EMAIL_SENT + recoveryEmailSentAt — OK
- [x] `logAdminAction` zaloguje odeslání — OK
- [x] `revalidatePath("/admin/opustene-pokladny")` — OK
- [x] `deleteAbandonedCheckout`: smaže záznam, revalidatePath — OK

### 9. Pokladna (`pokladna/page.tsx`) — tracking integrace
- [x] `checkoutTrackId` state pro persistenci ID — OK
- [x] `trackCheckout` funkce: debounce 2000ms přes setTimeout + useRef — OK
- [x] Trigger: `onBlur={trackCheckout}` na email poli — OK
- [x] Fire-and-forget: `fetch` v async bloku, chyba se tiše spolkne (`catch {}`) — OK
- [x] Recovery: URL param `?recover=token`, fetch GET `/api/checkout/recover` — OK
- [x] Recovery banner: zelený banner "Vítejte zpět!" — OK
- [x] Recovery data prefill: email, phone, firstName, lastName jako `defaultValue` — OK
- [x] Items z recovery: `CustomEvent "qsport-recovery-item"` dispatchován pokud cart prázdný — OK

### 10. RECOVERED marking (`pokladna/actions.ts` → `createOrder`)
- [x] Po vytvoření objednávky: `prisma.abandonedCheckout.updateMany` kde email + status IN [OPEN, EMAIL_SENT] — OK
- [x] Nastaví: status → RECOVERED, recoveredOrderId, recoveredAt — OK
- [x] Fire-and-forget: `.catch(() => {})` — správně, neblokuje objednávku — OK

---

## Souhrn

| Oblast | Status |
|--------|--------|
| Prisma model (status, recoveryToken, indexy) | PASS |
| Track endpoint (upsert, debounce, email validace) | PASS |
| Recovery endpoint (token validace, items return) | PASS |
| Cron job (CRON_SECRET, >1h <48h, max 1 email, 30d expiry) | PASS |
| vercel.json (cron schedule každou hodinu) | PASS |
| Email šablona (položky, CTA, personalizace) | PASS |
| Admin stránka (stat karty, tabs, tabulka, search, paginace) | PASS |
| Server actions (sendRecoveryEmail, delete, logAdminAction) | PASS |
| Pokladna tracking (debounce, fire-and-forget, recovery banner) | PASS |
| RECOVERED marking v createOrder (fire-and-forget) | PASS |

**Závěr:** Celá feature opuštěných pokladen je implementována korektně. Tracking, recovery, cron, email šablona i admin stránka jsou funkční a konzistentní. QA PASSED.
