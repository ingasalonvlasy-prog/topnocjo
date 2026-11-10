# Plán: TASK-030 — Admin doprava + Zásilkovna integrace

**Priorita:** 2
**Soubory k úpravě:**
- `src/app/(admin)/admin/doprava/page.tsx` (141 řádků)
- `src/app/(admin)/admin/doprava/[id]/page.tsx` (248 řádků)
- `src/components/ZasilkovnaWidget.tsx` (128 řádků)
- `src/app/(admin)/admin/objednavky/[id]/actions.ts` (140 řádků) — tracking

**Referenční soubory (READ ONLY):**
- `prisma/schema.prisma` — ShippingMethod model
- `src/app/(public)/pokladna/page.tsx` — checkout shipping integration
- `src/app/api/admin/zasilkovna/test/route.ts` — test endpoint

---

## Analýza stávajícího stavu

### Co je hotovo (90%):
1. **Admin seznam dopravních metod** — tabulka s toggle active, typ badges, cena, zdarma od
2. **Editace metody** — formulář s name, description, price, freeFrom, active, type
3. **Provider-specific config** — Zásilkovna (apiKey, senderLabel), GLS (note), pickup (address, note)
4. **ZasilkovnaConfig** admin komponenta — API klíč + sender label
5. **ZasilkovnaWidget** v pokladně — Packeta widget pro výběr výdejního místa
6. **Zdarma od X Kč** — `freeFrom` pole v ShippingMethod, respektováno v pokladně
7. **Osobní odběr** — typ "personal" s adresou v config
8. **API test endpoint** — `/api/admin/zasilkovna/test`

### Prisma model:
```prisma
model ShippingMethod {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  type        String   @default("address") // "address" | "pickup_point" | "personal"
  description String?
  price       Int      @default(0)
  freeFrom    Int?
  active      Boolean  @default(true)
  position    Int      @default(0)
  config      String   @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  orders      Order[]
  @@map("shipping_methods")
}
```

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Tracking číslo propojení se Zásilkovna API | Částečně (manual input) | STŘEDNÍ |
| 2 | Řazení dopravních metod (position) | Schema má `position`, UI chybí | NÍZKÁ |
| 3 | Přidání nové metody z admin UI | Chybí "Nová metoda" tlačítko | NÍZKÁ |

---

## Problém 1: Tracking — Zásilkovna API odesílání zásilky

### Aktuální stav:
- `admin/objednavky/[id]/actions.ts` má `updateTracking(id, trackingNumber)` — ukládá tracking číslo do DB a generuje tracking URL
- Tracking URL se generuje lokálně: `https://tracking.zasilkovna.cz/cs/${num}` pro Zásilkovna
- **Chybí:** automatické vytvoření zásilky v Zásilkovna API při odesílání

### Řešení — přidat Zásilkovna Packet Create API volání:

**Nový soubor:** `src/lib/zasilkovna.ts`

```tsx
const ZASILKOVNA_API_URL = "https://www.zasilkovna.cz/api/rest";

interface CreatePacketParams {
  apiKey: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressId: number; // pickup point ID
  value: number; // COD value in CZK, 0 for no COD
  weight: number; // weight in kg
  note?: string;
  senderLabel?: string;
}

export async function createZasilkovnaPacket(params: CreatePacketParams): Promise<{
  success: boolean;
  packetId?: string;
  barcode?: string;
  error?: string;
}> {
  // Zásilkovna REST API — XML-based
  // Documentation: https://docs.packetery.com/
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<createPacket>
  <apiPassword>${params.apiKey}</apiPassword>
  <packetAttributes>
    <number>${params.orderNumber}</number>
    <name>${params.firstName}</name>
    <surname>${params.lastName}</surname>
    <email>${params.email}</email>
    <phone>${params.phone}</phone>
    <addressId>${params.addressId}</addressId>
    <value>${params.value}</value>
    <weight>${params.weight}</weight>
    ${params.senderLabel ? `<eshop>${params.senderLabel}</eshop>` : ""}
  </packetAttributes>
</createPacket>`;

  try {
    const res = await fetch(ZASILKOVNA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });

    const text = await res.text();
    // Parse response XML for <id> and <barcode>
    const idMatch = text.match(/<id>(\d+)<\/id>/);
    const barcodeMatch = text.match(/<barcode>([^<]+)<\/barcode>/);
    const errorMatch = text.match(/<fault>([^<]+)<\/fault>/);

    if (idMatch) {
      return {
        success: true,
        packetId: idMatch[1],
        barcode: barcodeMatch?.[1],
      };
    }

    return {
      success: false,
      error: errorMatch?.[1] || "Neznámá chyba Zásilkovna API",
    };
  } catch (e) {
    return {
      success: false,
      error: `Zásilkovna API error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
```

### Integrace do admin objednávek:

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/actions.ts`

Při změně stavu na SHIPPED a pokud doprava = Zásilkovna, automaticky vytvořit zásilku:

```tsx
// V updateOrderStatus, po update na "SHIPPED":
if (newStatus === "SHIPPED" && order.shipping.code === "zasilkovna" && order.packetaPointId) {
  const config = JSON.parse(order.shipping.config || "{}");
  if (config.apiKey) {
    const result = await createZasilkovnaPacket({
      apiKey: config.apiKey,
      orderNumber: order.orderNumber,
      firstName: order.firstName,
      lastName: order.lastName,
      email: order.email,
      phone: order.phone || "",
      addressId: parseInt(order.packetaPointId, 10),
      value: order.paymentMethod === "cod" ? Math.round(order.total / 100) : 0,
      weight: 1, // default 1 kg — budoucí: kalkulace z produktů
      senderLabel: config.senderLabel,
    });

    if (result.success && result.packetId) {
      await prisma.order.update({
        where: { id },
        data: {
          trackingNumber: result.packetId,
          trackingUrl: `https://tracking.zasilkovna.cz/cs/${result.packetId}`,
        },
      });
    }
    // Log result (fire-and-forget, neblokovat stav objednávky)
  }
}
```

**Poznámka:** Zásilkovna REST API používá XML. Pro produkční nasazení je potřeba ověřit přesný formát s aktuální dokumentací. Alternativně lze použít Packetery REST API v2 (JSON), pokud je dostupné.

---

## Problém 2: Řazení dopravních metod (drag & drop nebo position)

### Aktuální stav:
- Schema má `position Int @default(0)` — seřazeno v DB query
- UI nemá možnost měnit pořadí

### Řešení — přidat position input do edit formuláře:

**Soubor:** `src/app/(admin)/admin/doprava/[id]/page.tsx`

Přidat pole pod "Typ doručení":

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Pořadí</label>
  <input
    name="position"
    type="number"
    min={0}
    defaultValue={method.position}
    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
  <p className="text-xs text-gray-400 mt-1">Nižší číslo = zobrazí se výš</p>
</div>
```

V server action `updateShippingMethod` přidat:
```tsx
const position = parseInt(formData.get("position") as string, 10) || 0;
// ...v data objektu:
data: { ...existing, position }
```

V list page (`page.tsx`) přidat position sloupec za "Zdarma od":
```tsx
<th className="text-left px-4 py-3 font-semibold text-gray-600">Pořadí</th>
// ...
<td className="px-4 py-3 text-gray-500">{m.position}</td>
```

---

## Problém 3: Přidání nové metody z admin UI

### Aktuální stav:
- Žádné "Nová metoda" tlačítko — dopravní metody se zřejmě seedly

### Řešení — ODLOŽIT:
Dopravní metody jsou stabilní (Zásilkovna + osobní odběr), přidávání nových z UI není kritické. Metody se mění konfigurací, ne vytvářením nových. Pokud bude potřeba, lze přidat seed script nebo dedikovanou stránku `/admin/doprava/nova`.

---

## Shrnutí implementačních kroků

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `src/lib/zasilkovna.ts` | NOVÝ — createZasilkovnaPacket helper | ~60 |
| 2 | `admin/objednavky/[id]/actions.ts` | Auto-create packet on SHIPPED | +20 |
| 3 | `admin/doprava/[id]/page.tsx` | Position pole + v action | +10 |
| 4 | `admin/doprava/page.tsx` | Position sloupec v tabulce | +4 |

**Celkem:** ~94 řádků, 3 existující soubory + 1 nový

---

## Závislosti
- Závisí na TASK-028 (objednávky actions) — ale ten je už hotov
- Zásilkovna API klíč: `2bed6e6598041af2` — uložen v shipping method config
- Pro produkci: ověřit Zásilkovna API formát s aktuální dokumentací

---

## Rizika
- Zásilkovna REST API může vyžadovat jiný formát XML — otestovat s testovacím režimem
- Weight kalkulace (1 kg default) — v budoucnu přidat váhu na produkt/variantu
- COD value — musí být v CZK (ne haléřích), ověřit konverzi
