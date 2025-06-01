serve: pnpm
    cargo run -- serve ./genea.doc

build: pnpm
    cargo run -- build ./genea.doc

check: pnpm
    cargo run -- check ./genea.doc

pnpm:
    pnpm install
    npx update-browserslist-db@latest