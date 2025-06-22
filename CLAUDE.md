# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Always create and propose plans before making edits or taking action. **Never make code edits without explicit approval of the plan first.** Discuss what you intend to change and get confirmation before using Edit, MultiEdit, or Write tools.

### Test Driven Development for Layout Algorithms

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

## Integration-First Testing Philosophy

**Core Principle**: Always prefer integration tests starting with genea data over manual unit tests.

### Why Integration Tests Are Superior

1. **Real Data Flow**: Tests the complete pipeline: genea parsing → JSON generation → service loading → renderer processing
2. **Automatic Setup**: Properties like `hasChildren`, `isExpanded`, `rightFamilyRIndices` are set correctly by the real system
3. **Realistic Scenarios**: Tests actual family tree structures that users encounter
4. **Fewer Assumptions**: No need to manually construct complex RenderTree objects with correct relationships
5. **Catch Real Bugs**: Integration tests revealed expansion button issues that unit tests missed

### When to Use Each Approach

**✅ PREFERRED: Integration Tests with Genea Fixtures**
- Any family tree rendering scenarios
- Testing layout algorithms with multiple generations
- Validating expansion states and buttons
- Testing complex family structures (single parents, multiple marriages, etc.)
- End-to-end workflow validation

**⚠️ AVOID: Manual Unit Tests with RenderTree**
- Manually constructing RenderTree objects is error-prone
- Easy to miss required properties (hasChildren, isExpanded, etc.)
- Creates brittle tests that break when data structures evolve
- Doesn't test the real user experience

**✅ ACCEPTABLE: Unit Tests for Pure Functions**
- Testing individual utility functions (spacing calculations, etc.)
- Testing rendering components in isolation (TextCanvas, Rectangle positioning)
- Testing pure data transformations without complex object relationships

### Implementation Strategy

1. **Create Genea Fixtures**: For new scenarios, create `.genea` files in `tests/fixtures/genea/`
2. **Generate JSON**: Use `cargo run -- json fixture.genea output/` to create test data
3. **Write Integration Tests**: Use `loadGeneaFixture()` and test the complete rendering pipeline
4. **Update Expected Output**: Match the vertical layout output, not legacy horizontal layout

### Success Story

During horizontal layout removal, we converted 3 flawed manual unit tests into proper integration tests:
- **Before**: 115/125 tests passing, complex manual RenderTree construction
- **After**: 123/123 tests passing, clean genea-based integration tests
- **Result**: 100% test coverage with more maintainable and realistic test scenarios

## Ongoing Work Tracking

Track ongoing development work and progress in the `.ongoing/` directory:

- Create `.md` files for each major feature or investigation
- Include status, progress summary, next steps, and debugging context
- Update files as work progresses to maintain context across sessions
- Use descriptive filenames like `feature-name.md` or `bug-investigation.md`
- When ongoing files describe phased development, wait for active confirmation before beginning the next phase.

### Content Guidelines for `.ongoing/` Files

**INCLUDE** (essential for resuming work):
- High-level status and completion percentage
- Priority-ordered next steps with specific file/line references
- Key design decisions with pointers to detailed explanations in code
- Integration points (which files/services connect to this work)
- Known blockers or dependencies

**EXCLUDE** (belongs elsewhere):
- Detailed algorithms or mathematical foundations (put in code comments or architecture docs)
- Complete implementation history or session-by-session changes (git handles this)
- Code examples or debugging snippets (put in actual code files)
- ASCII diagrams or visual mockups (put in architecture documentation)
- Detailed bug-fixing narratives (git commit messages capture this)

The goal is concise context for continuation, not comprehensive documentation.

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

## AI Memory Comments System

This codebase uses structured emoji comments to provide persistent memory for both AI and human developers:

- `❓ QUESTION:` - Open questions or unclear areas that need investigation
- `💡 ANSWER:` - Answers to previous questions or explanations of confusing code  
- `⚠️ IMPORTANT:` - Critical things not to change/break, warnings about side effects
- `🎯 PURPOSE:` - Why this code exists, design decisions, architectural reasoning

### Rules for AI
1. **NEVER remove or contradict** existing emoji comments
2. **ALWAYS preserve** these comments when editing code - copy them to new locations if code moves
3. **When user says** "We've made this mistake before, can you add an AI note to remember it?":
   - Analyze the context and type of issue
   - Choose appropriate emoji comment type
   - Add concise, specific comment addressing the root problem
   - Place strategically (inline for specific lines, block for functions/sections)

### Comment Placement Guidelines
- **ALWAYS precede** the code being explained - never inline at end of lines
- **Above functions/classes** for high-level context and design decisions
- **Immediately before specific lines** for detailed explanations or warnings
- **Before complex logic blocks** for questions and answers about confusing code
- **Above fragile code** for important warnings about side effects

These comments travel with the code and reduce repeated explanations across development sessions.

## Important Notes

- The genea.doc file must be sorted by henry number
- JSON generation happens at build/serve time, not runtime
- Ember uses tracked properties and async data patterns
- All styling in `app/styles/app.css`
- Use Ember Inspector to debug component state