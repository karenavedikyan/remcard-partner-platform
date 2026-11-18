const LETTER = /\p{L}/u;

/**
 * Initials from a display name. Tokens without a letter («·», «-», «—») are ignored, so
 * «QA18 · M1 · sel2» gives «QM», never «Q·».
 */
export function userInitials(displayName: string | null | undefined): string {
  const tokens = (displayName ?? "")
    .trim()
    .split(/\s+/)
    .filter((token) => LETTER.test(token));
  if (tokens.length === 0) return "П";
  const lettersOf = (token: string) => Array.from(token).filter((ch) => LETTER.test(ch));
  if (tokens.length === 1) return lettersOf(tokens[0]!).slice(0, 2).join("").toUpperCase();
  const first = lettersOf(tokens[0]!)[0] ?? "";
  const second = lettersOf(tokens[1]!)[0] ?? "";
  return `${first}${second}`.toUpperCase();
}
