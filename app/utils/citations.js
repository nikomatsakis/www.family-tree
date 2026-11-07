// Keep citation destinations shared by the SVG tree and HTML person links.
export function citationLink(citation, name) {
  const params = new URLSearchParams({
    source: citation.source,
    page: citation.page,
    name,
  });
  return `/citation.html#${params}`;
}

// Shared line art keeps source links identical in HTML and the SVG tree.
export const SOURCE_ICON_PATHS = [
  'M12 8C9 5 5 5 2 6V20C6 19 9 20 12 22C15 20 19 19 22 20V12M12 8V22M12 8C13 7 14 6.5 15 6.5',
  'M16 2H22V8M22 2L15 9',
];
