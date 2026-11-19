# QA Report — Task #2: Homepage redesign

**Datum:** 2026-11-18  
**Kontrolor:** kontrolor agent

---

## 1. Build test

**VÝSLEDEK: PASS**

```
✓ Compiled successfully in 708ms
✓ Running TypeScript — no errors
✓ Generating static pages (26/26)
```

Žádné TypeScript chyby, žádné build errory.

---

## 2. Reverzní kontrola — odpovídá implementace zadání?

### Sekce "Výkon bez kompromisů" (Proč Qsport)

Zadání: nový design s ikonami, navy/mint/sky kartami.

**Implementováno:**
- Karta 01 "Nákup bez registrace" — `bg-navy`, ikona osoby v `text-lime`, velké číslo `text-lime`
- Karta 02 "Skladem ihned k odeslání" — `bg-mint`, ikona krabice v `text-navy`
- Karta 03 "Doprava a platba jasně" — `bg-sky`, ikona kamionu v `text-navy`

Každá karta má: velké pozadíové číslo, ikonový kruh, nadpis, popis. Layout `grid-cols-1 sm:grid-cols-3`.

**PASS** — navy/mint/sky karty s ikonami implementovány správně.

**Detail — ikona karty 01 (uživatel):**
```tsx
<path d="M16 3.13a4 4 0 0 1 0 7.75" />
```
Tato path přidává "skupinu lidí" efekt — správné pro "Nákup bez registrace".

### Sekce "Pro koho hledáš?" (gender karty)

Zadání: SVG siluety místo emoji.

**Implementováno:**
- Muži: SVG běžec (circle hlava + path torzo + nohy) — `text-navy/10 group-hover:text-navy/20`
- Ženy: SVG silueta (circle hlava + dress path) — `text-navy/10 group-hover:text-navy/20`
- Děti: SVG menší silueta (circle hlava + path tělo) — `text-navy/10 group-hover:text-navy/20`

SVG jsou umístěny `absolute right-2 bottom-2` jako dekorativní pozadí, text je `relative z-10` nad nimi.

**PASS** — emoji nahrazeny SVG silhouetami.

---

## 3. Simplify kontrola

**Ikony jako JSX v datové struktuře:** Každý objekt v `.map()` obsahuje inline JSX `icon: (<svg>...)`. Toto je mírně nestandardní (data smíchána s JSX), ale v Next.js/React je to běžný pattern pro server components. Extrakce do konstant by zlepšila čitelnost, ale není nutná.

**Duplicitní SVG arrow:** Arrow ikona `→` je duplikována v každé gender kartě (řádky 244-245). Mohla by být extrahována jako `<ArrowIcon />` component, ale jde o 3 použití — akceptovatelné.

**`bg-navy/10` Tailwind syntax na řádku 376:**
```tsx
<div className={`w-12 h-12 rounded-full ${box.accent}/10 flex ...`}>
```
`box.accent` je hodnota jako `"bg-lime"` nebo `"bg-navy"` — výsledný string bude `"bg-lime/10"` nebo `"bg-navy/10"`. Toto je dynamická Tailwind třída — **RIZIKO**: Tailwind JIT generuje CSS pouze pro staticky detekovatelné třídy. Dynamicky skládané třídy (`${box.accent}/10`) nemusí být v produkčním CSS.

**BLOCKER nalezen:** Dynamické Tailwind třídy `${box.accent}/10` nebudou v produkci fungovat pokud nejsou safelist-ovány nebo staticky přítomny v kódu.

---

## 4. Bug report

### BUG: Dynamická Tailwind třída — ikonový kruh nemusí mít správnou barvu pozadí v produkci

**Soubor:** `src/app/(public)/page.tsx`, řádek 376  
**Kód:**
```tsx
<div className={`w-12 h-12 rounded-full ${box.accent}/10 flex items-center justify-center mb-4`}>
```

**Problém:** `box.accent` nabývá hodnot `"bg-lime"`, `"bg-navy"`. Tailwind JIT scanuje statický zdrojový kód a hledá celé názvy tříd. String `"bg-lime/10"` nebo `"bg-navy/10"` sestavený za runtime nebude v CSS — div bude bez pozadí.

**Dopad:** Vizuální — ikonový kruh bude průhledný místo tónu. Nefunkčnost, ne crash.

**Oprava (doporučení pro implementátora):** Nahradit dynamické skládání statickými třídami přímo v datech:
```tsx
// místo: accent: "bg-lime"
iconBg: "bg-lime/10"
// a použít: className={`... ${box.iconBg} ...`}
```
Nebo přidat do `tailwind.config.ts` safelist: `["bg-lime/10", "bg-navy/10"]`.

---

## Celkový verdikt

| Oblast | Stav |
|--------|------|
| Build | PASS |
| Sekce "Výkon bez kompromisů" — karty navy/mint/sky | PASS |
| Ikony v kartách | PASS |
| SVG siluety místo emoji | PASS |
| Simplify | PASS s výhradou |
| Dynamická Tailwind třída | **BUG (minor — vizuální)** |

**Task #2 je CONDITIONAL PASS.** Implementace je funkční, build prochází. Nalezen 1 minor vizuální bug (dynamická Tailwind třída). Implementátor by měl opravit `${box.accent}/10` na statické třídy.
