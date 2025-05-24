# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a family tree application that:
1. Parses genealogy data from a custom `genea.doc` format using Rust
2. Generates JSON API data in `public/api/v1/`
3. Serves the data through an Ember.js web application

## Key Commands

### Development Setup
- `npm install` - Install JavaScript dependencies (requires Volta)
- `cargo build` - Build the Rust parser

### Running the Application
- `cargo run -- serve` - Parse genea.doc and serve the web app
- `npm start` - Run Ember development server only
- `npm run start:build` - Parse genea.doc and serve (alternative)

### Testing
- `npm test` - Run all lints and tests
- `npm run test:ember` - Run Ember tests only
- `npm run test:node` - Run Node.js-based relationship tests (headless)
- `cargo test` - Run Rust tests

### Linting
- `npm run lint` - Run all linters (JS, HBS, CSS)
- `npm run lint:fix` - Auto-fix linting issues
- `cargo clippy` - Run Rust linter

### Building
- `npm run build` - Build production Ember app
- `cargo build --release` - Build optimized Rust binary

## Architecture

### Rust Parser (`src/`)
- **genea.rs**: Core parser for the genea format, converts text to structured data
- **parser.rs**: Parsing logic and error handling
- **json_api.rs**: Converts parsed data to JSON API format
- **main.rs**: CLI entry point, handles serve command

### Genea Format
Custom genealogy format where each line represents a person:
- Henry numbers (hierarchical IDs like "1 2 3")
- Gender (M/F/?)
- Relationship counts and spouse indices
- Names and optional comments

### Ember Application (`app/`)
- **components/**: Glimmer components (.gjs files) for UI
- **services/genea.js**: Service to fetch and cache JSON data
- **routes/**: Person and index routes for navigation
- Component-first architecture using template imports

### Data Flow
1. Rust parser reads `genea.doc`
2. Generates JSON files in `public/api/v1/`
3. Ember app fetches JSON via genea service
4. Components render family tree visualization

## Testing Infrastructure

### Headless Testing (Preferred)
The project includes a Node.js-based test suite for testing complex relationship calculations without requiring a browser:
- **Location**: `tests/node/test-relationships.js`
- **Run with**: `npm run test:node`
- **Features**:
  - Tests relationship calculations in isolation
  - Includes 26+ edge case scenarios
  - Runs faster than browser-based tests
  - Easier to debug complex family relationships

### Test Helpers
- **Mock Data Factory**: `tests/helpers/mock-genea-data.js` - Creates test families for unit tests
- **Test Examples**: Step-siblings, half-siblings, double cousins, complex multi-path relationships

### Browser Testing
When browser testing is necessary:
- `testem.js` configures the test runner
- Ember tests require Chrome/Firefox installed
- Use `npm run test:ember` for browser-based component tests

## Important Notes

- The genea.doc file must be sorted by henry number
- JSON generation happens at build/serve time, not runtime
- Ember uses tracked properties and async data patterns
- All styling in `app/styles/app.css`
- **Testing Preference**: Use headless Node.js tests when possible for faster feedback and easier debugging