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
      "pageOffset": 0
    }
  }
}
```

`PAGE 19,27` in a person's private notes creates two document links in their
card, detail heading, and outline. Only the page references are exported;
other private notes stay private. `pages` is the source ID for legacy PAGE
references. Citation records include a kind and source ID to support other
citation formats later.

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
