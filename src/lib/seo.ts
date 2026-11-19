/**
 * Strip trailing "| Qsport.cz" or "| Qsport" suffix from SEO titles
 * to avoid duplication with the root layout metadata template.
 */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\|\s*Qsport\.cz$/i, "")
    .replace(/\s*\|\s*Qsport$/i, "")
    .trim();
}
