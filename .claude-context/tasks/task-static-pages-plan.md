# Plan: Static Pages

6 pages, all follow the same pattern: server component, no data fetching, hardcoded Czech content. All inside `src/app/(public)/`.

## Shared Layout Pattern

Each page:
- Breadcrumbs: Domů / {page name}
- H1: standard heading (text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy)
- Content in `max-w-[var(--container)] mx-auto px-6 py-8`, prose area `max-w-[780px]`
- Paragraphs: text-[16px] text-ink leading-relaxed
- H2: text-[22px] font-extrabold text-navy mt-10 mb-4
- Lists: list-disc pl-5 space-y-2 text-[16px] text-ink
- Static metadata per page

## Pages

### 1. `/o-nas` — `src/app/(public)/o-nas/page.tsx` (CREATE)

Content sections: Kdo jsme, Náš příběh, Proč Qsport, Kde nás najdete.
Placeholder text — user will provide real copy later. Include Qsport values (sport, kvalita, komunita).
Metadata: `title: "O nás | Qsport.cz"`

### 2. `/doprava-a-platba` — `src/app/(public)/doprava-a-platba/page.tsx` (CREATE)

Two sections:
- **Doprava:** Zásilkovna (od 49 Kč), osobní vyzvednutí (zdarma). Delivery time 2-5 working days.
- **Platba:** Comgate (karta, bankovní převod).
Metadata: `title: "Doprava a platba | Qsport.cz"`

**Note:** Footer link currently points to `/doprava`, update to `/doprava-a-platba`. OR create at `/doprava` path instead (shorter URL). Recommend `/doprava-a-platba` for SEO clarity.

**Footer.tsx EDIT:** Change `href="/doprava"` → `href="/doprava-a-platba"` (line 39).

### 3. `/vraceni-zbozi` — `src/app/(public)/vraceni-zbozi/page.tsx` (CREATE)

Content: 14 days return policy, conditions, how to return (steps), refund timeline.
Metadata: `title: "Vrácení zboží | Qsport.cz"`

**Footer.tsx EDIT:** Change "Vrácení zboží" link `href="/reklamace"` → `href="/vraceni-zbozi"` (line 40). Currently both "Vrácení zboží" and "Reklamace" point to `/reklamace`.

### 4. `/reklamace` — `src/app/(public)/reklamace/page.tsx` (CREATE)

Content: How to file a complaint, warranty conditions, contact for complaints, timeline (30 days).
Metadata: `title: "Reklamace | Qsport.cz"`

### 5. `/obchodni-podminky` — `src/app/(public)/obchodni-podminky/page.tsx` (CREATE)

Content: Standard e-shop terms — provider info, order process, prices, payment, delivery, cancellation, complaints, GDPR, final provisions.
Placeholder structure — user/lawyer will provide real legal text.
Metadata: `title: "Obchodní podmínky | Qsport.cz"`

### 6. `/kontakt` — `src/app/(public)/kontakt/page.tsx` (CREATE)

Two-column layout (lg:grid-cols-2):
- Left: Contact info — email (obchod@qsport.cz), phone (+420 777 447 464), address, opening hours, social links (Instagram, Facebook)
- Right: Contact form (name, email, message) — client component or just `<form>` with placeholder action. For now, form with `mailto:` action or disabled submit. Real form handler is a separate task.

Metadata: `title: "Kontakt | Qsport.cz"`

## Footer.tsx Fixes (EDIT)

| Line | Current | Change to |
|------|---------|-----------|
| 39 | `href="/doprava"` | `href="/doprava-a-platba"` |
| 40 | `href="/reklamace"` (Vrácení zboží) | `href="/vraceni-zbozi"` |

## File Summary

| File | Action |
|------|--------|
| `src/app/(public)/o-nas/page.tsx` | CREATE |
| `src/app/(public)/doprava-a-platba/page.tsx` | CREATE |
| `src/app/(public)/vraceni-zbozi/page.tsx` | CREATE |
| `src/app/(public)/reklamace/page.tsx` | CREATE |
| `src/app/(public)/obchodni-podminky/page.tsx` | CREATE |
| `src/app/(public)/kontakt/page.tsx` | CREATE |
| `src/components/Footer.tsx` | EDIT — fix 2 links |
