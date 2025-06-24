# "How is X related to Y" Functionality Review

## Status: Needs Review - Existing Feature Analysis
**Created**: June 21, 2025
**Priority**: LOW - Feature enhancement and accuracy review

## Overview
Review and potentially improve the existing relationship calculation functionality that determines how two people in the family tree are related to each other.

## Current State
- Relationship calculation logic exists in the genea service
- Handles various relationship types (siblings, cousins, aunts/uncles, etc.)
- Test coverage exists for relationship calculations
- Used in the family tree interface to show connections

## Findings

### Current Implementation Issues
- **Bug**: The existing "See how X is related to other people" link loses the `referencePersonId` parameter during navigation
- **UX Problem**: Current interface requires navigating away from person page, not intuitive
- **Missing Feature**: No easy way to compare current person to others directly from their page

## Planned Enhancement: Search-Based Relationship Interface

### New Design
Replace the current "See how X is related to other people" link with an inline search interface:

**Interface**: `"See how [Current Person] is related to: [Search Box]"`
- **Example**: "See how Spock is related to: [search with autocomplete]"
- **Autocomplete**: Reuse existing search component from main page
- **Results**: When user selects someone, show relationship immediately on same page

### Implementation Plan
- [ ] Remove current buggy IndexLink for relationship discovery
- [ ] Add search box component to person page using existing landing page search logic
- [ ] Implement relationship display when person is selected from search
- [ ] Show focused family tree (expand only partnerships needed for relationship path)
- [ ] Ensure mobile-friendly layout

### Benefits
- **Stays on person page**: No navigation away and back
- **Intuitive UX**: Direct "compare A to B" interface
- **Reuses working code**: Leverage existing search autocomplete
- **Visual clarity**: Show minimal tree focused on relationship path

## Technical Implementation
- Current location: genea service relationship calculations
- Test coverage: Unit tests exist for various relationship scenarios
- Integration: Used in family tree components

## Success Criteria
- Accurate relationship calculations across all family tree scenarios
- Intuitive user interface for discovering relationships
- Good performance even with large family trees
- Comprehensive test coverage for edge cases

## Notes
- This feature adds significant value for genealogy research
- Accuracy is critical for user trust in the application
- Mobile-friendly display important given new vertical layout focus