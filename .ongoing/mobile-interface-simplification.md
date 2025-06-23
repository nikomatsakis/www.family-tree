# Mobile Interface Simplification

## Status: Planning - New Feature Implementation
**Created**: June 23, 2025
**Priority**: HIGH - Critical for mobile usability

## Overview
Simplify the family tree interface for better mobile experience by removing debugging features from the UI and fixing scrolling behavior to create a unified, intuitive mobile experience.

## Tasks

### 1. Remove Renderer Selection from UI
- [ ] Remove the renderer selection dropdown from the main interface
- [ ] Keep D3 as the default and only visible renderer
- [ ] Maintain other renderers (text, etc.) accessible via URL query parameters for debugging
- [ ] Update any UI components that reference renderer selection
- [ ] Ensure URL parameter parsing still works for renderer selection

**Rationale**: Renderer selection is primarily for debugging and clutters the mobile interface. Power users can still access alternate renderers via URL parameters.

### 2. Fix D3 Renderer Scrolling Behavior
- [ ] Remove independent scrolling of D3 SVG container
- [ ] Make SVG graphics part of the main page flow
- [ ] Ensure natural page scrolling includes the family tree
- [ ] Test on various mobile devices for smooth scrolling
- [ ] Adjust any fixed positioning or overflow settings
- [ ] Maintain zoom/pan functionality within the unified scroll experience

**Current Issue**: D3 renderer scrolls independently from the rest of the page, creating a confusing dual-scroll experience on mobile devices.

### 3. Simplify Front Page to Search-Only
- [ ] Remove ancestor list from the front page
- [ ] Keep only the search bar as the primary interface element
- [ ] Center and prominently display the search functionality
- [ ] Consider adding helpful placeholder text or search hints
- [ ] Ensure clean, focused mobile experience
- [ ] Remove any other non-essential elements from landing page

**Rationale**: The ancestor list is confusing on mobile and clutters the initial experience. A single, focused search bar provides a cleaner entry point to the family tree.

## Technical Considerations
- D3 SVG container likely has overflow settings or fixed dimensions
- May need to adjust viewport calculations
- Consider impact on zoom/pan functionality
- Test performance implications of larger scrollable area
- Ensure responsive behavior across different screen sizes

## Success Criteria
- Clean, uncluttered mobile interface
- Single, natural scrolling experience
- D3 renderer feels like native part of the page
- Debugging features still accessible via URL
- Smooth performance on mobile devices

## Dependencies
- Works in conjunction with PWA improvements
- Builds on vertical layout implementation
- May affect navigation enhancement plans