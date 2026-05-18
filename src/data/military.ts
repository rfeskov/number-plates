/**
 * Military district / service codes (YY on black plates).
 * Sample entries — add your full list to src/data/military.ts.
 */
export const MILITARY_CODES: Record<string, string> = {
  "01": "Центральный военный округ",
  "02": "Северо-Западный военный округ",
  "03": "Восточный военный округ",
  "04": "Сибирский военный округ",
  "07": "Западный военный округ",
  "14": "Железнодорожные войска",
  "18": "МЧС России",
  "21": "Южный военный округ",
  "23": "Ракетные войска стратегического назначения",
  "77": "Московский гарнизон",
  "78": "Санкт-Петербург",
};

export function lookupMilitary(code: string): string | null {
  const normalized = code.trim();
  if (!normalized) return null;
  return MILITARY_CODES[normalized] ?? null;
}
