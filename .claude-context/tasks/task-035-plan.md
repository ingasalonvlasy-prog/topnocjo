# Plán: TASK-035 — Admin nastavení e-shopu

**Priorita:** 3
**Soubory k úpravě:**
- `src/app/(admin)/admin/nastaveni/page.tsx` (218 řádků)
- `src/app/(admin)/admin/nastaveni/SettingsForm.tsx` (nutno přečíst)

---

## Analýza stávajícího stavu

### Co je hotovo (85%):
1. **StoreSettingsForm** — název obchodu, kontaktní údaje (přes `getAllSettings()`)
2. **EmailSettingsForm** — email nastavení + Resend status
3. **Platby** — Comgate merchant ID + testovací režim (readonly status)
4. **Doprava** — přehled aktivních metod s linkem na `/admin/doprava`
5. **Newsletter** — počet odběratelů + posledních 10
6. **Technické info** — framework, DB, prostředí, port

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Fakturační údaje (IČO, DIČ, sídlo) | Závisí na Settings modelu | NÍZKÁ |
| 2 | Logo upload/URL | Závisí na Settings | NÍZKÁ |
| 3 | Sociální sítě (IG, FB URL) | Závisí na Settings | NÍZKÁ |
| 4 | SEO defaults (title template, description) | Závisí na Settings | NÍZKÁ |
| 5 | API klíče přehled | Částečně (Comgate, Resend status) | NÍZKÁ |

---

## Řešení

Většina chybějících polí je otázka přidání dalších klíčů do Settings key-value store a rozšíření SettingsForm.

**Nutno přečíst:** `src/lib/settings.ts` a `SettingsForm.tsx` pro pochopení Settings modelu.

### Krok 1: Rozšířit settings klíče

V `StoreSettingsForm` přidat pole:
- `billing_name` — Fakturační název
- `billing_ico` — IČO
- `billing_dic` — DIČ
- `billing_address` — Fakturační adresa
- `social_instagram` — Instagram URL
- `social_facebook` — Facebook URL
- `logo_url` — Logo URL
- `seo_title_template` — "{page} | Qsport.cz"
- `seo_description` — Default meta description

### Krok 2: UI sekce v nastavení

Přidat do page.tsx nové sekce:

```tsx
{/* Fakturační údaje */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Fakturační údaje</h2>
  {/* IČO, DIČ, název, adresa */}
</div>

{/* Sociální sítě */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Sociální sítě</h2>
  {/* Instagram URL, Facebook URL */}
</div>

{/* SEO */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO výchozí hodnoty</h2>
  {/* Title template, description */}
</div>
```

---

## Shrnutí

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `nastaveni/page.tsx` | 3 nové sekce (fakturace, social, SEO) | +40 |
| 2 | `SettingsForm.tsx` | Nová pole v existujícím formuláři | +30 |

**Celkem:** ~70 řádků, 2 soubory

**Poznámka:** Implementace závisí na struktuře `getAllSettings()` a Settings modelu — implementátor musí přečíst `src/lib/settings.ts` a `SettingsForm.tsx` před začátkem.
