# Plán: TASK-037 — Dodavatelé admin

**Priorita:** 3
**Soubory k úpravě:**
- `prisma/schema.prisma` — Supplier model (řádky 242-258)
- `src/app/(admin)/admin/dodavatele/page.tsx` (250 řádků)
- `src/app/(admin)/admin/dodavatele/[id]/page.tsx` (293 řádků)

---

## Analýza stávajícího stavu

### Co je hotovo (85%):

#### Supplier model:
- `name`, `code` (unique), `feedUrl`, `feedFormat`, `feedConfig` (JSON)
- `active`, `lastImportAt/Status/Count/Error`

#### Seznam (page.tsx):
1. **Tabulka dodavatelů** — název, kód, formát, poslední import, stav (OK/Partial/Chyba), akce
2. **Tlačítko "Importovat všechny"** — `triggerAllImports()` volá `runAllFeedImports()`
3. **Formulář "Přidat dodavatele"** — název, kód, feed URL, formát (xml/csv/json)
4. **Poslední importy** — 20 logů s status tečkou, updated/zeroed, duration, datum

#### Detail ([id]/page.tsx):
1. **Edit formulář** — název, kód, feed URL, formát, feed config (JSON textarea), aktivní toggle
2. **Poslední import status** — barevný banner (zelený/žlutý/červený)
3. **Import log** — 20 posledních logů
4. **Smazat dodavatele** — s upozorněním (supplierStock zůstane)
5. **Importovat teď** — button v headeru

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Kontaktní údaje (kontakt, email, web) | Chybí v modelu | NÍZKÁ |
| 2 | Poznámky | Chybí v modelu | NÍZKÁ |
| 3 | Feed URL přehled v seznamu | Chybí (jen formát) | NÍZKÁ |
| 4 | Import bot konfigurace popis | Částečně (feedConfig JSON) | NÍZKÁ |

---

## Řešení

### Krok 1: Rozšířit Supplier model

**Soubor:** `prisma/schema.prisma`

```diff
 model Supplier {
   id               String    @id @default(cuid())
   name             String
   code             String    @unique
+  contactName      String?
+  contactEmail     String?
+  contactPhone     String?
+  website          String?
+  note             String?
   feedUrl          String
   feedFormat       String
   feedConfig       String    @default("{}")
   active           Boolean   @default(true)
   lastImportAt     DateTime?
   lastImportStatus String?
   lastImportCount  Int?
   lastImportError  String?
   createdAt        DateTime  @default(now())
   updatedAt        DateTime  @updatedAt

   @@map("suppliers")
 }
```

**Po editaci:** `npx prisma db push` (SQLite nemá migrace v dev)

---

### Krok 2: Rozšířit formulář přidání dodavatele

**Soubor:** `src/app/(admin)/admin/dodavatele/page.tsx`

#### 2a. Rozšířit `createSupplier` server action (řádky 6-22)

Přidat parsing nových polí:

```tsx
async function createSupplier(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  const feedUrl = (formData.get("feedUrl") as string)?.trim();
  const feedFormat = (formData.get("feedFormat") as string) || "xml";
  // Nová pole:
  const contactName = (formData.get("contactName") as string)?.trim() || null;
  const contactEmail = (formData.get("contactEmail") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!name || !code || !feedUrl) return;

  await prisma.supplier.create({
    data: { name, code, feedUrl, feedFormat, contactName, contactEmail, website, note },
  });

  revalidatePath("/admin/dodavatele");
  redirect("/admin/dodavatele");
}
```

#### 2b. Rozšířit formulář v UI (řádky 166-211)

Přidat nová pole do grid formu. Změnit grid z `lg:grid-cols-5` na dvou-řádkový layout:

```tsx
<form action={createSupplier} className="space-y-4">
  {/* Řádek 1: Povinná pole */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
    {/* ... stávající: název, kód, feed URL, formát, tlačítko ... */}
  </div>
  {/* Řádek 2: Volitelná pole */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Kontaktní osoba</label>
      <input name="contactName" placeholder="Jan Novák" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none" />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
      <input name="contactEmail" type="email" placeholder="info@dodavatel.cz" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none" />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Web</label>
      <input name="website" placeholder="https://..." className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none" />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Poznámka</label>
      <input name="note" placeholder="Interní poznámka..." className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none" />
    </div>
  </div>
</form>
```

#### 2c. Rozšířit tabulku o kontaktní sloupec

Přidat sloupec "Kontakt" do tabulky (řádky 89-161):

```tsx
{/* Nový th po "Formát" */}
<th className="text-left px-4 py-3 font-medium text-gray-500">Kontakt</th>

{/* Nový td po formátu */}
<td className="px-4 py-3">
  {s.contactEmail ? (
    <a href={`mailto:${s.contactEmail}`} className="text-xs text-green-600 hover:text-green-800">
      {s.contactName || s.contactEmail}
    </a>
  ) : (
    <span className="text-xs text-gray-400">—</span>
  )}
</td>
```

Aktualizovat `colSpan` na empty state z 5 na 6.

---

### Krok 3: Rozšířit detail formulář

**Soubor:** `src/app/(admin)/admin/dodavatele/[id]/page.tsx`

#### 3a. Rozšířit `updateSupplier` server action (řádky 6-31)

Přidat parsing nových polí:

```tsx
const contactName = (formData.get("contactName") as string)?.trim() || null;
const contactEmail = (formData.get("contactEmail") as string)?.trim() || null;
const contactPhone = (formData.get("contactPhone") as string)?.trim() || null;
const website = (formData.get("website") as string)?.trim() || null;
const note = (formData.get("note") as string)?.trim() || null;

await prisma.supplier.update({
  where: { id },
  data: { name, code, feedUrl, feedFormat, feedConfig, active, contactName, contactEmail, contactPhone, website, note },
});
```

#### 3b. Přidat kontaktní sekci do formuláře

Za "Nastavení" sekci (řádek 149-239) přidat nový box:

```tsx
{/* Kontaktní údaje */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4 mb-6">
  <h2 className="text-lg font-semibold text-gray-900">Kontaktní údaje</h2>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Kontaktní osoba</label>
      <input
        name="contactName"
        defaultValue={supplier.contactName || ""}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
      <input
        name="contactEmail"
        type="email"
        defaultValue={supplier.contactEmail || ""}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
      <input
        name="contactPhone"
        defaultValue={supplier.contactPhone || ""}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Web</label>
      <input
        name="website"
        defaultValue={supplier.website || ""}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
      />
    </div>
  </div>

  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">Poznámka</label>
    <textarea
      name="note"
      defaultValue={supplier.note || ""}
      rows={3}
      placeholder="Interní poznámka k dodavateli..."
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none resize-y"
    />
  </div>
</div>
```

**POZOR:** Tento box musí být UVNITŘ `<form action={updateSupplier}>` — přesunout před feed config sekci, nebo split form. Nejjednodušší: přidat pole do stávající "Nastavení" sekce (řádek 149) jako nový blok uvnitř.

**Lepší řešení:** Přidat kontaktní pole DO stávajícího formuláře mezi "Formát feedu + Aktivní" (řádek 207) a "Feed Config" (řádek 209):

```tsx
{/* Mezi řádek 207 (grid s formátem) a řádek 209 (feed config) */}

{/* Kontaktní údaje */}
<div className="border-t border-gray-200 pt-4 mt-4">
  <h3 className="text-sm font-semibold text-gray-700 mb-3">Kontaktní údaje</h3>
  <div className="grid grid-cols-2 gap-4">
    {/* contactName, contactEmail, contactPhone, website inputs */}
  </div>
  <div className="mt-3">
    {/* note textarea */}
  </div>
</div>
```

---

### Krok 4: Feed config nápověda

**Soubor:** `src/app/(admin)/admin/dodavatele/[id]/page.tsx`

Rozšířit popis pod feed config textarea (řádek 227-228):

```tsx
<p className="text-xs text-gray-400 mt-1">
  Pole: sku, name, size, color, price, comparePrice, stock, csvDelimiter, csvEncoding, xmlItemPath, jsonItemPath, priceMultiplier, priceInCents, stockMapping
</p>
<details className="mt-2">
  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ukázka konfigurace</summary>
  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs font-mono text-gray-500 overflow-x-auto">
{`{
  "xmlItemPath": "products.product",
  "sku": "code",
  "name": "name",
  "size": "size",
  "color": "color",
  "price": "price_vat",
  "stock": "stock_quantity",
  "priceInCents": false,
  "priceMultiplier": 1
}`}
  </pre>
</details>
```

---

## Shrnutí

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `prisma/schema.prisma` | +5 polí na Supplier | +5 |
| 2 | `dodavatele/page.tsx` | Kontaktní pole v přidání + sloupec v tabulce | +25 |
| 3 | `dodavatele/[id]/page.tsx` | Kontaktní sekce + note + config nápověda | +45 |

**Celkem:** ~75 řádků, 2 existující + schema

---

## Závislosti
- **Prisma push** nutný po změně schema (`npx prisma db push`)
- `runFeedImport` a `runAllFeedImports` z `src/lib/feed.ts` zůstávají beze změn — kontaktní údaje je nemění
- Stávající dodavatelská data zůstanou, nová pole budou `null`

## Rizika
- **Minimální** — přidání nullable polí na model je bezpečná migrace
- Feed config JSON se nemění, jen se přidá lepší dokumentace
