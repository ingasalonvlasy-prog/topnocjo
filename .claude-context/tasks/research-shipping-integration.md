# Research: Integrace dopravců — Zásilkovna (Packeta) + GLS

**Datum:** 2026-11-06  
**Zdroje:** Oficiální docs, GitHub repozitáře, české e-shop platformy, PHP/Go/Python SDK

---

## 1. Zásilkovna / Packeta

### 1.1 Přehled architektury

Integrace Zásilkovny má 3 části:
1. **Widget v6** — JavaScript widget pro výběr výdejního místa v checkoutu
2. **SOAP/REST API** — backend pro vytváření zásilek, tisk štítků, tracking
3. **Admin nastavení** — API klíč, odesílatel, formát štítků

### 1.2 Widget v6 — Výběr výdejního místa (Checkout)

**Script URL:**
```html
<script src="https://widget.packeta.com/v6/www/js/library.js"></script>
```

**Inicializace a použití:**
```javascript
Packeta.Widget.pick(apiKey, callback, options, inElement?)
```

**Parametry `options`:**
| Parametr | Typ | Popis |
|----------|-----|-------|
| `language` | string | Jazyk UI (`'cs'`, `'sk'`, `'en'`) |
| `country` | string | Země (`'cz'`, `'sk'`) — povinné pokud není `carrierId` |
| `carrierId` | string | ID externího dopravce (pro ne-Packeta body) |
| `carriers` | string | Seznam carrier IDs nebo `'packeta'` pro interní body |
| `appIdentity` | string | Identifikace e-shopu/verze (doporučeno) |
| `weight` | number | Hmotnost v kg — filtruje body podle kapacity |
| `layout` | string | `'hd'` pro home delivery layout |
| `livePickupPoint` | bool | Zahrnout fyzické pobočky |

**Callback — Point objekt:**
```typescript
interface PacketaPoint {
  id: number;              // ID výdejního místa (= addressId pro API)
  name: string;            // Název místa
  city: string;            // Město
  street: string;          // Ulice
  zip: string;             // PSČ
  latitude: number;        // GPS
  longitude: number;       // GPS
  url: string;             // URL detailu místa
  photo: string;           // URL fotky
  openingHours: string;    // HTML otevírací doby
  carrierId: string;       // ID dopravce (pro externí body)
  carrierPickupPointId: string; // ID bodu u externího dopravce
}
```

**Kompletní příklad pro checkout:**
```html
<button id="packeta-selector-open" type="button">
  Vybrat výdejní místo Zásilkovna
</button>
<input type="hidden" id="packeta-point-id" name="packeta_point_id">
<input type="hidden" id="packeta-point-name" name="packeta_point_name">
<div id="packeta-point-display"></div>

<script>
document.getElementById('packeta-selector-open').addEventListener('click', function() {
  Packeta.Widget.pick(
    'YOUR_API_KEY',
    function(point) {
      if (point) {
        document.getElementById('packeta-point-id').value = point.id;
        document.getElementById('packeta-point-name').value = point.name;
        document.getElementById('packeta-point-display').textContent =
          'Vybráno: ' + point.name + ', ' + point.city;
      }
    },
    {
      language: 'cs',
      country: 'cz',
      appIdentity: 'Qsport.cz-v1.0',
      livePickupPoint: true
    }
  );
});
</script>
```

**Validace při odeslání objednávky:**
```javascript
form.addEventListener('submit', function(e) {
  if (isZasilkovnaSelected && !document.getElementById('packeta-point-id').value) {
    e.preventDefault();
    alert('Prosím, vyberte výdejní místo Zásilkovny.');
  }
});
```

### 1.3 SOAP/REST API — Backend

**Endpointy:**
- SOAP: `https://www.zasilkovna.cz/api/soap`
- SOAP WSDL: `https://www.zasilkovna.cz/api/soap.wsdl`
- REST: `https://www.zasilkovna.cz/api/rest/`

**Autentizace:** `apiPassword` — získá se v klientské sekci Zásilkovny (Integrace → API klíč). Náš klíč: `2bed6e6598041af2`

**Hlavní API metody:**

| Metoda | Popis |
|--------|-------|
| `createPacket(apiPassword, packetAttributes)` | Vytvoření zásilky → vrátí PacketIdDetail s barcode |
| `packetAttributesValid(apiPassword, packetAttributes)` | Validace atributů bez vytvoření |
| `packetLabelPdf(apiPassword, packetId, format, offset)` | PDF štítek zásilky |
| `packetTracking(apiPassword, packetId)` | Historie trackingu |
| `packetStatus(apiPassword, packetId)` | Aktuální stav |
| `packetInfo(apiPassword, packetId)` | Detailní info |
| `packetGetStoredUntil(apiPassword, packetId)` | Datum uložení |
| `barcodePng(barcode)` | PNG čárový kód |

**PacketAttributes — povinné a volitelné pole:**
```typescript
interface PacketAttributes {
  // POVINNÉ
  number: string;        // Číslo objednávky (unikátní ID)
  name: string;          // Jméno příjemce
  surname: string;       // Příjmení příjemce
  email: string;         // Email příjemce
  addressId: number;     // ID výdejního místa z widgetu (= point.id)
  value: number;         // Hodnota zásilky (CZK)
  eshop: string;         // Identifikátor e-shopu

  // VOLITELNÉ
  phone?: string;        // Telefon příjemce
  cod?: number;          // Dobírka (0 = bez dobírky)
  weight?: number;       // Hmotnost v kg
  currency?: string;     // Měna (default "CZK")
  company?: string;      // Firma příjemce
  note?: string;         // Poznámka
  street?: string;       // Ulice (pro doručení na adresu)
  houseNumber?: string;  // Číslo domu
  city?: string;         // Město
  zip?: string;          // PSČ
  carrierPickupPoint?: string; // ID bodu u externího dopravce
  size?: {               // Rozměry
    height: number;
    width: number;
    length: number;
  };
}
```

**Příklad vytvoření zásilky (Node.js koncept):**
```typescript
// POST to SOAP or REST endpoint
const packet = await packeta.createPacket(API_PASSWORD, {
  number: "QS-20261108-0001",
  name: "Jan",
  surname: "Novák",
  email: "jan@example.com",
  phone: "+420777123456",
  addressId: 79,           // z widgetu point.id
  value: 2490,
  cod: 0,                  // bez dobírky
  weight: 1.5,
  eshop: "Qsport.cz",
});
// → vrátí { id: "Z1435371000", barcode: "Z1435371000" }
```

**Tracking URL pro zákazníka:**
```
https://tracking.packeta.com/cs/?id=Z1435371000
```

**Štítek PDF:**
```typescript
const labelPdf = await packeta.packetLabelPdf(API_PASSWORD, packetId, "A7 on A4", 0);
// Vrátí base64-encoded PDF
```

### 1.4 Admin nastavení (co musí být v /admin/doprava)

Na základě analýzy Shoptet, WooCommerce a PrestaShop pluginů:

| Nastavení | Popis | Příklad |
|-----------|-------|---------|
| **API klíč (heslo)** | Z klientské sekce Zásilkovny | `2bed6e6598041af2` |
| **Odesílatel (Sender)** | Název odesílatele pro štítky | `Qsport.cz` |
| **Formát štítků** | A7 na A4 (4ks/strana) nebo A6 | `A7 on A4` |
| **Cena dopravy** | Základní cena | 49 Kč |
| **Doprava zdarma od** | Práh pro bezplatnou dopravu | 2000 Kč |
| **Aktivní** | Zapnout/vypnout metodu | true/false |
| **Hmotnostní limit** | Max hmotnost zásilky | 10 kg (default) |

**Pokročilé (fáze 2):**
- Hromadné odeslání objednávek do Zásilkovny
- Tisk štítků z admin panelu
- Automatický tracking update přes API

---

## 2. GLS (General Logistics Systems)

### 2.1 Přehled architektury

GLS integrace se skládá z:
1. **MyGLS API** — REST/SOAP API pro vytváření zásilek a tisk štítků
2. **Admin nastavení** — přihlašovací údaje, číslo klienta
3. **Tracking** — API pro sledování zásilek

GLS v ČR nabízí **pouze kurýrní doručení na adresu** (žádný výběr výdejních bodů v checkoutu → žádný widget).

### 2.2 MyGLS API

**Endpointy:**
- **Produkce CZ:** `https://api.mygls.cz/{ServiceName}.svc/{format}/{methodName}`
- **Test CZ:** `https://api.test.mygls.cz/{ServiceName}.svc/{format}/{methodName}`

Příklady:
```
POST https://api.mygls.cz/ParcelService.svc/json/PrintLabels
POST https://api.mygls.cz/ParcelService.svc/json/PrepareLabels
POST https://api.mygls.cz/ParcelService.svc/json/GetParcelStatuses
POST https://api.mygls.cz/ParcelService.svc/json/DeleteLabels
```

**Autentizace:**
- Username (email formát)
- Password
- ClientNumber (integer — unikátní číslo klienta od GLS)
- Všechny requesty přes HTTPS POST

**Formáty:** JSON nebo XML (REST), XML (SOAP)

### 2.3 Hlavní API metody

| Metoda | Popis |
|--------|-------|
| `PrepareLabels` | Validace a uložení dat zásilky (bez tisku) |
| `PrintLabels` | Vytvoření + tisk štítku v jednom kroku (= PrepareLabels + GetPrintedLabels) |
| `GetPrintedLabels` | PDF štítky pro již připravené zásilky |
| `GetPrintData` | ZPL data pro termální tiskárnu |
| `GetParcelStatuses` | Tracking — stavy zásilek |
| `GetParcelList` | Seznam zásilek v daném období |
| `DeleteLabels` | Smazání/storno zásilek |
| `ModifyCOD` | Změna dobírkové částky |

### 2.4 Struktura zásilky (Parcel objekt)

```typescript
interface GLSParcel {
  ClientNumber: number;      // Číslo klienta GLS
  ClientReference: string;   // Naše reference (číslo objednávky)
  Content: string;           // Popis obsahu (tisk na štítek)
  Count: number;             // Počet balíků (default 1)
  
  DeliveryAddress: {
    Name: string;            // Jméno příjemce / firma
    Street: string;          // Ulice
    HouseNumber: string;     // Číslo domu
    HouseNumberInfo: string; // Doplněk (byt, patro)
    City: string;            // Město
    ZipCode: string;         // PSČ
    CountryIsoCode: string;  // "CZ"
    ContactName: string;     // Kontaktní osoba
    ContactPhone: string;    // Telefon
    ContactEmail: string;    // Email
  };
  
  PickupAddress: {
    // Stejná struktura jako DeliveryAddress
    // = adresa odesílatele (Qsport)
  };
  
  PickupDate: string;        // Datum vyzvednutí (ISO format)
  
  // Volitelné služby
  ServiceList?: Array<{
    Code: string;            // Kód služby
    PSDParameter?: {         // Pro ParcelShop delivery
      StringValue: string;
    };
    CODAmount?: number;      // Dobírka
    CODReference?: string;   // Variabilní symbol dobírky
  }>;
}
```

**Příklad vytvoření zásilky:**
```typescript
const response = await fetch('https://api.mygls.cz/ParcelService.svc/json/PrintLabels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    Username: 'qsport@mygls.cz',
    Password: 'xxxxx',
    ParcelList: [{
      ClientNumber: 123456,
      ClientReference: 'QS-20261108-0001',
      Content: 'Sportovní obuv',
      Count: 1,
      DeliveryAddress: {
        Name: 'Jan Novák',
        Street: 'Vinohradská',
        HouseNumber: '42',
        City: 'Praha',
        ZipCode: '12000',
        CountryIsoCode: 'CZ',
        ContactName: 'Jan Novák',
        ContactPhone: '+420777123456',
        ContactEmail: 'jan@example.com',
      },
      PickupAddress: {
        Name: 'Qsport.cz',
        // ... adresa skladu
      },
      PickupDate: '2026-11-09',
    }],
    PrintPosition: 1,
    ShowDialogue: false,
  }),
});
// Vrátí: { Labels: "base64-pdf", ParcelInfoList: [{ ParcelId: 123, ParcelNumber: "..." }] }
```

**Formáty štítků:** `A4_2x2` (4 na A4), `A4_4x1` (4 na stránku vertikálně), `A6` (jednotlivé)

### 2.5 Admin nastavení (co musí být v /admin/doprava)

| Nastavení | Popis | Příklad |
|-----------|-------|---------|
| **Username** | Email pro MyGLS API | `qsport@mygls.cz` |
| **Password** | Heslo pro MyGLS API | `••••••` |
| **Client Number** | Číslo klienta GLS | `123456` |
| **Cena dopravy** | Základní cena | 89 Kč |
| **Doprava zdarma od** | Práh | 2000 Kč |
| **Aktivní** | Zapnout/vypnout | true/false |
| **Adresa odesílatele** | Adresa skladu/provozovny | Školská 660/3, Praha |

**Pokročilé (fáze 2):**
- Tisk štítků z admin panelu
- Objednání vyzvednutí kurýrem
- Tracking update přes GetParcelStatuses

---

## 3. Osobní vyzvednutí

Nejjednodušší metoda — žádné API:
- Zákazník vybere v checkoutu
- V admin panelu se zobrazí v objednávce
- Nastavení: adresa/popis místa vyzvednutí, kontaktní info

---

## 4. Jak to řeší ostatní e-shopy (best practices)

### 4.1 Shoptet (největší CZ platforma)

**Admin → Propojení → Zásilkovna:**
- API klíč (povinné)
- Odesílatel (povinné)
- Formát štítků
- Automatický přenos zásilek zapnout/vypnout

**Admin → Nastavení → Doprava:**
- Název dopravy (zobrazený zákazníkovi)
- Cena
- Doprava zdarma od
- Hmotnostní limity
- Přiřazení platebních metod

### 4.2 WooCommerce + Packeta plugin

**Admin settings:**
- API key
- Sender label
- Label format (A7 on A4 doporučeno)
- Widget language filter (`packeta_widget_language`)
- Widget weight filter (`packeta_widget_weight`)
- Auto-submit orders toggle
- COD mapping (které platební metody = dobírka)

**Admin funkce:**
- Hromadný export objednávek do Zásilkovny
- Tisk štítků (přímý i bulk)
- Tracking number automaticky přidán k objednávce

### 4.3 PrestaShop + Packeta modul

**Admin settings:**
- API password (z klientské sekce)
- Sender name
- Label format
- Carrier mapping (která doprava = Zásilkovna)
- Payment method → COD mapping

**Admin funkce:**
- Bulk actions: "Send selected orders" → vytvoří zásilky v Zásilkovně
- Tracking number automaticky přidán
- Změna výdejního místa v admin detailu objednávky (widget v6)

---

## 5. Doporučení pro Qsport implementaci

### 5.1 Fáze 1 (MVP — aktuální implementace)

**Admin panel `/admin/doprava`:**
- Seznam dopravních metod (tabulka: název, kód, cena, zdarma od, aktivní)
- Edit stránka pro každou metodu
- Toggle aktivní/neaktivní
- Config pole:
  - Zásilkovna: API klíč (maskovaný), sender label, formát štítků
  - GLS: username, password (maskované), client number
  - Osobní: adresa, poznámka

**Checkout (budoucí):**
- Zásilkovna: Widget v6 pro výběr výdejního místa
- GLS: Jen adresa doručení (billing/shipping address z formuláře)
- Osobní: Jen info text

**DB ukládání na Order:**
- `shippingId` → vybraná metoda
- `shippingPrice` → skutečná cena (po uplatnění prahu zdarma)
- `packetaPointId` → ID výdejního místa (jen Zásilkovna)
- `packetaPointName` → Název výdejního místa (jen Zásilkovna)

### 5.2 Fáze 2 (po spuštění checkoutu)

**Backend integrace:**
- `src/lib/packeta.ts` — Packeta SOAP/REST klient
  - `createPacket()` → odeslání zásilky
  - `getLabel()` → PDF štítek
  - `getTracking()` → stav zásilky
- `src/lib/gls.ts` — GLS MyGLS REST klient
  - `printLabels()` → vytvoření + štítek
  - `getParcelStatuses()` → tracking
  - `deleteLabels()` → storno

**Admin rozšíření:**
- Tlačítko "Odeslat do Zásilkovny" / "Odeslat do GLS" na detailu objednávky
- Hromadné odeslání (bulk action)
- Tisk štítků (PDF)
- Automatický tracking update (cron/webhook)

### 5.3 Config JSON struktura (v ShippingMethod.config)

```typescript
// Zásilkovna
{
  apiKey: "2bed6e6598041af2",
  senderLabel: "Qsport.cz",
  labelFormat: "A7 on A4",
  soapEndpoint: "https://www.zasilkovna.cz/api/soap",
  widgetUrl: "https://widget.packeta.com/v6/www/js/library.js"
}

// GLS
{
  username: "qsport@mygls.cz",
  password: "encrypted_password",
  clientNumber: 123456,
  apiUrl: "https://api.mygls.cz",
  labelFormat: "A4_2x2",
  senderAddress: {
    name: "Qsport.cz",
    street: "...",
    city: "Praha",
    zip: "...",
    countryIsoCode: "CZ"
  }
}

// Osobní vyzvednutí
{
  address: "Po domluvě",
  note: "Kontaktujte nás pro domluvu místa a času"
}
```

---

## 6. Zdroje

- Packeta widget v6: `https://widget.packeta.com/v6/www/js/library.js`
- Packeta SOAP: `https://www.zasilkovna.cz/api/soap`
- Packeta WSDL: `https://www.zasilkovna.cz/api/soap.wsdl`
- Packeta REST: `https://www.zasilkovna.cz/api/rest/`
- Packeta docs: `https://docs.packeta.com/`
- Packeta tracking: `https://tracking.packeta.com/cs/?id={barcode}`
- GLS CZ API: `https://api.mygls.cz/`
- GLS CZ test: `https://api.test.mygls.cz/`
- GLS API docs (PDF): `https://api.mygls.cz/docs/mygls_api_20210125.pdf`
- Packeta Go SDK: `https://pkg.go.dev/github.com/MLJ-solutions/go-zasilkovna`
- GLS PHP impl: `https://github.com/MikyWoW/gls_api`
- Packeta WooCommerce: `https://github.com/Zasilkovna/WooCommerce`
- Packeta PrestaShop: `https://github.com/Zasilkovna/prestashop`
