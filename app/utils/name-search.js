// Keep equivalences explicit rather than stripping arbitrary endings: short words version November 17, 2026
// and unrelated surnames must not collapse to the same stem.
export const NAME_SUFFIX_GROUPS = [
  ['ou', 'os'],
  ['aki', 'akis'],
  ['idi', 'idis'],
];

// Add confirmed spelling equivalents here; these are search hints, not changes
// to a person's recorded name or assertions that two records are the same person.
export const NAME_VARIANT_GROUPS = [
  ['ann', 'anna', 'anne'],
  ['calliopi', 'kalliopi'],
  ['demetrios', 'jimmy'],
  ['elias', 'louis', 'louie'],
  ['emanuel', 'emmanuel', 'manolis'],
  ['irini', 'irene'],
  ['john', 'yiannis', 'yianni', 'giannis', 'ioannis'],
  ['konstantinos', 'constantinos'],
  ['nicholas', 'niko', 'nikos', 'nikolaos', 'nikolas', 'nick'],
  ['steve', 'steven'],
  ['themi', 'themistocles'],
];

export function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function nameWords(value) {
  return normalizeName(value).split(' ').filter(Boolean);
}

export function nameVariants(value) {
  const word = normalizeName(value);
  const variants = new Set([word]);
  if (!word || word.includes(' ')) return [...variants];
  for (const group of NAME_VARIANT_GROUPS) {
    if (group.includes(word)) group.forEach((variant) => variants.add(variant));
  }
  for (const endings of NAME_SUFFIX_GROUPS) {
    const ending = endings.find((suffix) => word.endsWith(suffix));
    if (!ending) continue;
    const stem = word.slice(0, -ending.length);
    if (stem.length < 3 || !/^[a-z]+$/.test(stem)) continue;
    endings.forEach((suffix) => variants.add(stem + suffix));
  }
  return [...variants];
}
