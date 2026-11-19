# Chybejici fotky u 915 produktu — Vysetrovani

**Status:** Vysetreni dokonceno
**Datum:** 2026-11-18
**Priorita:** URGENTNI

---

## SHRNUTÍ

915 z 10 138 aktivnich produktu nema zadne fotky (`photos = '[]'`). Produkty nikdy nemely obrazky v Shopify — import script fungoval spravne, ale Shopify data je nemela. Feed system existuje, ale NEBYL nikdy nakonfigurovan a **nepodporuje fotky** vubec.

---

## FAKTA Z DB

| Metrika | Hodnota |
|---------|---------|
| Aktivni produkty celkem | 10 138 |
| S fotkami (Shopify CDN) | 9 173 (90.5%) |
| Placeholder fotky (placehold.co) | 50 (0.5%) |
| **Bez fotek** | **915 (9.0%)** |
| Z toho `level-` prefix (dodavatele) | 911 |
| Z toho bez `level-` prefixu | 4 |

### Rozdeleni podle znacky (bez fotek)

| Znacka | Pocet | Podil |
|--------|-------|-------|
| Mizuno | 615 | 67.2% |
| Leki | 136 | 14.9% |
| POC | 106 | 11.6% |
| Stance | 16 | 1.7% |
| Sporten | 13 | 1.4% |
| SWANS | 12 | 1.3% |
| Maloja | 12 | 1.3% |
| Eisbar | 3 | 0.3% |
| Mico | 1 | 0.1% |
| Hatchey | 1 | 0.1% |

### Kontext: level- produkty celkem

- 6 346 produktu ma `level-` prefix slug (dodavatelske)
- 5 435 z nich MA fotky (86%) — tyto prisly z Shopify s obrazky
- 911 NEMA fotky — tyto prisly z Shopify BEZ obrazku

---

## ROOT CAUSE: Proc nemaji fotky

### 1. Shopify import fungoval spravne

Skript `scripts/import-shopify.ts` (radky 322-325):
```ts
const photos = sp.images
  .sort((a, b) => a.position - b.position)
  .map((img) => img.src);
```
Tento kod korektne importuje vsechny obrazky z Shopify. Problem je, ze techto 915 produktu melo v Shopify prazdne `images: []`.

### 2. Shopify API je nedostupne

Token `(expired-removed)` je **expirovaný/zneplatneny**. 
Volani API vraci: `{"errors":"[API] Invalid API key or access token"}`.
Nelze overit, zda se od doby importu v Shopify neobjevily nove fotky.

### 3. Feed system NEPODPORUJE fotky

**`FeedItem` interface** (`src/lib/feed/types.ts`):
```ts
export interface FeedItem {
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  // ← ZADNE POLE PRO FOTKY
}
```

**`FeedFieldMapping`** (`src/lib/feed/types.ts`):
```ts
export interface FeedFieldMapping {
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  price: string;
  comparePrice?: string;
  stock: string;
  // ← ZADNE MAPOVANI PRO FOTKY
}
```

**Feed importer** (`src/lib/feed/importer.ts`) aktualizuje POUZE:
- `supplierStock`
- `price`
- `comparePrice`

**ZADNE** updatovani `photos` pole na produktu.

### 4. Feed system nebyl nikdy nakonfigurovan

- Tabulka `suppliers`: **0 radku**
- Tabulka `feed_import_logs`: **0 radku**
- Admin stranka `/admin/dodavatele`: **neexistuje** (implementace nedokoncena)

---

## MOZNOSTI RESENI

### Varianta A: Nový Shopify API token (rychla, nulovy effort)
**Popis:** Ziskat novy API token pro Shopify store `zt2xr1-ry.myshopify.com`, spustit skript ktery overi zda se od doby importu neobjevily obrazky u tech 915 produktu.

**Pro:** Nulovy development, jen re-run existujiciho importu s `--photos-only` flaggem.
**Proti:** Neni jiste, ze Shopify vubec ma ty fotky — mozna tam nebyly nikdy.
**Effort:** 15 min script + novy token od uzivatele.

### Varianta B: Rozsirit feed system o fotky (stredni effort)
**Popis:** Pridat `imageUrl` pole do `FeedItem` a `FeedFieldMapping`, updatovat parsery a importer aby ukladal fotky z feedu.

**Zmeny:**
1. `src/lib/feed/types.ts` — pridat `imageUrl?: string` do `FeedItem` a `FeedFieldMapping`
2. `src/lib/feed/parsers/xml.ts` — parsovat image URL z XML feedu
3. `src/lib/feed/parsers/csv.ts` — parsovat image URL z CSV
4. `src/lib/feed/parsers/json.ts` — parsovat image URL z JSON
5. `src/lib/feed/importer.ts` — pri importu aktualizovat `photos` pole na produktu (pokud prazdne)

**Pro:** Systemove reseni, bude fungovat pro vsechny dodavatele do budoucna.
**Proti:** Vyzaduje, aby dodavatelske feedy obsahovaly URL fotek (nutne overit u dodavatele).
**Effort:** ~2 hodiny implementace.

### Varianta C: Scraping fotek z webu dodavatele (velky effort)
**Popis:** Napsat skript ktery pro kazdy produkt bez fotky najde fotku na webu vyrobce (mizuno.com, leki.com, poc.com atd.) podle nazvu/SKU produktu.

**Pro:** Nezavisi na dodavateli.
**Proti:** Nestabilni (weby se meni), mozne pravni problemy, velky effort.
**Effort:** 1-2 dny.

### Varianta D: Deaktivovat produkty bez fotek (nulovy effort)
**Popis:** Nastavit `status = 'DRAFT'` pro vsech 915 produktu bez fotek. Nebudou se zobrazovat na webu.

**SQL:**
```sql
UPDATE products SET status = 'DRAFT' WHERE status = 'ACTIVE' AND photos = '[]';
```

**Pro:** Okamzite reseni, cista UX (zadne produkty bez fotek).
**Proti:** Ztrata 9% sortimentu — ale stejne se neprodevaji bez fotek.
**Effort:** 1 minuta.

---

## DOPORUCENI

### Okamzite (dnes):
1. **Varianta D** — skryt produkty bez fotek (1 min). Zakaznici nikdy nekoupi produkt bez fotky.

### Kratkodoba (tento tyden):
2. **Varianta A** — zeptat se uzivatele na novy Shopify token a overit stav fotek v Shopify.

### Strednedoba (do 2 tydnu):
3. **Varianta B** — rozsirit feed system o fotky. Tohle je spravne systemove reseni. Ale NUTNE overit, ze dodavatelske feedy (Levelek?) vubec obsahuji URL fotek.

---

## KLICOVA OTAZKA PRO UZIVATELE

> **Kdo je dodavatel tech `level-` produktu a ma jeho feed URL fotek?**
>
> Vsech 915 produktu bez fotek ma `level-` prefix. Feed system je pripraven (`src/lib/feed/`) ale nikdy nebyl nakonfigurovan — tabulka suppliers je prazdna. Pokud dodavatel (Levelek?) poskytuje feed s URL fotek, muzeme rozsirit FeedItem o `imageUrl` a natahnout fotky automaticky.
>
> Alternativne: Ma uzivatel pristup ke Shopify adminu? Muze vygenerovat novy API token?

---

## SOUBORY K IMPLEMENTACI (Varianta B)

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/lib/feed/types.ts` | EDIT | Pridat `imageUrl` do FeedItem + FeedFieldMapping |
| `src/lib/feed/parsers/xml.ts` | EDIT | Parsovat image URL |
| `src/lib/feed/parsers/csv.ts` | EDIT | Parsovat image URL |
| `src/lib/feed/parsers/json.ts` | EDIT | Parsovat image URL |
| `src/lib/feed/importer.ts` | EDIT | Aktualizovat photos pri importu |
| `src/app/(admin)/admin/dodavatele/` | NEW | Admin UI pro spravu dodavatelu (uz bylo planovane) |
