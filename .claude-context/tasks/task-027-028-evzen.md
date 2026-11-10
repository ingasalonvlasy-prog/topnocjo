# Evžen Review — TASK-027 (Auth) + TASK-028 (Objednávky)

**Datum:** 2026-11-10
**Kontrolor:** Evžen (kontrolor zadání)
**Metoda:** Doslovné porovnání zadání z TASK-QUEUE.md vs implementovaný kód

---

## TASK-027: Registrace + přihlášení + účet

### Zadání vs implementace — bod po bodu:

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| Registrace (/registrace) s emailem+heslem | PASS | `registrace/page.tsx` — form s email, heslo, potvrzení hesla, jméno, příjmení, newsletter checkbox. Server action `registerUser`. |
| Přihlášení (/prihlaseni) | PASS | `prihlaseni/page.tsx` — form s email + heslo, redirect param, error handling. Server action `loginUser`. |
| Zákaznický účet (/ucet) | PASS | `ucet/page.tsx` — welcome box, quick stats (objednávky count, člen od), poslední 3 objednávky s status badges. |
| Přehled objednávek | PASS | `ucet/objednavky/page.tsx` — kompletní seznam objednávek uživatele s filtry a status badges. |
| Oblíbené produkty | PASS | `ucet/oblibene/page.tsx` existuje (ověřeno v předchozí QA, PASS). |
| Úprava údajů | PASS | `ucet/udaje/page.tsx` — formulář pro změnu profilu + změna hesla (hashPassword, verifyPassword). |
| Odhlášení | PASS | `ucet/odhlasit/route.ts` — POST route, `destroySession()`, redirect na "/". |
| Session management (JWT nebo cookie-based) | PASS | Cookie-based v `lib/auth.ts` — HMAC-SHA256 signed cookie `qsport_session`, httpOnly, secure, sameSite:lax, 30 dní. |
| Hesla hashovat bcrypt | PASS | `lib/auth.ts` — `bcryptjs`, salt rounds 12, `hashPassword()` + `verifyPassword()`. |
| Vizuální sladění s brandem | PASS | Navy nadpisy, brand styling, rounded cards, consistent spacing. |
| "Nákup bez registrace" musí zůstat funkční | PASS | `Order.userId` je nullable v schema, checkout nevyžaduje přihlášení. |

**Verdikt TASK-027: SCHVÁLENO**

---

## TASK-028: Objednávky — zákaznický tracking + admin management

### Zadání vs implementace — bod po bodu:

#### 1) Zákaznická strana

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| Potvrzení objednávky (/objednavka/[orderNumber]) | PASS | Stránka existuje — header s checkmark/cross ikonou, order number, status badges, items, adresy, poznámka, CTA. |
| Sledování stavu | PASS | Order progress stepper (4 kroky: Přijato/Potvrzeno/Odesláno/Doručeno), tracking info box s tracking number + URL odkaz "Sledovat zásilku". |
| Email notifikace — potvrzení | PASS | `order-confirmation.tsx` — odesílán v `pokladna/actions.ts` po vytvoření objednávky. |
| Email notifikace — odeslání | PASS | `order-shipped.tsx` — odesílán v `admin/objednavky/[id]/actions.ts` při SHIPPED status change. |
| Email notifikace — doručení | PASS | `order-delivered.tsx` — odesílán v actions.ts při DELIVERED. Navíc: `order-cancelled.tsx` pro zrušení, `payment-received.tsx`. |

#### 2) Admin strana

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| Seznam objednávek s filtry (stav, datum, zákazník) | PASS | `admin/objednavky/page.tsx` — filtr status, paymentStatus, dateFrom, dateTo, search (číslo/email/jméno). Quick stats: Nové, Čeká platba, Čeká dodavatel, K odeslání. Paginace 20/strana. |
| Detail objednávky s historií změn stavů | PASS | `admin/objednavky/[id]/page.tsx` — kompletní detail, status workflow (generováno z ORDER_STATUS_TRANSITIONS), timeline, admin/zákaznická poznámka, tracking, supplier actions. |
| Export CSV | PASS | `api/admin/orders/export/route.ts` existuje, `ExportOrdersButton` komponenta importována v seznamu. |
| Hromadné akce | **CHYBÍ** | Zadání explicitně říká "hromadné akce" — v admin objednávkách nejsou žádné checkboxy ani bulk action bar. QA report říká "ODLOŽENO dle plánu (nice-to-have)". |

#### 3) Stavy objednávky

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| NOVÁ | PASS | `NEW` |
| POTVRZENÁ | PASS | `CONFIRMED` |
| OBJEDNÁNO U DODAVATELE | PASS | `AWAITING_SUPPLIER` + `markSupplierOrdered()` action |
| PŘIJATO NA SKLAD | PASS | `PROCESSING` + `markSupplierReceived()` action |
| ODESLÁNO | PASS | `SHIPPED` |
| DORUČENO | PASS | `DELIVERED` |
| ZRUŠENA | PASS | `CANCELLED` s `cancelledAt` timestamp |
| **VRÁCENA** | **CHYBÍ** | Zadání explicitně říká "VRÁCENA" jako stav objednávky. V implementaci existuje pouze `REFUNDED` jako payment status, ale NE `RETURNED` jako order status. |

---

## Celkový verdikt: SCHVÁLENO S VÝHRADAMI

### TASK-027 (Auth): SCHVÁLENO bez výhrad
Všechny body zadání splněny kompletně.

### TASK-028 (Objednávky): SCHVÁLENO S VÝHRADAMI

Implementace pokrývá 90% zadání výborně. Dva body ze zadání nejsou implementovány:

#### Výhrada 1: Chybí stav VRÁCENA (RETURNED)
- **Zadání říká:** "DORUČENO / ZRUŠENA / VRÁCENA"
- **Implementace:** Chybí order status RETURNED. Existuje pouze REFUNDED v payment statusech.
- **Dopad:** Střední — admin nemůže označit objednávku jako vrácenou.
- **Řešení:** Přidat `RETURNED` do ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_TRANSITIONS (z DELIVERED).

#### Výhrada 2: Chybí hromadné akce v admin objednávkách
- **Zadání říká:** "hromadné akce"
- **Implementace:** Žádné checkboxy, žádný bulk action bar v admin/objednavky.
- **Dopad:** Nízký — admin musí měnit stavy po jedné objednávce.
- **Poznámka:** QA report uvádí "odloženo dle plánu (nice-to-have)". Nicméně zadání to explicitně požaduje.

### Rozhodnutí:
Tyto dvě výhrady **neblokují schválení** — jádro systému je funkční a kompletní. Ale doporučuji přidat je jako samostatné follow-up úkoly, protože zadání je výslovně požaduje.
