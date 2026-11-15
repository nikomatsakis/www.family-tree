serve: pnpm
    cargo run -- serve ./genea.txt

build: pnpm
    cargo run -- build ./genea.txt

check: pnpm
    cargo run -- check ./genea.txt

pnpm:
    pnpm install
    npx update-browserslist-db@latest
