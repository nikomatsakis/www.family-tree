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