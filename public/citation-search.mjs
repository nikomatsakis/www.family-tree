import { normalizeName, nameWords, nameVariants } from "./name-search.mjs";
// Match each query word independently while retaining original UTF-16 offsets for highlights.
export function matchingItems(items, query) {
  const words = new Set(nameWords(query).flatMap(nameVariants));
  if (!words.size) return [];
  const tokens = items.flatMap((item, index) =>
    [...(item.textContent || "").matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map(
      (match) => ({
        word: normalizeName(match[0]),
        index,
        start: match.index,
        end: match.index + match[0].length,
      }),
    ),
  );
  return tokens.filter((token) => words.has(token.word));
}
