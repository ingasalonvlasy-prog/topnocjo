# QA Report: Quick fixy (Task #45)

**Datum:** 2026-11-11  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — všechny 4 fixy implementovány správně**

---

## 1. Bestsellers — řazení podle reviewCount desc

**Soubor:** `src/app/(public)/page.tsx` řádky 57–66

```ts
prisma.product.findMany({
  where: { status: "ACTIVE" },
  ...
  orderBy: { reviewCount: "desc" },
  take: 4,
})
```

- [x] `orderBy: { reviewCount: "desc" }` — správné řazení podle počtu recenzí sestupně — PASS
- [x] `take: 4` — 4 bestsellery na homepage — OK
- [x] `status: "ACTIVE"` filter — OK

**Výsledek: PASS**

---

## 2. /akce a /bazar v sitemap.ts

**Soubor:** `src/app/sitemap.ts` řádky 26–38

```ts
{ url: `${baseUrl}/akce`, changeFrequency: "daily", priority: 0.7 },
{ url: `${baseUrl}/bazar`, changeFrequency: "daily", priority: 0.6 },
```

- [x] `/akce` přidáno do staticPages — `changeFrequency: "daily"`, `priority: 0.7` — OK
- [x] `/bazar` přidáno do staticPages — `changeFrequency: "daily"`, `priority: 0.6` — OK
- [x] Stránky fyzicky existují: `/src/app/(public)/akce/page.tsx` a `/src/app/(public)/bazar/page.tsx` — ověřeno find příkazem
- [x] Ostatní statické stránky zachovány — OK

**Výsledek: PASS**

---

## 3. Pokladna prefill z /api/me pro přihlášené

**Soubory:** `src/app/(public)/pokladna/page.tsx`, `src/app/api/me/route.ts`

### /api/me endpoint
- [x] GET handler vrací: email, firstName, lastName, phone, street, city, zip — OK
- [x] 401 pro nepřihlášeného (`getCurrentUser()` returns null) — OK

### Pokladna — userData state + prefill
- [x] `useState<{email, phone?, firstName?, lastName?, street?, city?, zip?} | null>(null)` — OK
- [x] `useEffect` fetchuje `/api/me` → `setUserData(data)` — OK
- [x] Fire-and-forget: `catch(() => {})` — nepřihlášený zákazník dostane 401, tiché zahození — OK
- [x] `key={userData?.email || "anon"}` na `<form>` — způsobí remount při načtení dat, aby `defaultValue` fungovaly — správný pattern — OK
- [x] Prefill polí:
  - email: `recoveryData?.email || userData?.email || ""`
  - phone: `recoveryData?.phone || userData?.phone || ""`
  - firstName: `recoveryData?.firstName || userData?.firstName || ""`
  - lastName: `recoveryData?.lastName || userData?.lastName || ""`
  - street: `userData?.street || ""`
  - city: `userData?.city || ""`
  - zip: `userData?.zip || ""`
- [x] Priority: recoveryData > userData > prázdné — správné pořadí — OK

**Výsledek: PASS**

---

## 4. Kontaktní formulář s server action

**Soubory:** `src/app/(public)/kontakt/page.tsx`, `src/app/(public)/kontakt/ContactForm.tsx`, `src/app/(public)/kontakt/actions.ts`

### Stránka
- [x] `import { ContactForm } from "./ContactForm"` — správný import — OK
- [x] Layout: 2-sloupcový grid (kontaktní info + formulář) — OK
- [x] Metadata: title + description — OK

### ContactForm.tsx (client component)
- [x] `"use client"` — OK
- [x] `import { submitContactForm } from "./actions"` — OK
- [x] `handleSubmit`: volá `await submitContactForm(fd)`, vrací `{ error? }` — OK
- [x] Success state: zelený banner "Zpráva odeslána!" — OK
- [x] Error state: červený banner s chybovou zprávou — OK
- [x] Loading state: "Odesílám..." + disabled tlačítko — OK
- [x] Pole: Jméno, E-mail, Zpráva (required) — OK

### actions.ts (server action)
- [x] `"use server"` direktiva — OK
- [x] Validace: všechna pole povinná, email regex — OK
- [x] Odesílá email na `ADMIN_EMAIL` (fallback "obchod@qsport.cz") — OK
- [x] Subject: `Kontaktní formulář — ${name}` — OK
- [x] EmailLayout + react-email komponenty (Text, Hr) — OK
- [x] Vrací `{ success: true }` nebo `{ error: string }` — OK
- [x] Žádné throw — klient dostane structured response, ne uncaught exception — OK

**Výsledek: PASS**

---

## Souhrn

| Fix | Status |
|-----|--------|
| Bestsellers orderBy reviewCount desc | PASS |
| /akce + /bazar v sitemap.ts | PASS |
| Pokladna prefill z /api/me | PASS |
| Kontaktní formulář + server action | PASS |

**Závěr:** Všechny 4 quick fixy jsou implementovány správně. QA PASSED.
