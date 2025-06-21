# Ancestor Expansion Bug

## Status: Identified - Needs Investigation
**Created**: June 21, 2025
**Priority**: MEDIUM - Bug affecting user experience with ancestor navigation

## Problem Description
There is a bug that occurs when users continuously expand ancestors in the family tree. The specific behavior and root cause need to be investigated.

## Symptoms
- Issue occurs during repeated ancestor expansion operations
- Affects user ability to navigate up the family tree
- Specific error conditions or visual problems to be determined

## Root Cause Identified ✅
**Bug**: Unknown partner person gets incorrect `upFamilyRIndex: [2]` instead of `null`

**Location**: `/home/nikomatsakis/dev/www.family-tree/app/utils/family-tree-renderers/base-renderer.js:165`

**Effect**: 
1. Unknown partner created with `upFamilyRIndex: null` (correct)
2. Later corrupted to `upFamilyRIndex: [2]` (incorrect array format)
3. Root node calculation filters out Solkar because Unknown partner "has parents"
4. Solkar and Unknown don't appear in rendered tree

**URL**: http://localhost:4200/person/1-1-1-2?expandedPartnerships=6%2C7%2C8%2C5%2C2%2C0

## Investigation Completed ✅
- [x] Reproduce the bug with specific steps
- [x] Identify the root cause (data structure corruption in buildFamily)
- [x] Determine scope of impact (affects ancestor expansion with Unknown partners)
- [x] Analyze related code paths (computeRootNodes filtering logic)

## Technical Areas to Examine
- Ancestor expansion button logic in both text and D3 renderers
- RenderTree building when ancestors are expanded
- Circular reference detection in family layout algorithms
- State management in family-tree-visual component

## Expected Outcome
- Clear understanding of the bug's root cause
- Reliable reproduction steps
- Fix that prevents the issue without breaking existing functionality
- Test coverage to prevent regression

## Notes
- This affects the recently completed vertical layout functionality
- May be related to the ancestor expansion button implementation in Phase 6
- Could impact mobile usability if users frequently explore ancestors