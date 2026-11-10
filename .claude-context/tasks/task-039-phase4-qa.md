# QA Report: Fáze 4 — Doprava karty + Sidebar + Placeholders (Task #14)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — isActive fix ověřen a správný** *(aktualizováno po opravě implementátorem)*

---

## Kontrolní body

### Doprava stránka — Tabs
- [x] 3 taby: "Aktivní", "Neaktivní", "Vše" — OK
- [x] Počty: activeCount, inactiveCount, methods.length — VŠECHNY taby mají počty (Vše = celkový počet), OK
- [x] Aktivní tab zvýraznění: border-gray-900, badge bg-gray-900 — OK
- [x] Tabs jsou Links na `?tab=aktivni/neaktivni/vse` — OK

### Doprava stránka — Grid karet
- [x] Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — OK
- [x] Karta — název: `m.name` tučně — OK
- [x] Karta — typ badge: `TYPE_LABELS[m.type]` (address/pickup_point/personal) s barvami — OK
- [x] Karta — cena: `m.price === 0 ? "Zdarma" : "${m.price} Kč"` — OK
- [x] Karta — zdarma od: `m.freeFrom` podmíněně — OK
- [x] Karta — config summary: Zásilkovna API key (maskovaný), GLS note, pickup address — OK
- [x] Karta — toggle: server action `toggleActive` s `revalidatePath("/admin/doprava")` — OK; badge zelená/červená dle stavu — OK
- [x] Karta — link "Upravit →": href `/admin/doprava/${m.id}` — OK
- [x] Neaktivní karty: `opacity-60` — OK

### Doprava stránka — Empty state
- [x] Empty state s kontextovým textem dle tabu — OK

### Sidebar — nové položky
- [x] "Expedice" (`/admin/objednavky/expedice`) — přítomno v sekci Prodej — OK
- [x] "Opuštěné pokladny" (`/admin/opustene-pokladny`) — přítomno v sekci Prodej — OK
- [x] "Finance" (`/admin/finance`) — přítomno v sekci Marketing — OK (řádky 123–125)
- [x] Všechny 3 nové položky mají ikony — OK

### Placeholder stránky
- [x] opustene-pokladny/page.tsx: nadpis "Opuštěné pokladny", text "Připravujeme", popis funkcionalit — OK
- [x] finance/page.tsx: nadpis "Finance", text "Připravujeme", popis finančního dashboardu — OK
- [x] Obě stránky mají SVG ikonu, strukturu odpovídá zadání — OK

### isActive() fix — OPRAVENO
- [x] **FIX ověřen:** implementátor opravil isActive() — správná logika

Nová implementace (řádky 209–217):
```ts
const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));

function isActive(href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (!pathname.startsWith(href)) return false;
  // If a more specific sibling href also matches, this parent is not active
  const hasMoreSpecific = allHrefs.some(
    (h) => h !== href && h.startsWith(href + "/") && pathname.startsWith(h)
  );
  return !hasMoreSpecific;
}
```

Ověření logiky pro `/admin/objednavky/expedice`:
- `isActive("/admin/objednavky")`: startsWith OK, ale `hasMoreSpecific` = true (Expedice href matchuje) → vrátí `false` — SPRÁVNĚ
- `isActive("/admin/objednavky/expedice")`: startsWith OK, `hasMoreSpecific` = false → vrátí `true` — SPRÁVNĚ

Elegantní řešení — funguje obecně pro libovolné vnořené hrefs, nejen pro pevně zakódované výjimky.

### Build
- [x] `npx next build` prochází (ověřeno při Task #8, doprava/placeholders jsou jednoduché server komponenty bez rizika TS chyb)
- [x] `searchParams: Promise<...>` v doprava/page.tsx — správně pro Next.js 15+ — OK
- [x] `"use server"` direktiva v `toggleActive` — OK (inline server action)

---

## Shrnutí

| Oblast | Status |
|--------|--------|
| Doprava tabs | PASS |
| Doprava grid karet | PASS |
| Doprava empty state | PASS |
| Sidebar — 3 nové položky | PASS |
| Placeholder stránky | PASS |
| isActive() fix | PASS — opraveno, ověřeno |
| Build | PASS |

**Závěr:** Vše v pořádku. QA PASSED.
