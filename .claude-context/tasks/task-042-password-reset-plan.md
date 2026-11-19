# TASK-040: Zapomenuté heslo — reset flow

## Přehled

Na přihlašovací stránce chybí "Zapomněli jste heslo?" a celý reset password flow.
Zákazník, který zapomene heslo, nemá jak obnovit přístup ke svému účtu.

**Priorita: VYSOKÁ — standardní e-shop feature.**

---

## FÁZE 1: Prisma schema — reset token fieldy

### Soubor: `prisma/schema.prisma`

**Přidat do modelu User (za `lastLoginAt`):**
```prisma
model User {
  // ... stávající fieldy ...
  lastLoginAt         DateTime?
  resetToken          String?   @unique   // <-- NOVÝ
  resetTokenExpiresAt DateTime?           // <-- NOVÝ
  // ...
}
```

**Po úpravě:**
```bash
npx prisma db push
```

---

## FÁZE 2: Token generování — helper funkce

### Soubor: `src/lib/auth.ts`

**Přidat import na začátek:**
```ts
import { randomBytes } from "crypto";
```
(createHmac je už importovaný, takže jen přidat `randomBytes` do destruktu)

**Přidat novou funkci:**
```ts
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}
```

---

## FÁZE 3: Email šablona — reset hesla

### Nový soubor: `src/lib/emails/password-reset.tsx`

Vzor z existujících šablon (order-confirmation.tsx):
- Import z `@react-email/components`
- Použití `EmailLayout` z `./layout`
- Styl konzistentní s ostatními emaily

```tsx
import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface PasswordResetProps {
  firstName?: string;
  resetUrl: string;
}

export function PasswordReset({ firstName, resetUrl }: PasswordResetProps) {
  return (
    <EmailLayout preview="Obnova hesla na Qsport.cz">
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        {firstName ? `Dobrý den, ${firstName},` : "Dobrý den,"}
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        obdrželi jsme žádost o obnovu hesla k Vašemu účtu na Qsport.cz.
        Klikněte na tlačítko níže pro nastavení nového hesla.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Link
          href={resetUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#0B1727",
            color: "#CEFF2F",
            padding: "12px 28px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          Nastavit nové heslo
        </Link>
      </Section>

      <Text style={{ fontSize: "12px", color: "#888", margin: "20px 0 0" }}>
        Odkaz je platný 1 hodinu. Pokud jste o obnovu hesla nežádali,
        tento email ignorujte — Váš účet zůstane beze změny.
      </Text>
    </EmailLayout>
  );
}
```

---

## FÁZE 4: Stránka "Zapomenuté heslo" — žádost o reset

### Nový soubor: `src/app/(public)/zapomenute-heslo/page.tsx`

**Metadata:**
```ts
export const metadata: Metadata = {
  title: "Zapomenuté heslo | Qsport.cz",
  description: "Obnova hesla k účtu na Qsport.cz.",
};
```

**Funkce stránky:**
- Server Component (stejně jako přihlašovací stránka)
- Server action `requestReset(formData)`:
  1. Vzít email z formuláře
  2. Najít uživatele: `prisma.user.findUnique({ where: { email } })`
  3. Pokud uživatel NEEXISTUJE → přesto zobrazit úspěch (zabránit enumeraci emailů!)
  4. Pokud existuje:
     - Vygenerovat token: `generateResetToken()`
     - Uložit: `prisma.user.update({ data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + 60*60*1000) } })`
     - Odeslat email: `sendEmail({ to: email, subject: "Obnova hesla", react: PasswordReset({ ... }) })`
  5. Redirect na `?sent=true`

**UI:**
- Stejný layout jako přihlašovací stránka (centered card 440px)
- Formulář: email input + submit button "Odeslat odkaz"
- Po odeslání (`?sent=true`): zelená zpráva "Na uvedený e-mail jsme odeslali odkaz pro obnovu hesla."
- Link zpět na přihlášení

**Vzor kódu (kompaktní):**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { PasswordReset } from "@/lib/emails/password-reset";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zapomenuté heslo | Qsport.cz",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sent = sp.sent === "true";

  async function requestReset(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) redirect("/zapomenute-heslo");

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = generateResetToken();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hodina

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiresAt },
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://qsport.cz";
      await sendEmail({
        to: email,
        subject: "Obnova hesla — Qsport.cz",
        react: PasswordReset({
          firstName: user.firstName || undefined,
          resetUrl: `${baseUrl}/obnova-hesla?token=${resetToken}`,
        }),
      });
    }

    // Vždy redirect na ?sent=true (i když user neexistuje — anti-enumeration)
    redirect("/zapomenute-heslo?sent=true");
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Zapomenuté heslo
          </h1>
          <p className="text-[14px] text-muted">
            Zadej svůj e-mail a pošleme ti odkaz pro obnovu hesla.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[14px] text-ink mb-2 font-bold">E-mail odeslán</p>
              <p className="text-[13px] text-muted">
                Pokud máte u nás účet, odeslali jsme Vám odkaz pro obnovu hesla.
                Zkontrolujte i složku spam.
              </p>
            </div>
          ) : (
            <form action={requestReset}>
              <div className="mb-6">
                <label className="block text-[13px] font-bold text-ink mb-1.5">E-mail</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Odeslat odkaz
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[13px] text-muted mt-5">
          <Link href="/prihlaseni" className="text-blue hover:underline">
            Zpět na přihlášení
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## FÁZE 5: Stránka "Obnova hesla" — nastavení nového hesla

### Nový soubor: `src/app/(public)/obnova-hesla/page.tsx`

**Metadata:**
```ts
export const metadata: Metadata = {
  title: "Obnova hesla | Qsport.cz",
};
```

**Funkce stránky:**
1. Vzít `token` ze searchParams
2. Ověřit token: `prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } } })`
3. Pokud neplatný/expired → zobrazit chybovou zprávu s odkazem na nový request
4. Pokud platný → formulář pro nové heslo (heslo + potvrzení)

**Server action `resetPassword(formData)`:**
1. Vzít token z hidden input + password + passwordConfirm
2. Znovu ověřit token v DB (race condition protection)
3. Validovat heslo (min 8 znaků, shoda)
4. Zahashovat: `hashPassword(password)`
5. Update: `prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiresAt: null } })`
6. Auto-login: `createSession(user.id)`
7. Redirect na `/ucet` s flash message

**Vzor kódu:**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Obnova hesla | Qsport.cz",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = sp.token as string | undefined;
  const error = sp.error as string | undefined;

  if (!token) {
    return <InvalidToken />;
  }

  // Ověřit platnost tokenu
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true, firstName: true },
  });

  if (!user) {
    return <InvalidToken />;
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const tokenValue = formData.get("token") as string;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    if (!password || password.length < 8) {
      redirect(`/obnova-hesla?token=${tokenValue}&error=weak`);
    }
    if (password !== passwordConfirm) {
      redirect(`/obnova-hesla?token=${tokenValue}&error=mismatch`);
    }

    // Znovu ověřit token (race condition)
    const targetUser = await prisma.user.findFirst({
      where: {
        resetToken: tokenValue,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!targetUser) {
      redirect("/zapomenute-heslo?error=expired");
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    await createSession(targetUser.id);
    redirect("/ucet");
  }

  const errorMessages: Record<string, string> = {
    weak: "Heslo musí mít alespoň 8 znaků.",
    mismatch: "Hesla se neshodují.",
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Nové heslo
          </h1>
          <p className="text-[14px] text-muted">
            Zadejte své nové heslo.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {error && (
            <p className="text-[13px] text-sale mb-4 p-3 bg-red-50 rounded-lg">
              {errorMessages[error] || "Něco se pokazilo."}
            </p>
          )}

          <form action={resetPassword}>
            <input type="hidden" name="token" value={token} />

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Nové heslo</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
              <p className="text-[12px] text-muted mt-1">Alespoň 8 znaků</p>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Heslo znovu</label>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
            >
              Nastavit heslo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InvalidToken() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-sale rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold text-navy mb-2">
          Neplatný odkaz
        </h1>
        <p className="text-[14px] text-muted mb-6">
          Odkaz pro obnovu hesla vypršel nebo je neplatný. Požádejte o nový.
        </p>
        <Link
          href="/zapomenute-heslo"
          className="inline-block h-[44px] leading-[44px] px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
        >
          Nový odkaz
        </Link>
      </div>
    </div>
  );
}
```

---

## FÁZE 6: Přidat odkaz na přihlašovací stránku

### Soubor: `src/app/(public)/prihlaseni/page.tsx`

**Přidat pod heslo input (mezi řádkem 94 a 97):**

Aktuální:
```tsx
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Heslo</label>
              <input ... />
            </div>
```

Přidat za `</div>` hesla, před submit button:
```tsx
            <div className="text-right mb-6 -mt-4">
              <Link href="/zapomenute-heslo" className="text-[12px] text-blue hover:underline">
                Zapomněli jste heslo?
              </Link>
            </div>
```

A přidat `import Link from "next/link"` (už je importován — ověřit).

---

## KONTROLNÍ SEZNAM PRO IMPLEMENTÁTORA

- [ ] Přidat `resetToken String? @unique` a `resetTokenExpiresAt DateTime?` do User v schema.prisma
- [ ] `npx prisma db push`
- [ ] Přidat `generateResetToken()` do auth.ts + import `randomBytes`
- [ ] Vytvořit email šablonu `src/lib/emails/password-reset.tsx`
- [ ] Vytvořit stránku `src/app/(public)/zapomenute-heslo/page.tsx`
- [ ] Vytvořit stránku `src/app/(public)/obnova-hesla/page.tsx`
- [ ] Přidat "Zapomněli jste heslo?" odkaz na přihlašovací stránku
- [ ] Ověřit build: `npm run build` (žádné TS chyby)
- [ ] Otestovat: odeslání emailu → klik na link → nastavení hesla → auto-login
- [ ] Otestovat: expirovaný token → chybová zpráva
- [ ] Otestovat: neexistující email → stejná "odeslán" zpráva (anti-enumeration)

## BEZPEČNOSTNÍ POZNÁMKY

1. **Anti-enumeration:** Vždy zobrazit "email odeslán" i pro neexistující emaily
2. **Token expiry:** 1 hodina — krátké ale dostatečné
3. **Token invalidace:** Po použití se token smaže z DB (null)
4. **Token formát:** 32 bytes hex = 64 znaků, kryptograficky bezpečný (randomBytes)
5. **Auto-login po resetu:** Bezpečné — uživatel právě prokázal vlastnictví emailu

## ODHAD ROZSAHU

~200 řádků nového kódu + 2 nové stránky + 1 email šablona + drobné úpravy ve 2 souborech
