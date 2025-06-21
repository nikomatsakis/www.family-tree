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

## Areas for Review

### Accuracy & Completeness
- [ ] Verify accuracy of relationship calculations across different scenarios
- [ ] Test edge cases (multiple marriages, step-relationships, adoption)
- [ ] Review handling of complex relationships (double cousins, etc.)
- [ ] Validate generational calculations (great-great-grandparents, etc.)

### User Experience
- [ ] Assess current UI for displaying relationship information
- [ ] Consider adding relationship info to person detail views
- [ ] Evaluate discoverability of the relationship feature
- [ ] Review terminology and language used for relationships

### Performance & Scalability
- [ ] Analyze performance with large family trees
- [ ] Review algorithm efficiency for distant relationships
- [ ] Consider caching strategies for frequently calculated relationships

### Feature Enhancements
- [ ] Add visual relationship path highlighting in tree view
- [ ] Consider "shortest path" vs "most direct relationship" options
- [ ] Add support for showing multiple relationship paths
- [ ] Integrate with search functionality ("show me how I'm related to...")

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