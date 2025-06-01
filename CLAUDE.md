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

## GitHub Issue-Based Todo Management

This project uses GitHub issues for todo and task management, integrated directly with Claude Code through the MCP GitHub server.

### Issue Labels
- `todo`: General tasks to be done
- `bug`: Issues that need fixing
- `feature`: New functionality to add
- `refactor`: Code improvements without changing functionality
- `documentation`: Documentation updates
- `priority:high`, `priority:medium`, `priority:low`: Priority levels
- `status:in-progress`: Currently being worked on
- `status:blocked`: Waiting on dependencies

### Workflow with Claude Code

#### Creating Todos
Ask Claude Code to create issues for tasks:
- "Create an issue for adding search functionality to the landing page"
- "Create a bug issue for the broken navigation on mobile"
- "Create a refactor issue to improve genea parser performance"

#### Managing Todos
Use natural language commands:
- "Show me all open issues" - List current todos
- "Show open issues with label 'bug'" - Filter by type
- "Add comment to issue #5 about progress" - Update status
- "Close issue #5" - Mark as complete

#### Best Practices
1. **Clear Titles**: Use descriptive, action-oriented titles
2. **Detailed Descriptions**: Include acceptance criteria in issue body
3. **Label Appropriately**: Always add relevant labels for organization
4. **Update Progress**: Add comments when starting/blocking/completing work
5. **Link to Code**: Reference issues in commit messages using `#123` format

#### Example Commands
```
# Create a feature todo
"Create issue titled 'Add family tree search' with labels 'feature' and 'priority:high', body should include acceptance criteria"

# Check high priority todos
"List open issues with label 'priority:high'"

# Update progress
"Add comment to issue #10 saying 'Implemented basic search, working on filters'"

# Complete with reference
"Close issue #10 with comment 'Implemented in PR #15'"
```

### Integration with Git Workflow
- Reference issues in commit messages: `git commit -m "Add search component (fixes #10)"`
- Issues automatically close when referenced commits are merged
- Use PR descriptions to link related issues

## Debugging Guidelines

### When Debugging Issues
To help Claude Code debug more effectively, provide:

1. **Browser Console Output**
   - Copy any JavaScript errors or warnings
   - Include the full stack trace
   - Note any failed network requests

2. **Visual Context**
   - Screenshots of the issue
   - What you expected vs what you see
   - Steps to reproduce

3. **Ember Inspector Info** (if available)
   - Component tree screenshot
   - Current route information
   - Loaded data/services

### Debug Mode
Enable debug logging by running in the browser console:
```javascript
window.DEBUG = true;
```

### Common Debugging Commands
- `npm run lint` - Check for syntax/style issues
- `npm test` - Run tests to catch regressions
- Browser DevTools:
  - Check Network tab for failed API calls
  - Check Console for JavaScript errors
  - Use Ember Inspector to inspect component state