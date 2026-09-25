// Temporary entrance-only restrictions. Keep all battle definitions available.
export const EXCLUDED_CHARACTER_IDS = new Set(["shicho", "suima", "kasuima"]);
export function clearExcludedCharacters(selection: string[]): string[] {
  return selection.map((id) => (EXCLUDED_CHARACTER_IDS.has(id) ? "" : id));
}
