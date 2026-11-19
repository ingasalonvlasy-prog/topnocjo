# TASK-036: Chrome Test — Shipping selector + payment

**Datum:** 2026-11-12
**Tester:** TEST-CHROME agent
**Dev server:** http://localhost:9999

---

## Košík — dopravní karty

### 1. Počet karet: 4 (PASS)

Zobrazeny přesně 4 dopravní karty (Bretton.cz styl — velké klikatelné karty s ikonou):
1. **Zásilkovna** — Doručení na výdejní místo Zásilkovny (2-5 pracovních dnů) — Zdarma
2. **GLS ParcelShop** — Vyzvednutí na GLS výdejním místě — Zdarma
3. **GLS ParcelBox** — Vyzvednutí v GLS automatu — 24/7 — Zdarma
4. **GLS** — Doručení kurýrem GLS na adresu (1-3 pracovní dny) — Zdarma

### 2. Osobní vyzvednutí: NENÍ přítomno (PASS)

`bodyText.indexOf('Osobní vyzvednutí')` = -1 — karta se nezobrazuje ✅

### 3. Default výběr: Zásilkovna (PASS)

Po načtení košíku je Zásilkovna automaticky vybraná (`border-navy`).

---

## Widgety pod kartami

### 4. Zásilkovna → "Vybrat výdejní místo" (PASS)

Klik na Zásilkovnu kartu → pod kartou se zobrazí button:
- Text: **"Vybrat výdejní místo"** ✅
- Spustí Packeta widget (`window.Packeta.Widget.pick()`)

### 5. GLS ParcelShop → "Vybrat výdejní místo GLS" (PASS)

Klik na GLS ParcelShop kartu → pod kartou se zobrazí button:
- Text: **"Vybrat výdejní místo GLS"** ✅

### 6. GLS ParcelBox → "Vybrat GLS ParcelBox" (PASS)

Klik na GLS ParcelBox kartu → pod kartou se zobrazí button:
- Text: **"Vybrat GLS ParcelBox"** ✅

### 7. GLS na adresu → žádný widget (PASS)

Klik na GLS kartu → žádný "Vybrat" button se nezobrazí ✅
Souhrn: "Doprava (GLS) Zdarma"
CTA: "Pokračovat k pokladně" okamžitě aktivní (bg-lime)

---

## Pokladna

### 8. Navigace na pokladnu (PASS)

GLS na adresu vybrána → "Pokračovat k pokladně" link aktivní → navigace na `/pokladna` úspěšná.

### 9. Doprava jako READ-ONLY box s "Změnit" (PASS)

Sekce "3. Doprava" na pokladně:
- Zobrazuje: **"GLS / Zdarma / Změnit"** (READ-ONLY text)
- Žádný shipping selector / radio karty
- **"Změnit"** = `<a href="/kosik">` — odkaz zpět na košík ✅

### 10. Žádná sekce "Platba" (PASS)

Text "Platba" se na pokladně nevyskytuje vůbec ✅
Sekce formuláře: 1. Kontaktní údaje → 2. Fakturační adresa → 3. Doprava → 4. Slevový kód → 5. Poznámka → Rekapitulace

### 11. Submit button = "OBJEDNAT A ZAPLATIT" (PASS)

Submit button text: **"OBJEDNAT A ZAPLATIT"** ✅

---

## Souhrn

| Test | Výsledek |
|------|----------|
| 4 shipping karty zobrazeny | ✅ PASS |
| Osobní vyzvednutí NENÍ | ✅ PASS |
| Default Zásilkovna vybrána | ✅ PASS |
| Zásilkovna → "Vybrat výdejní místo" | ✅ PASS |
| GLS ParcelShop → "Vybrat výdejní místo GLS" | ✅ PASS |
| GLS ParcelBox → "Vybrat GLS ParcelBox" | ✅ PASS |
| GLS na adresu → žádný widget | ✅ PASS |
| Pokračovat k pokladně funguje | ✅ PASS |
| Doprava READ-ONLY + Změnit link | ✅ PASS |
| Žádná sekce Platba | ✅ PASS |
| Submit = "OBJEDNAT A ZAPLATIT" | ✅ PASS |

**Všechny testy prošly. Žádné bugy nenalezeny.**
