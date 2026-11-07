// Match each query word independently while retaining original UTF-16 offsets for highlights.
const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function matchingItems(items, query) {
  const words = new Set(normalize(query).split(" ").filter(Boolean));
  if (!words.size) return [];
  const tokens = items.flatMap((item, index) =>
    [...(item.textContent || "").matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map(
      (match) => ({
        word: normalize(match[0]),
        index,
        start: match.index,
        end: match.index + match[0].length,
      }),
    ),
  );
  return tokens.filter((token) => words.has(token.word));
}
