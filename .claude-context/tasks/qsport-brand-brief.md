# Qsport.cz — Brand & Design Brief

**Datum:** 2026-11-04
**Zdroj:** Uživatelovo zadání (kompletní brand manuál)

---

## Barvy

| Barva | HEX | Použití |
|-------|-----|---------|
| Navy | #0B1727 | hlavička, patička, hlavní tlačítka, nadpisy |
| Ink | #111C2E | běžný text |
| Limetková | #CEFF2F | akcent: cenovka, štítek Novinka, hover; NIKDY jako text na bílé |
| Modrá | #3157FF | odkazy, drobné akcenty |
| Wash | #F3F5F6 | pozadí sekcí |
| Linka | #DCE2E8 | okraje, oddělovače |
| Muted | #667085 | popisky, sekundární text |
| Mint | #DCECE4 | pozadí za fotkou — boty |
| Sky | #DBE5FF | pozadí za fotkou — brýle, helmy |
| Peach | #FFD9C8 | pozadí za fotkou — oblečení |
| Lilac | #E8E0FF | pozadí za fotkou — batohy |
| Červená | #C1121F | jen výprodej a přeškrtnutá cena |

## Písmo

Manrope (Google Fonts, latin-ext)
- Nadpisy: 800, letter-spacing -0.04em
- Text: 500
- Tlačítka/štítky: 700-800, uppercase, letter-spacing 0.12em
- Desktop: H1 56px, H2 36px, H3 22px, text 16px, popisky 13px
- Mobil: H1 36px, H2 26px, text 16px

## CSS Proměnné

```css
:root {
  --navy: #0B1727;
  --ink: #111C2E;
  --lime: #CEFF2F;
  --blue: #3157FF;
  --wash: #F3F5F6;
  --line: #DCE2E8;
  --muted: #667085;
  --mint: #DCECE4;
  --sky: #DBE5FF;
  --peach: #FFD9C8;
  --lilac: #E8E0FF;
  --sale: #C1121F;
  --font: 'Manrope', system-ui, sans-serif;
  --radius-card: 6px;
  --radius-field: 8px;
  --radius-pill: 999px;
  --space: 8px;
  --container: 1320px;
}
```

## Logo

- Logo "Linka" — SVG soubory (qsport-logo-web.svg, qsport-logo-web-bila.svg)
- Výška: 22-26px desktop, 18-20px mobil
- Favicon: navy čtverec s Q
- Ochranná zóna = výška písmene Q

## Homepage bloky (shora dolů)

1. Hero — navy pozadí, velký nadpis, limetkové tlačítko, produkty na pastelu
2. Prémiové značky — loga (On, POC, Maloja, Alpina, Mizuno, Leki)
3. Bestsellery — 4-8 karet
4. Kategorie — 4-6 dlaždic na pastelech
5. Série/akce — karusel
6. Proč Qsport — 3 boxy (Nákup bez registrace, Cena a dostupnost, Doprava a platba)
7. Instagram — mřížka 6 posledních příspěvků
8. Newsletter — navy pruh, email pole, limetkové tlačítko

## Hlavička

- Top bar navy 32px: "Nákup bez registrace · Doprava od 49 Kč · BAZAR" bílý text, limetková tečka
- Bílá lišta: logo vlevo, menu (Běh · Hory a outdoor · Zima · Oblečení · Doplňky · Značky · Bazar · Akce), vpravo hledání/účet/košík
- "Akce" červenou barvou
- Mobil: logo uprostřed, hamburger menu, hledání vždy viditelné

## Karta produktu

- Fotka 4:5 na pastelu podle kategorie
- Zaoblení 6px
- Značka/kategorie 11px uppercase
- Název 16px/700
- Cena 18px/800 navy, přeškrtnutá muted
- Hover: druhá fotka + stín + dostupné velikosti
- Badge: navy pozadí + limetkový text (NOVINKA, BESTSELLER)
- Sleva badge: červená #C1121F

## Detail produktu

- Galerie vlevo: fotky na pastelech (mix-blend-mode: multiply)
- Vpravo: značka/kategorie uppercase, název, cena, velikosti jako čipy, "Přidat do košíku", 3 řádky důvěry
- Tabs: popis, parametry, "Hodí se k tomu", podobné produkty
- Mobil: "Do košíku" sticky dole

## Tón

- Tykání všude
- Claim: "Qsport | výkon bez kompromisů"
- Doplňkově: "Venku je tvoje hřiště."
- Žádný merch/vlastní oblečení — Qsport PRODÁVÁ značky

## Mikrotexty

- Tlačítka: Nakupovat, Zobrazit vše, Vybrat velikost
- Detail: Přidat do košíku, Skladem – odešleme [doba], Velikost není skladem? Napiš nám
- Košík: Tvůj košík, Pokračovat k pokladně, Do dopravy zdarma ti chybí [X] Kč
- Prázdný košík: Zatím tu nic není. Mrkni na novinky.
- Newsletter: Novinky a akce jako první. / Přihlásit / Hotovo, jsi na seznamu.
- 404: Tady nic není. Venku je tvoje hřiště → zpět na hlavní stránku

## SEO

- Title: "[Název produktu] | Qsport.cz"
- Kategorie: "[Kategorie] – [značky] | Qsport.cz"
- Meta desc 140-155 znaků, tykání
- Alt = název produktu + barva

## Ceny

- Formát: "3 969 Kč" (mezera v tisících)
- Slevy: "−20 %" (s mezerou)
