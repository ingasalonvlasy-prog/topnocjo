# TASK-027: Chrome Test — Doprava v košíku (flow)

**Datum:** 2026-11-12
**Tester:** TEST-CHROME agent
**Dev server:** http://localhost:9999 (port 9999, ne 3000)

---

## Testovací flow

Produkt v košíku: Mizuno Morelia Neo IV (vel. 41) + POC Myelin (M)

---

## 1. Zobrazení dopravních možností

**Stav: PASS**

Košík zobrazuje 3 dopravní karty (Bretton.cz styl — velké klikatelné karty):
- **Zásilkovna** — Doručení na výdejní místo Zásilkovny (2-5 pracovních dnů) — Zdarma
- **GLS** — Doručení kurýrem GLS na adresu (1-3 pracovní dny) — Zdarma
- **Osobní vyzvednutí** — Vyzvednete si objednávku osobně (po domluvě) — Zdarma

Každá karta má: ikona (SVG), název, popis, cena, radio indicator vpravo.

---

## 2. Default výběr: Zásilkovna

**Stav: PASS**

Po načtení košíku je Zásilkovna automaticky předvybraná (`border-navy` = aktivní karta).
GLS a Osobní mají `border-line` (neaktivní).

---

## 3. Zásilkovna bez výdejního místa — blokace CTA

**Stav: PASS**

Zásilkovna vybraná, výdejní místo nevybráno:
- Pod kartou se zobrazí "Vybrat výdejní místo" button (dashed border)
- CTA v souhrnu: **"VYBER VÝDEJNÍ MÍSTO"** (bg-lime/50 = disabled styl)
- Pokladna je zablokována dokud není vybráno místo

---

## 4. Zásilkovna widget

**Stav: PASS**

Klik na "Vybrat výdejní místo":
- Otevře Packeta widget (`window.Packeta.Widget.pick()`)
- Widget iframe: `https://widget.packeta.com/v6/#/?&country=cz&language=cs&appIdentity=qsport-esho`
- Iframe je viditelný (1200×874px), fullscreen overlay
- API key a appIdentity jsou nastaveny správně

Poznámka: Widget zavření testováno simulací výběru místa přes localStorage (cross-origin iframe nelze ovládat z rodiče).

---

## 5. Zásilkovna s výdejním místem — CTA odemknutí

**Stav: PASS**

Po výběru výdejního místa (packetaPointId nastaveno):
- CTA se změní na **"POKRAČOVAT K POKLADNĚ"** (bg-lime = aktivní)
- Souhrn: "Doprava (Zásilkovna) Zdarma"
- Navigace na `/pokladna` funguje

---

## 6. GLS (doručení na adresu)

**Stav: PASS**

Klik na GLS kartu:
- Karta se zvýrazní (`border-navy`)
- Zásilkovna a Osobní se deaktivují (`border-line`)
- Souhrn: "Doprava (GLS) Zdarma"
- CTA: **"POKRAČOVAT K POKLADNĚ"** okamžitě aktivní (bez výběru místa)
- Navigace na `/pokladna` → souhrn ukazuje "Doprava (GLS) Zdarma" ✅

---

## 7. Osobní vyzvednutí

**Stav: PASS**

Klik na Osobní vyzvednutí:
- Karta aktivní, pod ní info text: "Vyzvednete si objednávku osobně (po domluvě)"
- Souhrn: "Doprava (Osobní vyzvednutí) Zdarma"
- CTA: "POKRAČOVAT K POKLADNĚ" aktivní

---

## 8. Přenos dopravy na pokladnu

**Stav: PASS**

Testovány 2 scénáře:
1. **GLS → pokladna**: Souhrn na `/pokladna` = "Doprava (GLS) Zdarma" ✅
2. **Zásilkovna + výdejní místo → pokladna**: Souhrn = "Doprava (Zásilkovna) Zdarma" ✅

---

## Souhrn

| Test | Výsledek |
|------|----------|
| Zobrazení 3 dopravních karet | ✅ PASS |
| Default výběr Zásilkovna | ✅ PASS |
| Zásilkovna bez místa = CTA blokována | ✅ PASS |
| Zásilkovna widget se otevře (iframe) | ✅ PASS |
| Zásilkovna s místem = CTA aktivní | ✅ PASS |
| GLS výběr funguje | ✅ PASS |
| Osobní vyzvednutí funguje | ✅ PASS |
| Doprava přenesena na pokladnu | ✅ PASS |

**Všechny testy prošly. Žádné bugy nenalezeny.**

---

## Poznámky

- Dev server běží na portu **9999** (ne 3000) — spuštěn s `next dev -p 9999`
- Zásilkovna widget je Packeta official JS API (`window.Packeta.Widget.pick()`), otevírá cross-origin iframe — nelze ovládat z JS rodiče stránky
- Výběr výdejního místa uložen do localStorage (`qsport_shipping` klíč s `packetaPointId` a `packetaPointName`)
- Všechny ceny dopravy jsou "Zdarma" (objednávka 9280 Kč > freeFrom limit)
