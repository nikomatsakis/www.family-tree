# Vertical Layout for Mobile

## Status: Planning
**Created**: December 16, 2024
**Priority**: HIGH - Current horizontal layout unusable on mobile devices

## Problem Statement
The current family tree layout expands horizontally:
- Parents to the left, children to the right
- Spouses side-by-side with horizontal marriage lines
- Quickly becomes wider than mobile screens
- No way to navigate large trees on phones

## Proposed Solution
Create a vertical layout mode where:
- Generations flow top-to-bottom instead of left-to-right
- Partners remain side-by-side but with minimal horizontal space
- Children appear below their parents
- Optimized for portrait orientation on mobile devices

## Design Considerations
1. **Layout Direction**
   - Ancestors at top, descendants below
   - Similar to traditional pedigree charts
   - Natural scrolling direction on mobile

2. **Space Efficiency**
   - Minimize horizontal spread
   - Use vertical space (infinite scroll)
   - Collapsible sections become critical

3. **Touch Interactions**
   - Larger tap targets for expansion buttons
   - Pinch-to-zoom support
   - Swipe gestures for navigation?

4. **Responsive Switching**
   - Auto-switch based on viewport width?
   - User preference setting?
   - Different layouts for portrait vs landscape?

## Technical Approach
- Modify `family-layout.js` to support vertical positioning
- Add layout direction parameter to renderers
- Update both text and D3 renderers
- Adjust connection line routing for vertical flow

## Open Questions
- Should this be automatic based on screen size or user-selectable?
- How to handle very wide partnerships (many spouses)?
- Best breakpoint for mobile vs desktop layout?