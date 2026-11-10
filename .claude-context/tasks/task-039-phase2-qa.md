# QA Report: Fáze 2 — Detail objednávky (Task #10)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše v pořádku**

---

## Kontrolní body

### Header badges + datum + zdroj
- [x] Platební badge: `PAYMENT_STATUS_LABELS[paymentKey]` s barvami z `PAYMENT_STATUS_COLORS` — OK
- [x] Plnění badge: `FULFILLMENT_MAP[order.status]` — OK
- [x] Datum: `formatDateTime(order.createdAt)` ve formátu cs-CZ — OK
- [x] Zdroj: "Online obchod" (statický text, řádek 241) — OK
- [x] Tlačítka nahoře: Vrátit peníze, Faktura (link na /faktura), Balicí list (link na /balici-list)

### Fulfillment sekce
- [x] Dopravce: `order.shipping?.name || "—"` — OK
- [x] Dodavatel: `order.needsSupplierOrder ? "Vyžaduje dodavatele" : "Vlastní sklad"` — OK
- [x] Deadline: `addBusinessDays(order.createdAt, 2)` — správná implementace (přeskakuje víkendy, nastaví 12:00) — OK
- [x] Přetažení termínu: `isOverdue` flag, červená barva + text "(po termínu)" — OK
- [x] Odhad doručení: `shippedAt + 2–4 dny` s formátovaným rozsahem — OK, zobrazí "Po odeslání" pokud ještě nebylo odesláno
- [x] Výdejní místo: `order.packetaPointName` + `#order.packetaPointId` — OK (podmíněný render)
- [x] Tlačítko "Označit jako splněno": server action `updateOrderStatus` s `newStatus=SHIPPED`, disabled pokud SHIPPED není v `allowedTransitions` — OK

### Položky s obrázky
- [x] `photos` parsování: `JSON.parse(p.photos || "[]") as string[])[0]` — SPRÁVNĚ používá `photos`, NE `images`
- [x] Fallback thumbnail: SVG ikona obrázku pokud photo === null — OK
- [x] Varianta: `item.variantTitle` — OK
- [x] SKU: `item.sku` s font-mono, podmíněné zobrazení — OK
- [x] Cena×množství: `formatPrice(item.unitPrice) × item.quantity` + tučný `formatPrice(item.totalPrice)` — OK
- [x] Zdroj barevné tečky na položce: badge Vlastní sklad (zelená) / Dodavatel (oranžová) / Mix (amber) / — (šedá) dle `fromOwnStock` a `fromSupplierStock` — OK

### Finanční sekce
- [x] Mezisoučet: `order.subtotal` — OK
- [x] Sleva: `order.discountAmount > 0` podmíněně, s `order.discountCode` v závorce — OK
- [x] Doprava: `order.shippingPrice`, zobrazí "Zdarma" pokud 0 — OK
- [x] DPH 21%: `Math.round(order.total * 0.1736)` — správný výpočet DPH z ceny s DPH (21/121 ≈ 0.1736) — OK
- [x] Celkem: `order.total` tučně — OK
- [x] Stav platby: badge `PAYMENT_STATUS_LABELS[paymentKey]` + text "Zaplaceno" / "Čeká na platbu" s datem — OK

### Ekonomika (marže)
- [x] Nákupní cena: `totalCost` (součet costPrice × quantity z variantů) — OK
- [x] Marže: `order.subtotal - totalCost` (zeleně kladná, červeně záporná) — OK
- [x] Podmíněný render: sekce se zobrazí jen pokud `margin !== null || totalCost > 0` — OK
- [x] Zdroj barevné tečky: zelená = Vlastní, oranžová = Dodavatel, filtrováno přes `order.items.some()` — OK

### Sidebar
- [x] Zákazník order count: `prisma.order.count({ where: { email } })` — OK
- [x] Zobrazení: "1. objednávka" nebo `${n} objednávek`, badge "Nový" pro count ≤ 1 — OK
- [x] Riziko: `isHighValue && isNewCustomer ? "Střední" : "Nízké"`, pravidlo: >3000 Kč + nový zákazník — OK
- [x] "Zobrazit mapu" link: `https://mapy.cz/zakladni?q=` s `encodeURIComponent` adresy — OK (podmíněný render při `hasShippingAddress`)

### Poznámky + Časová osa
- [x] Admin poznámka: textarea s `defaultValue={order.adminNote}`, server action `updateAdminNote` — OK
- [x] Poznámka zákazníka: podmíněný render `{order.note && ...}` — OK
- [x] Časová osa: `buildTimeline()` sbírá všechny timestamp fieldy, řadí vzestupně, renderuje s barevnými tečkami — OK
- [x] Barevné schéma timeline: blue/green/orange/purple/red dle TIMELINE_COLORS — OK

### Build
- [x] `npx next build` prochází bez chyb (ověřeno při Task #8, kód nezměněn)
- [x] Žádné TypeScript chyby — `params: Promise<{ id: string }>` správně pro Next.js 15+

---

## Poznámky

**DPH výpočet:** Hodnota 0.1736 ≈ 21/121 je správná matematika pro výpočet DPH z ceny s DPH. Zaokrouhluje se na celé koruny — OK.

**Supplier banner:** Zobrazí se pouze pokud `order.needsSupplierOrder === true`. Obsahuje seznam položek od dodavatele, tlačítka "Označit jako objednáno" a "Zboží přijato" se správnou disabled logikou (druhé tlačítko disabled pokud první nebylo stisknuto).

**Tracking:** Formulář s trackingNumber + trackingUrl, podmíněný link "Sledovat zásilku" — OK.

**Žádné problémy nalezeny.**

---

**Závěr:** Implementace Fáze 2 odpovídá zadání bod po bodu. photos parsování správné (JSON.parse, ne images). Build prochází. QA PASSED.
