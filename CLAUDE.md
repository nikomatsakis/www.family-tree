# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a family tree application that:
1. Parses genealogy data from a custom `genea.doc` format using Rust
2. Generates JSON API data in `public/api/v1/`
3. Serves the data through an Ember.js web application

### Data Flow
1. Rust parser reads `genea.doc`
2. Generates JSON files in `public/api/v1/`
3. Ember app fetches JSON via genea service
4. Components render family tree visualization

## Test Driven Development for Layout Algorithms

When implementing layout algorithm changes or new rendering features:

1. **Show expected ASCII output first**: Present the visual result before any code - user needs to see what the layout should look like
2. **Use integration tests with real genea fixtures**: Not unit tests. Use `loadGeneaFixture()` with actual family data 
3. **Single scenario per phase**: Break complex features into incremental phases (e.g., single person → simple marriage → one child → multiple children)
4. **Specific TDD workflow**:
   - Present: expected ASCII output + test structure
   - Get approval for approach
   - Write failing integration test
   - Let user review test before implementation
   - Implement minimal code to make test pass
   - Run test to verify

This codebase values visual validation and real data flows over isolated unit testing for layout functionality.

### Implementation Strategy

1. **Create Genea Fixtures**: For new scenarios, create `.genea` files in `tests/fixtures/genea/`
2. **Generate JSON**: Use `cargo run -- json fixture.genea output/` to create test data
3. **Write Integration Tests**: Use `loadGeneaFixture()` and test the complete rendering pipeline
4. **Update Expected Output**: Match the vertical layout output, not legacy horizontal layout

## Ember Development Philosophy

**Key Insight**: If you're manually managing updates, you're probably doing it wrong. Ember wants you to declare relationships between data, not manage state transitions.

**When something feels hard in Ember:**
1. Look for existing patterns in the codebase first
2. Ask "How can this be computed from tracked properties?"
3. Trust Ember's reactivity instead of manual updates

## Key Commands

### Running the Application
- `cargo run -- serve` - Parse genea.doc and serve the web app
- `pnpm start` - Run Ember development server only

### Testing
- `pnpm test` - Run all lints and tests
- `pnpm run test:ember` - Run Ember tests only
- `cargo test` - Run Rust tests

### Linting
- `pnpm run lint` - Run all linters and fix issues
- `cargo clippy` - Run Rust linter

## Testing with Genea Fixtures

For integration tests that need family tree data, use **real genea files** instead of complex mock data:

### Creating Test Fixtures
1. Create a `.genea` file in `tests/fixtures/genea/` with proper format:
   ```
   # Format: 10 henry numbers, gender, num_kids, num_spouses, spouse_index, name [\comment]
    1 0 0 0 0 0 0 0 0 0 M 2 1 0         Dad Test\The father  
    1 0 0 0 0 0 0 0 0 0 F 2 0 1         Mom Test\The mother
    1 1 0 0 0 0 0 0 0 0 M 0 0 0         Child One\First child
    1 2 0 0 0 0 0 0 0 0 F 0 0 0         Child Two\Second child
   ```

2. Generate JSON: `cargo run -- json tests/fixtures/genea/simple-family.genea tests/fixtures/json/simple-family`

3. Copy to public: `cp -r tests/fixtures/json/simple-family public/tests/fixtures/json/`

### Using Fixtures in Tests
```javascript
import { loadGeneaFixture } from 'family-tree/tests/helpers/genea-fixtures';

test('my integration test', async function (assert) {
  const { startPerson, service } = await loadGeneaFixture('simple-family');
  const renderTree = renderer.buildVisibleGraph(startPerson);
  // ... test with real data
});
```

**Benefits**: Real data structures, production code paths, simple setup, easy scenarios.

## Important Notes

- The genea.doc file must be sorted by henry number
- JSON generation happens at build/serve time, not runtime
- Ember uses tracked properties and async data patterns
- All styling in `app/styles/app.css`
- Use Ember Inspector to debug component state

@.socratic-shell/ai-insights.md
@.socratic-shell/github-tracking-issues.md
