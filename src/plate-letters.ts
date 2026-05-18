/** Cyrillic letters allowed on standard Russian plates (GOST). */
export const PLATE_LETTERS = "АВЕКМНОРСТУХ".split("");

export function isPlateLetter(char: string): boolean {
  return char.length === 1 && PLATE_LETTERS.includes(char.toUpperCase());
}

export function sanitizeLetter(value: string): string {
  const upper = value.toUpperCase();
  for (const ch of upper) {
    if (isPlateLetter(ch)) return ch;
  }
  return "";
}

export function sanitizeLetters(value: string, maxLen: number): string {
  return value
    .toUpperCase()
    .split("")
    .filter(isPlateLetter)
    .join("")
    .slice(0, maxLen);
}

export function sanitizeDigit(value: string, maxLen: number): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}
