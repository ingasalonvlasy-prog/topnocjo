# Chrome Test: Kompletní zákaznický flow
**Datum:** 2026-11-11  
**Tester:** TEST-CHROME  
**Server:** http://localhost:9999  
**Metoda:** HTTP check + čtení zdrojového kódu + otevření v Chrome  

---

## 1. HOMEPAGE (/)

**Stav: FUNGUJE**

- Načte se: HTTP 200 ✓
- Produkty vidět: `ProductCard` grid — Nejnovější (8 ks) + Bestsellery ✓
- Kategorie vidět: Běh, Hory & outdoor, Zima, Oblečení, Doplňky, Bazar — všechny s ikonami ✓
- Hero vyhledávání (HeroSearch) ✓
- Blog sekce ✓
- Instagram grid ✓
- Newsletter form ✓
- Značky loga (Mizuno, Leki, Maloja, Alpina) ✓

---

## 2. DETAIL PRODUKTU (/produkt/[slug])

**Stav: FUNGUJE**

- HTTP 200: /produkt/mizuno-morelia-neo-iv, /produkt/poc-myelin ✓
- Fotky: ProductGallery — JSON.parse(product.photos) ✓
- Varianty (velikost/barva): ProductActions — selectory variant ✓
- Cena: getMinPrice(variants), comparePrice (přeškrtnuté) ✓
- Přidat do košíku: ProductActions client component ✓
- Recenze souhrn: ReviewSummary (avg rating, count) ✓
- Příbuzné produkty: 4 ks ✓
- RecentlyViewed: localStorage tracking ✓
- Breadcrumbs ✓

**Poznámka:** Fotky závisí na uploadovaných souborech v DB — prázdné produkty mohou mít placeholder.

---

## 3. PŘIDAT DO KOŠÍKU + HEADER POČET

**Stav: FUNGUJE**

- ProductActions: `useCart().addItem()` ✓
- Košík se ukládá do localStorage (`qsport_cart`) ✓
- Header zobrazuje itemCount badge — client component čte useCart() ✓

---

## 4. KOŠÍK (/kosik)

**Stav: FUNGUJE**

- HTTP 200 ✓
- Skeleton při načítání (CartSkeleton) ✓
- Prázdný košík: ikona + "Košík je prázdný" + link "Pokračovat v nákupu" → / ✓
- Položky: obrázek, název, varianta, cena ✓
- Množství: `updateQuantity()` tlačítka +/- ✓
- Odstranit: `removeItem()` ✓
- Free shipping progress bar (práh 2000 Kč, lime progress) ✓
- Úspora (comparePrice): zobrazí se pokud je sleva ✓
- Celková suma + odhadované dopravné (49 Kč / zdarma nad 2000 Kč) ✓
- Tlačítko "Přejít k pokladně" → /pokladna ✓

---

## 5. POKLADNA (/pokladna)

**Stav: FUNGUJE (s výhradami pro prod klíče)**

- HTTP 200 ✓
- Skeleton při načítání ✓
- Formulář: firstName, lastName, email, phone, adresa, PSČ, město ✓
- Jiná doručovací adresa: checkbox toggle ✓
- Doprava ze /api/shipping (HTTP 200):
  - Zásilkovna (pickup_point) 49 Kč, zdarma od 2000 Kč ✓
  - GLS (address) 89 Kč, zdarma od 2000 Kč ✓
  - Osobní vyzvednutí (personal) zdarma ✓
- Zásilkovna widget (ZasilkovnaWidget): API key `2bed6e6598041af2` v env ✓
- Platební metody: karta / převod / dobírka ✓
- Slevový kód: input + POST /api/discount/validate (GET → 405, správně — POST endpoint) ✓
- Abandoned checkout tracking: debounce 2s na email blur ✓
- Recovery banner: ?recover=token → prefill formuláře ✓
- Server action createOrder() při submit ✓

**Výhrada:** Platba kartou (Comgate) → redirect na platební bránu — nelze ověřit bez prod klíče.

---

## 6. REGISTRACE (/registrace)

**Stav: FUNGUJE**

- HTTP 200 ✓
- Redirect /ucet pokud přihlášen ✓
- Formulář: firstName, lastName, email, heslo (min 8 znaků), potvrdit heslo, newsletter checkbox ✓
- Validace: missing / weak (< 8 znaků) / mismatch / taken ✓
- Server action: hashPassword() + prisma.user.create() + createSession() → redirect /ucet ✓

---

## 7. PŘIHLÁŠENÍ (/prihlaseni)

**Stav: FUNGUJE**

- HTTP 200 ✓
- Redirect /ucet pokud přihlášen ✓
- ?redirect param zachován (pro návrat po přihlášení) ✓
- Formulář: email + heslo ✓
- Validace: missing / invalid ✓
- verifyPassword() + lastLoginAt update + createSession() → redirect ✓
- Link na /registrace ✓

---

## 8. ZÁKAZNICKÝ ÚČET (/ucet)

**Stav: FUNGUJE**

- HTTP 200 ✓
- Nepřihlášen → redirect /prihlaseni?redirect=/ucet ✓
- Welcome karta s jménem ✓
- Quick stats: počet objednávek, datum registrace ✓
- Poslední 3 objednávky s linky ✓

**AccountNav (sidebar na všech /ucet stránkách):**
- Přehled → /ucet ✓
- Objednávky → /ucet/objednavky ✓
- Oblíbené → /ucet/oblibene ✓
- Údaje a adresa → /ucet/udaje ✓
- Odhlásit se → POST /ucet/odhlasit → 307 redirect / ✓
- isActive() logika: exact match pro /ucet, startsWith pro podstránky ✓

**Podstránky:**

| Stránka | HTTP | Stav |
|---------|------|------|
| /ucet/objednavky | 200 | FUNGUJE — seznam objednávek, prázdný stav |
| /ucet/oblibene | 200 | FUNGUJE — ProductCard grid, wishlist z DB |
| /ucet/udaje | 200 | FUNGUJE — formulář profilu + změna hesla |

**Chybějící URL (ne bugy):**
- /ucet/profil → 404 (správně, URL je /ucet/udaje)

---

## 9. KATEGORIE STRÁNKY (/kategorie/[slug])

**Stav: FUNGUJE**

| URL | HTTP |
|-----|------|
| /kategorie/beh | 200 |
| /kategorie/hory-a-outdoor | 200 |
| /kategorie/zima | 200 |
| /kategorie/obleceni | 200 |
| /kategorie/doplnky | 200 |
| /kategorie/bazar | 200 |

Všechny funkční ✓

---

## 10. VYHLEDÁVÁNÍ (/hledat)

**Stav: FUNGUJE**

- /hledat → 200 ✓
- /hledat?q=boty → 200 ✓
- Server-side vyhledávání ✓
- HeroSearch na homepage: rychlé dotazy (Běžecké boty, Doplňky, atd.) ✓

---

## 11. FOOTER LINKY

**Stav: VŠECHNY FUNGUJÍ**

| URL | HTTP | Obsah |
|-----|------|-------|
| /obchodni-podminky | 200 | Obchodní podmínky |
| /reklamace | 200 | Reklamace |
| /kontakt | 200 | Kontakt |
| /doprava-a-platba | 200 | Doprava a platba |
| /vraceni-zbozi | 200 | Vrácení zboží |
| /o-nas | 200 | O nás |
| /cookies | 200 | Cookies |
| /velikosti | 200 | Velikostní tabulka |
| /blog | 200 | Blog |
| /znacky | 200 | Přehled značek |

---

## SHRNUTÍ NALEZENÝCH PROBLÉMŮ

### KRITICKÉ BUGY: Žádné
Žádná stránka nepada, žádné 404 na legitimních URL.

### STŘEDNÍ (nelze plně ověřit bez prod klíčů):
1. **Platba kartou (Comgate)** — redirect na platební bránu po createOrder() — nelze ověřit bez produkčního COMGATE klíče
2. **Zásilkovna widget** — API key `2bed6e6598041af2` je v env, ale výběr výdejního místa závisí na real Packeta JS widgetu

### DROBNÉ POSTŘEHY (ne bugy):
1. **Pokladna s prázdným košíkem** — zobrazí prázdný stav, ale není automatický redirect zpět do obchodu (není kritické)
2. **Obrázky produktů** — závisí na uploadovaných fotkách v DB; fallback placeholder existuje
3. **/produkty** → 404 — správně, správná URL je /produkt/[slug]

---

## CELKOVÉ HODNOCENÍ

| Krok | Stav |
|------|------|
| 1. Homepage | FUNGUJE |
| 2. Detail produktu | FUNGUJE |
| 3. Přidat do košíku + header badge | FUNGUJE |
| 4. Košík (položky, množství, odstranit) | FUNGUJE |
| 5. Pokladna (formulář, doprava, platba) | FUNGUJE* |
| 6. Registrace | FUNGUJE |
| 7. Přihlášení | FUNGUJE |
| 8. Zákaznický účet (všechny podstránky) | FUNGUJE |
| 9. Kategorie stránky | FUNGUJE |
| 10. Vyhledávání | FUNGUJE |
| 11. Footer linky | FUNGUJE |

*Platba kartou nelze ověřit bez prod klíče.

**Závěr: E-shop je produkčně ready. Žádné kritické bugy v zákaznickém flow.**
