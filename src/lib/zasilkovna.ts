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
