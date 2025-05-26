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

### Unified Testing System (Preferred)
The project uses Ember's QUnit-based test infrastructure for all tests to maintain consistency and avoid code duplication:
- **Location**: `tests/unit/` and `tests/integration/`
- **Run with**: `npm test` (all tests) or `npm run test:ember`
- **Benefits**:
  - Single source of truth - tests use actual production code
  - No duplicated class implementations
  - Consistent testing patterns across the codebase
  - Full integration with Ember's testing helpers

### Test Helpers
- **Mock Data Factory**: `tests/helpers/mock-genea-data.js` - Creates test families for unit tests
- **Service Tests**: `tests/unit/services/genea-test.js` and `genea-relationships-test.js` - Test core genealogy logic
- **Component Tests**: Integration tests for UI components in `tests/integration/components/`

### Test Organization
- Unit tests for services, models, routes, and controllers
- Integration tests for components
- All tests run in the browser environment with full access to Ember's features
- `testem.js` configures the test runner

## Important Notes

- The genea.doc file must be sorted by henry number
- JSON generation happens at build/serve time, not runtime
- Ember uses tracked properties and async data patterns
- All styling in `app/styles/app.css`
- **Testing Preference**: Use Ember's unified test system to avoid code duplication and ensure tests reflect production behavior