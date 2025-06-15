# D3 Family Tree Renderer Implementation

## Status: Core Implementation Complete - Iterating on Enhancements
**Last Updated**: June 11, 2025

## Project Goal
Create an interactive D3.js-based family tree renderer that provides rich visualization and navigation for family relationships, serving as the foundation for enhanced person detail pages.

## 🎯 Current Focus
**Status**: Core expansion/collapse implementation complete!

### Recently Completed
- **State management bug**: Fixed! Proper tracking of explicit expanded/collapsed states
- **Collapse functionality**: Added "−" buttons on marriage lines for expanded partnerships
- **Button visual design**: Implemented circular buttons with hover effects for professional appearance
- **Text renderer compatibility**: Fixed coordinate system issues and added button support
- **Test compatibility**: All text renderer tests now pass with new button rendering

### ✅ Recently Completed: URL State Integration (NEW!)
- **URL query params for partnership expansion**: expandedPartnerships and expandedPersons are now persisted in URLs
- **Deep linking support**: URLs now maintain exact tree state for sharing and navigation
- **Simplified state management**: Removed complex user modification tracking in favor of derived state from URL + defaults
- **Smart URL cleanup**: Query params are automatically cleared when expansion state returns to defaults
- **Backwards compatibility**: Existing URLs continue to work, new URLs provide enhanced state persistence

### ✅ Recently Completed: Auto-expand Childless Partnerships (NEW!)
- **Smart expansion buttons**: Only show [+] button when partnership actually has children to reveal
- **Added hasChildren property**: RegularPartnership now tracks whether original genea data contains children
- **Clean UI for childless couples**: Marriage lines appear without unnecessary expansion controls
- **Preserved functionality**: Partnerships with children still show proper expand/collapse controls

### 🚀 CURRENT TASK: Ancestor Expansion/Collapse Controls (IN PROGRESS)

#### Final Implementation Plan
After detailed design discussion, we've finalized a clean 4-phase approach:

**Phase 1**: Add `unexpandedChildIn` field to RenderPerson class
- Add `unexpandedChildIn = null` to RenderPerson constructor
- This field will store the partnership ID when a person has unexpanded ancestors

**Phase 2**: Update base renderer to track unexpanded parent partnerships
- Modify base-renderer.js logic for processing parent partnerships:
  ```javascript
  if (person.childIn) {
    if (this.isPartnershipExpanded(person.childIn.id)) {
      // Expanded - create RenderFamily as normal
      const parentFamilyIdx = buildFamily(person.childIn);
      renderTree.getPerson(idx).upFamilyRIndex = parentFamilyIdx;
    } else {
      // NOT expanded - just store the partnership ID for button detection
      renderTree.getPerson(idx).unexpandedChildIn = person.childIn.id;
    }
  }
  ```

**Phase 3**: Add ancestor expansion buttons in layout
- Detect when `unexpandedChildIn` is set and add `[+]` buttons above person boxes
- Use same circular button style as existing expansion system
- Store partnership ID in button for click handling

**Phase 4**: Update D3 renderer to handle ancestor buttons
- Recognize `ancestor-expansion-placeholder` button class
- Wire up click handlers to add partnership ID to `expandedPartnerships`
- Position buttons above person boxes instead of on marriage lines

#### Key Design Insights
1. **Don't create RenderFamily objects for unexpanded ancestors** - just store the partnership ID
2. **Reuse existing `expandedPartnerships` state management** - no new state needed
3. **Clean detection logic** - if `unexpandedChildIn` is set, show button
4. **Leverages existing infrastructure** - buttons, styling, click handling patterns all reused

### ✅ Recently Completed: Massive Field Renaming Refactor
- **Systematic renaming across entire codebase** (240+ lines changed):
  - RenderPartnership → RenderFamily (class name)
  - childIn → upFamilyRIndex (parent family index)
  - parentIn → rightFamilyRIndices (spouse family indices)
  - parents → spouseRIndices (person indices in family)
  - children → childRIndices (child person indices)
  - partnerships → families (array name)
- **All 109 tests passing** after comprehensive refactor
- **Clear naming achieved**: RIndex suffix makes render tree indices obvious vs genea object IDs

### Future Priority Items  
- **Complete ancestor expansion implementation**: Finish all 4 phases above
- **Clear user modifications on person change**: Reset expansion state when navigating to different person
- **Rename Partnership to Family in genea code**: For consistency with render tree terminology, consider renaming genea's "Partnership" class to "Family" and related field names (this would be a larger refactor affecting the Rust parser and JSON structures)

## ✅ What We've Accomplished
- **Core D3 SVG rendering** with professional visual appearance
- **Gender-based color scheme** that's inclusive and readable (warm gray-blue for male, gray-rose for female, neutral beige for unknown)
- **Click navigation** between family members with preserved URL state
- **Enhanced focus person highlighting** with drop shadow and thicker border
- **Reactive state management** that updates tree when navigating
- **Hover effects** with smooth transitions and visual feedback
- **Comprehensive test coverage** using real genea fixture data
- **Limited family tree scope** showing only immediate family relationships (focus person + parents + children)
- **Clickable expansion placeholders** with "+" buttons that expand partnerships
- **Collapse functionality** with "−" buttons on marriage lines when partnerships are expanded
- **Fixed state management** to properly track explicit expanded/collapsed states

## 🔄 Enhancement Ideas (No Particular Order)

### Visual & UX Improvements
- **Zoom/Pan Functionality**: D3 zoom behavior for navigating large family trees
- **Tree Auto-Centering**: Center view on focus person after navigation
- **Animation Transitions**: Smooth transitions when tree updates or people navigate
- **Generation Indicators**: Visual cues (colors, patterns) to show generation levels
- **Line Styling Variations**: Different colors/thickness for marriage vs parent-child lines
- **Multiple Visual Themes**: Allow switching between traditional, modern, high-contrast themes
- **Responsive Design**: Auto-scale and mobile-friendly touch interactions

### Interactive Features  
- **Partnership Expansion**: Make "+" buttons functional to expand/collapse family sections
- **Ancestor Expansion**: Controls to show more generations of ancestors
- **Family Stats Display**: Show generation count, relationship summaries in header
- **Navigation Breadcrumbs**: Track exploration history and allow quick navigation back

### Advanced Features
- **Multiple Ancestor Sets**: Support different Henry number lineage perspectives
- **Side-by-side Comparison**: Compare different family lineages
- **Enhanced UI Controls**: Improved renderer selector, dedicated expand/collapse buttons
- **Keyboard Navigation**: Arrow keys for tree navigation, accessibility support

## Technical Architecture

### Data Flow
```
Graph (from genea service)
  ↓ (BaseRenderer.buildVisibleGraph)
RenderTree (subset identification)  
  ↓ (layoutFamily)
Family (positioned layout elements)
  ↓ (D3TreeRenderer.renderToElement) 
SVG DOM (D3.js visualization)
```

### Key Design Decisions
1. **Reuse Layout Algorithm**: Don't reinvent positioning, leverage existing T-junction logic
2. **Follow TextRenderer Pattern**: Same pipeline, different output format
3. **Direct Coordinate Translation**: Layout provides positions, D3 renders at those coordinates
4. **Incremental Enhancement**: Start simple, add interactivity progressively

### Integration Points
- **Component**: `app/components/family-tree-visual.gjs` (existing)
- **Factory**: `app/utils/family-tree-renderers/index.js` (update)
- **Layout**: `app/utils/family-layout.js` (reuse existing)
- **Data**: `app/services/genea.js` (existing data source)

## Technical Notes
- Core architecture is solid and tested (111/111 tests passing)
- Uses real genea fixture data for reliable testing
- Follows Ember reactive patterns for state management
- TextRenderer provides working reference implementation
- All layout positioning handled by existing proven algorithm