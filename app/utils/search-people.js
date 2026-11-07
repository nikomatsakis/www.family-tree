import Fuse from 'fuse.js';
import { nameVariants, nameWords, normalizeName } from './name-search';

// Preserve fuzzy/partial matching and AND semantics while allowing each name
// word to match a known equivalent. Comments keep their original search terms.
export function searchPeople(people, query) {
  const words = nameWords(query);
  if (!words.length) return [];
  const records = people.map((person) => ({
    person,
    name: normalizeName(person.name),
    comments: normalizeName(person.comments || ''),
  }));
  const fuse = new Fuse(records, {
    keys:
      words.length === 1
        ? [
            { name: 'name', weight: 0.8 },
            { name: 'comments', weight: 0.2 },
          ]
        : ['name', 'comments'],
    threshold: words.length === 1 ? 0.4 : 0.3,
    includeScore: true,
    minMatchCharLength: words.length === 1 ? 2 : 1,
    ignoreLocation: true,
    findAllMatches: true,
  });
  const results = fuse.search({
    $and: words.map((word) => ({
      $or: [
        ...nameVariants(word).map((variant) => ({ name: variant })),
        { comments: word },
      ],
    })),
  });
  // Exact recorded names rank ahead of variants, and variants ahead of typos.
  const rank = ({ item }) => {
    const tokens = new Set(nameWords(item.name));
    if (words.every((word) => tokens.has(word))) return 0;
    if (
      words.every((word) =>
        nameVariants(word).some((variant) => tokens.has(variant)),
      )
    )
      return 1;
    return 2;
  };
  return results
    .sort((a, b) => rank(a) - rank(b) || a.score - b.score)
    .map(({ item }) => item.person);
}
