# Plan: User Accounts — Registration, Login, Profile

**Status:** Ready for implementation
**Priority:** High
**Date:** 2026-11-08
**Design mandate:** Brand-consistent, visually polished — not generic forms

---

## Design System Reference

All user account pages MUST follow the Qsport brand brief (`qsport-brand-brief.md`):

**Form field style** (from kontakt page pattern):
```
w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)]
bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all
```

**Labels:** `text-[13px] font-bold text-ink mb-1.5`

**Primary button (navy):**
```
h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em]
px-8 rounded-[var(--radius-pill)] hover:bg-ink transition-colors
```

**Primary button (lime) — for main CTA:**
```
h-[44px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em]
px-8 rounded-[var(--radius-pill)] hover:brightness-110 transition-all
```

**Secondary link:** `text-[13px] text-blue hover:underline`

**Card:** `bg-white border border-line rounded-[10px] p-6` (or `bg-wash rounded-[10px] p-6` for accent)

**Heading:** `text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy`

**Subheading:** `text-[22px] font-extrabold text-navy`

**Tone:** Tykani vsude. Decentni, prehledne, ne kriclave.

---

## 1. Prisma Schema — User Model

Add to `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  phone         String?
  // Shipping address
  street        String?
  city          String?
  zip           String?
  // Preferences
  newsletter    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  orders        Order[]

  @@map("users")
}
```

Add `userId` field to the existing `Order` model:
```prisma
// In Order model, add:
userId  String?
user    User?   @relation(fields: [userId], references: [id])

@@index([userId])
```

**Notes:**
- `passwordHash` — bcrypt hash, never store plain passwords
- No separate Address model — one shipping address per user for now (simplicity). Can be extended later.
- `userId` on Order is nullable — guest checkout (nakup bez registrace) remains supported
- No email verification in v1 — can be added later

---

## 2. Auth Library — `src/lib/auth.ts` (CREATE)

Simple cookie-based sessions (no next-auth, no external deps). Use built-in `crypto` for tokens.

```typescript
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "qsport_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/** Hash password with bcrypt (need to add bcryptjs dep) */
export async function hashPassword(password: string): Promise<string> { ... }
export async function verifyPassword(password: string, hash: string): Promise<boolean> { ... }

/** Create session token and set cookie */
export async function createSession(userId: string): Promise<void> { ... }

/** Get current logged-in user from cookie, or null */
export async function getCurrentUser() { ... }

/** Destroy session (logout) */
export async function destroySession(): Promise<void> { ... }
```

**Session storage option A (simple):** Store userId directly in a signed cookie (using `crypto.createHmac` with a secret from env).

**Session storage option B (DB):** Add a `Session` model. Overkill for now — go with option A.

**New dependency:** `bcryptjs` (pure JS, no native deps — works everywhere).

**New env var:** `SESSION_SECRET` — random string for cookie signing.

---

## 3. Registration Page — `src/app/(public)/registrace/page.tsx` (CREATE)

**URL:** `/registrace`

### Layout
Centered card layout (NOT full-width form). Max-width 440px, centered on page with wash background area.

### Design Spec

```
<div className="min-h-[60vh] flex items-center justify-center py-12">
  <div className="w-full max-w-[440px] mx-auto px-6">

    <!-- Heading -->
    <div className="text-center mb-8">
      <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
        Vytvor si ucet
      </h1>
      <p className="text-[14px] text-muted">
        Sleduj objednavky, uloz si adresu a nakupuj rychleji.
      </p>
    </div>

    <!-- Form card -->
    <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
      <form>
        <!-- Jmeno + Prijmeni (2-col on desktop) -->
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label>Jmeno</label>
            <input ... />
          </div>
          <div>
            <label>Prijmeni</label>
            <input ... />
          </div>
        </div>

        <!-- E-mail -->
        <div className="mb-4">
          <label>E-mail</label>
          <input type="email" ... />
        </div>

        <!-- Heslo -->
        <div className="mb-4">
          <label>Heslo</label>
          <input type="password" ... />
          <p className="text-[12px] text-muted mt-1">Alespon 8 znaku</p>
        </div>

        <!-- Heslo znovu -->
        <div className="mb-6">
          <label>Heslo znovu</label>
          <input type="password" ... />
        </div>

        <!-- Newsletter checkbox -->
        <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
          <input type="checkbox" name="newsletter"
            className="mt-0.5 w-4 h-4 rounded border-line text-navy focus:ring-navy" />
          <span className="text-[13px] text-ink">
            Chci dostavat novinky a akce na e-mail
          </span>
        </label>

        <!-- Submit -->
        <button type="submit" className="w-full h-[44px] bg-navy text-white text-[13px]
          font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)]
          hover:bg-ink transition-colors">
          Vytvorit ucet
        </button>
      </form>
    </div>

    <!-- Already have account -->
    <p className="text-center text-[13px] text-muted mt-5">
      Uz mas ucet?
      <a href="/prihlaseni" className="text-blue hover:underline ml-1">Prihlas se</a>
    </p>

  </div>
</div>
```

### Server Action: `registerUser`
- Validate: email unique, password >= 8 chars, passwords match
- Hash password with bcryptjs
- Create user in DB
- Create session (set cookie)
- Redirect to `/ucet`
- Error handling: show inline error messages (email taken, weak password)

### Error Display
Use `useActionState` (React 19) for form errors. Show errors as:
```
<p className="text-[13px] text-sale mt-1.5">Tento e-mail je jiz registrovany.</p>
```

### Metadata
```typescript
export const metadata: Metadata = {
  title: "Registrace | Qsport.cz",
  description: "Vytvor si ucet na Qsport.cz — sleduj objednavky a nakupuj rychleji.",
};
```

---

## 4. Login Page — `src/app/(public)/prihlaseni/page.tsx` (CREATE)

**URL:** `/prihlaseni`

### Design Spec
Same centered card layout as registration but simpler (fewer fields).

```
<div className="min-h-[60vh] flex items-center justify-center py-12">
  <div className="w-full max-w-[440px] mx-auto px-6">

    <!-- Heading -->
    <div className="text-center mb-8">
      <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
        Prihlaseni
      </h1>
      <p className="text-[14px] text-muted">
        Vitej zpet. Prihlas se ke svemu uctu.
      </p>
    </div>

    <!-- Form card -->
    <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
      <form>
        <div className="mb-4">
          <label>E-mail</label>
          <input type="email" ... />
        </div>
        <div className="mb-6">
          <label>Heslo</label>
          <input type="password" ... />
        </div>

        <button type="submit" className="w-full h-[44px] bg-navy ...">
          Prihlasit se
        </button>
      </form>
    </div>

    <!-- Register link -->
    <p className="text-center text-[13px] text-muted mt-5">
      Jeste nemas ucet?
      <a href="/registrace" className="text-blue hover:underline ml-1">Zaregistruj se</a>
    </p>

  </div>
</div>
```

### Server Action: `loginUser`
- Find user by email
- Verify password with bcryptjs
- Create session (set cookie)
- Redirect to `/ucet` (or to `?redirect=` param if present)
- Error: "Nespravny e-mail nebo heslo." (generic, no info leak)

### Metadata
```typescript
export const metadata: Metadata = {
  title: "Prihlaseni | Qsport.cz",
  description: "Prihlas se ke svemu uctu na Qsport.cz.",
};
```

---

## 5. Account Dashboard — `src/app/(public)/ucet/page.tsx` (CREATE)

**URL:** `/ucet`

Protected page — redirects to `/prihlaseni?redirect=/ucet` if not logged in.

### Design Spec
Two-column layout: left sidebar nav + right content area. On mobile: stacked.

```
<div className="max-w-[var(--container)] mx-auto px-6 py-8">
  <Breadcrumbs items={[{ label: "Muj ucet" }]} />

  <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
    Muj ucet
  </h1>

  <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">

    <!-- Sidebar nav -->
    <nav className="flex lg:flex-col gap-2">
      <a className="active: bg-navy text-white rounded-[var(--radius-field)] ...">Prehled</a>
      <a>Objednavky</a>
      <a>Udaje a adresa</a>
      <a className="text-sale">Odhlasit se</a>
    </nav>

    <!-- Content: Dashboard overview -->
    <div>
      <!-- Welcome card -->
      <div className="bg-wash rounded-[10px] p-6 mb-6">
        <p className="text-[18px] font-bold text-navy">
          Ahoj, {firstName}!
        </p>
        <p className="text-[14px] text-muted mt-1">
          Tady najdes sve objednavky a osobni udaje.
        </p>
      </div>

      <!-- Quick stats: 2 cards in row -->
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="border border-line rounded-[10px] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted mb-1">
            Objednavky
          </p>
          <p className="text-[28px] font-extrabold text-navy">{orderCount}</p>
        </div>
        <div className="border border-line rounded-[10px] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted mb-1">
            Clen od
          </p>
          <p className="text-[18px] font-bold text-navy">{createdAt formatted}</p>
        </div>
      </div>

      <!-- Recent orders (last 3) -->
      <div className="border border-line rounded-[10px] p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[18px] font-bold text-navy">Posledni objednavky</h2>
          <a href="/ucet/objednavky" className="text-[13px] text-blue hover:underline">
            Zobrazit vse
          </a>
        </div>
        <!-- Order rows or empty state -->
        <p className="text-[14px] text-muted">Zatim zadne objednavky.</p>
      </div>

    </div>
  </div>
</div>
```

---

## 6. Account Orders — `src/app/(public)/ucet/objednavky/page.tsx` (CREATE)

**URL:** `/ucet/objednavky`

Protected page. Same sidebar layout.

### Content
Table/cards of user's orders:
- Order number (link to detail)
- Date
- Items count
- Total price (formatted)
- Status badge (same color scheme as admin):
  - NEW: `bg-sky text-blue` (brand blue, not generic)
  - CONFIRMED: `bg-[#FEF3C7] text-[#92400E]`
  - SHIPPED: `bg-lilac text-[#6B21A8]`
  - DELIVERED: `bg-mint text-[#166534]`
  - CANCELLED: `bg-[#FEE2E2] text-sale`

**Empty state:** "Zatim jsi u nas nic neobjednal/a. Mrkni, co mame noveho." + link to homepage.

**Mobile:** Cards instead of table (order number, date, total, status).

---

## 7. Account Order Detail — `src/app/(public)/ucet/objednavky/[id]/page.tsx` (CREATE)

**URL:** `/ucet/objednavky/{id}`

Protected — only show if order.userId matches current user.

### Content
- Breadcrumbs: Muj ucet / Objednavky / QS-20261108-0001
- Order number as H1
- Status badge (large)
- Timeline/progress bar: Objednavka -> Potvrzeno -> Odeslano -> Doruceno
  - Use lime color for completed steps, line for pending
- Items table: photo (small), product name (link), variant, qty, price
- Summary card: subtotal, shipping, total
- Shipping info: method name, pickup point (if Zasilkovna), tracking link
- Billing address

---

## 8. Account Settings — `src/app/(public)/ucet/udaje/page.tsx` (CREATE)

**URL:** `/ucet/udaje`

Protected page. Same sidebar layout.

### Content — Two form cards:

**Card 1: Osobni udaje**
- Jmeno, Prijmeni, E-mail (read-only badge), Telefon
- Save button
- Server action: `updateProfile`

**Card 2: Dorucovaci adresa**
- Ulice, Mesto, PSC
- Save button
- Server action: `updateAddress`

**Card 3: Zmena hesla**
- Stavajici heslo, Nove heslo, Nove heslo znovu
- Save button
- Server action: `changePassword`

Each card is separate form with its own submit — partial saves, no "save all" button.

---

## 9. Header Integration — `src/components/Header.tsx` (EDIT)

The user icon button (line 89) currently does nothing. Update it:

**Logged out:** Link to `/prihlaseni`
**Logged in:** Dropdown or link to `/ucet`

Since Header is a client component, we need to pass auth state. Options:
- **Option A (simple):** Make the user icon a Link to `/ucet`, and the `/ucet` page redirects to `/prihlaseni` if not logged in. No client-side auth check needed.
- **Option B:** Pass `user` prop from server layout, show dropdown with "Muj ucet" and "Odhlasit se".

**Go with Option A** for simplicity — change the button to:
```tsx
<Link href="/ucet" className="w-10 h-10 flex items-center justify-center text-ink hover:text-navy transition-colors" aria-label="Muj ucet">
  <!-- user SVG icon -->
</Link>
```

---

## 10. Logout — Server Action

`src/app/(public)/ucet/odhlasit/route.ts` (or inline server action):
- Destroy session cookie
- Redirect to `/`

---

## File Summary

| # | File | Action | Priority |
|---|------|--------|----------|
| 1 | `prisma/schema.prisma` | EDIT — add User model + userId on Order | Must |
| 2 | `src/lib/auth.ts` | CREATE — session/password helpers | Must |
| 3 | `src/app/(public)/registrace/page.tsx` | CREATE — registration page | Must |
| 4 | `src/app/(public)/prihlaseni/page.tsx` | CREATE — login page | Must |
| 5 | `src/app/(public)/ucet/page.tsx` | CREATE — account dashboard | Must |
| 6 | `src/app/(public)/ucet/objednavky/page.tsx` | CREATE — order history | Must |
| 7 | `src/app/(public)/ucet/objednavky/[id]/page.tsx` | CREATE — order detail | Must |
| 8 | `src/app/(public)/ucet/udaje/page.tsx` | CREATE — profile + address + password | Must |
| 9 | `src/components/Header.tsx` | EDIT — user icon links to /ucet | Must |
| 10 | `src/app/(public)/ucet/odhlasit/route.ts` | CREATE — logout endpoint | Must |
| 11 | `package.json` | EDIT — add bcryptjs dependency | Must |
| 12 | `.env.local` | EDIT — add SESSION_SECRET | Must |

**Post-implementation:** `npx prisma db push && npm install`

---

## Implementation Notes

- **No next-auth / auth.js** — too heavy for this simple use case. Cookie-based sessions with signed tokens.
- **bcryptjs** (not bcrypt) — pure JS, no native compilation issues.
- **Guest checkout preserved** — Order.userId is nullable, "Nakup bez registrace" claim in top bar stays true.
- **No email verification in v1** — ship simple, iterate later.
- **No password reset in v1** — can be added as follow-up (needs email sending).
- **Form validation:** Use Zod on server (already a dependency). Show errors inline via `useActionState`.
- **Brand consistency is CRITICAL:** Every form, card, button, badge must use the established design tokens. No generic gray forms. Use navy headings, lime accents, rounded-[10px] cards, pill buttons, Manrope font.
- **Account sidebar nav:** Active item uses `bg-navy text-white`, inactive uses `text-ink hover:bg-wash`. Pill shape: `rounded-[var(--radius-field)] px-4 py-2.5 text-[14px] font-medium`.
- **Mobile:** Sidebar becomes horizontal scroll strip or stacked tabs above content.
- **Tykani:** All copy uses "ty" form. "Vytvor si ucet", "Prihlas se", "Ahoj, Petro!", not "Vytvorte si ucet".
- **Next.js 16:** `params` is Promise, use `await`. Server actions with `"use server"`.
