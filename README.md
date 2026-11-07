# family-tree

How to use:

1. [Install volta](https://volta.sh), which manages npm versions
2. [Install Rust](https://rustup.rs)
3. Run `npm install`
4. Run `cargo run -- serve`

Or, with `just`, you can run `just serve`.

## Environment Variables

### `FAMILY_TREE_PASSWORD`

Controls client-side encryption of genealogy data:

- **Unset** (default): Builds unencrypted `roots.json` file for public access
- **Set to password**: Builds encrypted `roots.json.enc` file requiring password in browser

**Usage:**
```bash
# Public/test deployment (no password required)
cargo run -- serve

# Private deployment (password required in browser)  
FAMILY_TREE_PASSWORD="your-shared-secret" cargo run -- build
```

**Deployment:**
- Set as environment variable in GitHub Actions secrets for encrypted builds
- Leave unset in test environments like Netlify for open access
- Same codebase supports both encrypted and unencrypted deployments

## Technologies in use

* Rust to parse the `genea.doc` file and generate JSON data in `public/api/v1`
* [Ember] for the website itself

[Ember]: https://emberjs.com/
## Reference material and citations

Place `reference-material.json` beside your genealogy data file:

```json
{
  "sources": {
    "pages": {
      "title": "Original family history",
      "file": "family-history.pdf",
      "visibility": "public",
      "pageOffset": 0,
      "pattern": "\\bPAGE\\s+(?P<page>\\d+(?:\\s*,\\s*\\d+)*)\\b"
    }
  }
}
```

With this configuration, `PAGE 19,27` in a person's private notes creates two
source links. There is no built-in `PAGE` convention: every source specifies its
own `pattern`, written in Rust regex syntax with a named `page` capture. JSON
strings require doubled backslashes. For a single page, a pattern can be as
simple as `"PAGE (?P<page>[0-9]+)"`. The example above also captures comma-separated
page numbers; zero and invalid page numbers are ignored.

The source key (`pages` above) is used as the citation's source ID. Add another
source with its own file and pattern, such as `"LETTER:(?P<page>[0-9]+)"`, to cite
a different PDF. Repeated references to the same source/page are deduplicated;
the same page in two different sources remains two citations. Only source IDs
and page numbers are exported; surrounding private notes stay private.

`check`, `json`, `build`, and `serve` read configuration beside the input genealogy
file. Missing configuration means no citations. Invalid JSON, invalid regexes,
and patterns missing the named `page` capture fail with a configuration error.
Patterns are compiled once per source, not once per person. The packaging script
uses the same source IDs; no pattern or PDF filename is hardcoded in the parser.

Files resolve relative to the configuration. `pageOffset` is added to a cited
page number to get the physical PDF page (for example, use 2 for two cover pages).
`cargo run -- build path/to/genea.doc` and `serve` package the configured PDFs.
The lower-level `json` command generates data only.

- `public`: copies the PDF into the site's reference-material directory. Access
  follows deployment-level protection; it does not require the client-side
  genealogy password.
- `encrypted`: embeds the PDF in an encrypted JSON asset. Requires
  `FAMILY_TREE_PASSWORD` at build time and uses the same password in the viewer.

The local PDF.js viewer opens in a separate tab, selects the cited page, and
highlights each name word independently wherever it occurs on the page, ignoring
case, accents, and punctuation. Scans need an OCR text layer. When spelling or OCR differs, the
viewer explains that no match was found and lets the reader adjust the search.
Generated PDFs and PDF.js assets are ignored by Git.

Name matching rules live in `app/utils/name-search.js`, shared by website search
and PDF highlighting. `NAME_SUFFIX_GROUPS` defines reversible endings (`ou/os`,
`aki/akis`, `idi/idis`); `NAME_VARIANT_GROUPS` lists explicit spelling equivalents
(`Emanuel/Emmanuel`, `Konstantinos/Constantinos`). Add confirmed alternatives to
these lists rather than broadly stripping suffixes. Suffix rules require at
least three Latin letters before the ending. They are search hints only and do
not change recorded names or merge people.

Website search still supports partial names and typos and requires all query
words to match. Exact name words rank before variants and fuzzy results. PDF
highlighting matches any query word or listed variant at whole-word boundaries.
The build copies the shared rules to the standalone viewer automatically.

## Person annotations

A person record may be followed by an ordered list of annotations. Header names
and values are retained, including repeated or unrecognized headers:

```text
 1 0 0 0 0 0 0 0 0 0 M 0 0 0         Example Person\Short public comment;legacy private note
    - Secret: PAGE 17
    - Custom: https://example.test/document:section
    - Custom: Another value
    - Secret:
        A longer private account.

        A second paragraph, including literal #, ; or \ characters.
            Additional indentation is preserved.
```

Headers start with exactly four spaces and `- `. The first colon separates the
header from its value; further colons are literal. Empty header names are errors.
For inline values, one optional space after the colon is removed.

A header with nothing after the colon starts a literal multiline value. Content
lines have at least eight leading spaces; exactly eight are removed. Blank lines
are retained. No escaping, interpolation, YAML syntax, or comment processing is
applied inside the block. A new four-space annotation or person record ends it.
An empty block is allowed. Tabs cannot replace required indentation. Errors
identify the offending source line.

`Secret` (case insensitive) is private. Existing `;...` notes become a `Secret`
entry internally, before subsequent annotations, without rewriting the file.
The `\` shorthand remains the public comment. Configured citation patterns run
on each Secret value independently; only the extracted citations are exported,
with duplicate source/page pairs removed. Unknown annotations are not exported.

Annotations attach to the immediately preceding person record, including spouses.
If that record references another person by alternate ID, annotations accumulate
on that same person in file order, including when its defining record appears
later. Existing restrictions on public comments and counts on alternate-ID
records still apply. Name/comment edits preserve all annotation text, private suffixes, numeric columns, and line
endings. Existing files need no migration.

### Attach a source to a person

Register the PDF in `reference-material.json` beside the genealogy data. Sources
used only by annotations do not need a `pattern`:

```json
{"sources":{"article":{"title":"Family history article","file":"article.pdf","visibility":"public"}}}
```

Then add an annotation immediately after the appropriate person record:

```text
    - Source: article
    - Source: register | page=3 | search=Name as printed in the document
```

`Source` adds the book/arrow icon and opens the viewer in another tab. `page`
defaults to 1; `search` defaults to the person's name. Each name word is searched
independently, using the existing spelling variants. Use `search` for another
alphabet or a name that differs in that document. Options use literal text, not
URL encoding, and are separated by `|`. Repeat `Source` to attach several
references. Unknown source IDs and invalid options fail validation before output
is overwritten. Document titles appear in the link tooltips.

Scanned PDFs need OCR for highlights. Generate a sidecar locally with
`python3 scripts/ocr-source.py scan.pdf scan.ocr.json --language ell` (requires
Poppler and Tesseract's Greek language model), then set `"ocr":"scan.ocr.json"`
on that source. Coordinates are normalized to the unrotated rendered page; each
`pages` entry contains `words` with `text`, `x`, `y`, `width`, and `height`.
The sidecar follows the source's public/encrypted visibility. The original PDF
is preserved; its standalone download does not gain a text layer.

`Image` and `Note` remain preserved metadata without rendering behavior.
