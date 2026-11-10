/** Packeta (Zásilkovna) Widget v6 script URL */
export const PACKETA_WIDGET_URL =
  "https://widget.packeta.com/v6/www/js/library.js";

/**
 * Load the API key from DB config. Falls back to env variable.
 * For server-side use only.
 */
export function getApiKeyFromConfig(config: string | null): string | null {
  try {
    const parsed = JSON.parse(config || "{}");
    return parsed.apiKey || process.env.ZASILKOVNA_API_KEY || null;
  } catch {
    return process.env.ZASILKOVNA_API_KEY || null;
  }
}

/**
 * Validate Zásilkovna API key via HEAD request to branch.xml.
 * Valid key → 200, invalid key → 404. No body downloaded.
 */
export async function validateApiKey(
  apiKey: string,
): Promise<{ valid: true } | { valid: false; error: string }> {
  try {
    const res = await fetch(
      `https://www.zasilkovna.cz/api/v4/${apiKey}/branch.xml?country=cz`,
      { method: "HEAD", signal: AbortSignal.timeout(10000) },
    );
    if (res.ok) return { valid: true };
    if (res.status === 404) return { valid: false, error: "Neplatný API klíč" };
    return { valid: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Neznámá chyba",
    };
  }
}

/**
 * Fetch pickup points for a given country (server-side).
 */
export async function getPickupPoints(apiKey: string, country = "cz") {
  const res = await fetch(
    `https://www.zasilkovna.cz/api/v4/${apiKey}/branch.json?` +
      new URLSearchParams({ country }),
  );
  if (!res.ok) throw new Error(`Zásilkovna API: HTTP ${res.status}`);
  return res.json();
}

/**
 * Create a packet (shipment) via Zásilkovna REST API.
 * Uses XML-based API: https://docs.packetery.com/
 */
interface CreatePacketParams {
  apiKey: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressId: number;
  value: number; // COD value in CZK, 0 for no COD
  weight: number; // weight in kg
  senderLabel?: string;
}

export async function createZasilkovnaPacket(params: CreatePacketParams): Promise<{
  success: boolean;
  packetId?: string;
  barcode?: string;
  error?: string;
}> {
  const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<createPacket>
  <apiPassword>${escXml(params.apiKey)}</apiPassword>
  <packetAttributes>
    <number>${escXml(params.orderNumber)}</number>
    <name>${escXml(params.firstName)}</name>
    <surname>${escXml(params.lastName)}</surname>
    <email>${escXml(params.email)}</email>
    <phone>${escXml(params.phone)}</phone>
    <addressId>${params.addressId}</addressId>
    <value>${params.value}</value>
    <weight>${params.weight}</weight>
    ${params.senderLabel ? `<eshop>${escXml(params.senderLabel)}</eshop>` : ""}
  </packetAttributes>
</createPacket>`;

  try {
    const res = await fetch("https://www.zasilkovna.cz/api/rest", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
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
      error: `Zásilkovna API: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Widget config for client-side Packeta widget initialization.
 */
export interface PacketaWidgetOptions {
  apiKey: string;
  country?: string;
  language?: string;
  appIdentity?: string;
}

/**
 * Build widget options for the Packeta HD widget.
 */
export function buildWidgetOptions(
  apiKey: string,
  overrides?: Partial<PacketaWidgetOptions>,
): PacketaWidgetOptions {
  return {
    apiKey,
    country: "cz",
    language: "cs",
    appIdentity: "qsport-eshop",
    ...overrides,
  };
}
