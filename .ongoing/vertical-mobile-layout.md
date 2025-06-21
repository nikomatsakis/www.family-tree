# Vertical Layout for Mobile

## Status: Phase 7 Complete - Ready for Responsive Integration
**Created**: December 16, 2024
**Updated**: June 21, 2025  
**Priority**: HIGH - Current horizontal layout unusable on mobile devices

## Progress Summary
✅ **Renderer Interface Refactoring** - Clean, unified interface for both renderers  
✅ **Phase 1** - Single person rendering  
✅ **Phase 2** - Simple marriage (no children)  
✅ **Phase 3** - Parents with one child  
✅ **Phase 3.5** - Partnership with no children (validation)  
✅ **Phase 3.6** - Child with own family (recursive layout)  
✅ **Phase 4** - Multiple children (vertical stacking)  
✅ **Phase 5** - Multiple partnerships with continuity lines
✅ **Phase 6** - Ancestor expansion buttons
✅ **Phase 7** - D3 renderer with optimized spacing

**Next**: Phase 8 - Responsive layout switching (optional)

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

## Reference Design (Approved)
```
    ┌─────┐        ┌─────┐                                      
    │Sarek│ ──[+]─ │T'Rea│                                      
    └╥────┘        └─────┘                                      
     ║                                                          
     ║                                                          
     ║                                                          
    ┌╨────┐        ┌──────────────┐                             
    │Sarek│ ──[−]─ │Amanda Grayson│                             
    └╥────┘    │   └──────────────┘                             
     ║  ┌──────┘                                                
     ║  │ ┌─────┐        ┌────────┐                             
     ║  ├─┤Spock│ ──[−]─ │Zarabeth│                             
     ║  │ └╥────┘    │   └────────┘                             
     ║  │  ║         │                                          
     ║  │  ║       ┌─┴─┐                                        
     ║  │  ║       │Zar│                                        
     ║  │  ║       └───┘                                        
     ║  │ ┌╨────┐        ┌─────────────────────┐                
     ║  │ │Spock│ ──[−]─ │Alexandra Tremontaine│                
     ║  │ └╥────┘    │   └─────────────────────┘                
     ║  │  ║    ┌────┴───┐                                      
     ║  │  ║    │T'Amanda│                                      
     ║  │  ║    └────────┘                                      
     ║  │ ┌╨────┐        ┌──────┐                               
     ║  │ │Spock│ ────── │Saavik│                               
     ║  │ └─────┘        └──────┘                               
     ║  │ ┌───────────────┐        ┌────────────────┐           
     ║  └─┼Michael Burnham│ ──[+]─ │Cleveland Booker│           
     ║    └───────────────┘        └────────────────┘           
     ║                                                          
    ┌╨────┐        ┌───────────────┐                            
    │Sarek│ ────── │Perrin Landover│                            
    └─────┘        └───────────────┘                            
```

## Key Design Patterns
1. **Continuity Lines (║)** - Same person across multiple partnerships
2. **Vertical Flow** - Generations top-to-bottom  
3. **Right Branching** - Children branch right from partnerships
4. **Partnership Lines** - Horizontal spouse connections with buttons
5. **Mobile Optimized** - Narrow width, vertical scrolling

## 🔍 Important Discovery: Existing Layout Already Has Core Logic!

**The current horizontal layout already implements the complex parts:**
- ✅ Person repetition with continuity lines (║, ╨, ╥)
- ✅ Multiple partnerships for the same person  
- ✅ Complex branching patterns

**Current horizontal layout** (showing same Sarek family):
```
┌─[+]─┐        ┌─────┐
│Sarek│ ──[+]─ │T'Rea│
└╥────┘        └─────┘
 ║
 ║
 ║
┌╨────┐        ┌──────────────┐
│Sarek│ ──[−]─ │Amanda Grayson│
└╥────┘    │   └──────────────┘
 ║         ├───────────────────────────────────────────┐
 ║         │                                           │
 ║         │                                           │
 ║      ┌──┴──┐        ┌────────┐              ┌───────┴───────┐        ┌────────────────┐
 ║      │Spock│ ──[−]─ │Zarabeth│              │Michael Burnham│ ──[+]─ │Cleveland Booker│
 ║      └╥────┘    │   └────────┘              └───────────────┘        └────────────────┘
 ║       ║         │
 ║       ║         │
 ║       ║         │
 ║       ║       ┌─┴─┐
 ║       ║       │Zar│
 ║       ║       └───┘
 ║       ║
 ║       ║
 ║       ║
 ║      ┌╨────┐        ┌─────────────────────┐
 ║      │Spock│ ──[−]─ │Alexandra Tremontaine│
 ║      └╥────┘    │   └─────────────────────┘
 ║       ║         │
 ║       ║         │
 ║       ║         │
 ║       ║    ┌────┴───┐
 ║       ║    │T'Amanda│
 ║       ║    └────────┘
 ║       ║
 ║       ║
 ║       ║
 ║      ┌╨────┐        ┌──────┐
 ║      │Spock│ ────── │Saavik│
 ║      └─────┘        └──────┘
 ║
 ║
 ║
┌╨────┐        ┌───────────────┐
│Sarek│ ────── │Perrin Landover│
└─────┘        └───────────────┘
```

**Key insight**: The vertical mobile layout is primarily a **positioning optimization** rather than a complete algorithm rewrite!

## ✅ Key Discoveries from Implementation

1. **Separate function approach worked well**: Created `layoutFamilyVertical()` as a separate function rather than adding parameters to existing `layoutFamily()`. This kept the code cleaner and easier to understand.

2. **Main differences confirmed**:
   - Child positioning: Children appear below parents with left-branching pattern
   - Port usage: `leftPort` for vertical connections vs `topPort` for horizontal
   - Spacing: Compact vertical stacking with no gaps between siblings
   - Junction patterns: Different line routing (down → left → connect to child)

3. **Reused concepts successfully**:
   - Continuity line logic (not yet implemented but structure is ready)
   - Recursive family layout
   - Expansion/collapse button positioning
   - Family.port interface for connection points

## Renderer Interface Design ✅ COMPLETED

### Previous Issues (All Resolved)
1. ~~String comparisons: `measureBox()` checks if text === '+' or '−'~~ → Fixed with `measureButton()`
2. ~~Complex parameters: Button position methods take 5+ parameters~~ → Simplified with `personBoxMetrics()`
3. ~~Mixed concerns: Box measurement separate from port calculations~~ → Consolidated in `personBoxMetrics()`

### Implemented Interface
```javascript
// Person box measurement - returns ALL metrics at once
personBoxMetrics(text) → {
  width: number,
  height: number,
  topPort: number,         // X offset for top connection (horizontal layout)
  leftPort: number,        // Y offset for left connection (vertical layout)
  ancestorButtonX: number, // X position for ancestor button placement
  ancestorButtonY: number, // Y position for ancestor button placement
}

// Separate button measurement methods (no string checking!)
measureExpandButton() → {width: number, height: number}
measureCollapseButton() → {width: number, height: number}

// Cleaner button positioning (fewer parameters)
getExpandButtonPosition(junctionX, lineY) → {x, y}
getCollapseButtonPosition(junctionX, lineY) → {x, y}

// Rename existing constants for clarity
horizontalSpacerWidth: number       // Gap between person and marriage line
horizontalVerticalSpacing: number   // Gap between generations
horizontalChildSpacing: number      // Gap between siblings
horizontalContinuityOffset: number  // X offset for continuity line
horizontalContinuityMinWidth: number // Min X for first child
horizontalMinimumLineLength: number // Min marriage line length

// New vertical layout constants
verticalSpacerWidth: number         // Gap between person and marriage line
verticalChildIndent: number         // Fixed horizontal offset for children from continuity line
verticalGenerationGap: number       // Vertical gap between parent and children  
verticalSiblingSpacing: number      // Vertical gap between siblings
verticalContinuityOffset: number    // X offset for continuity line
verticalMinimumLineLength: number   // Min marriage line length
```

### Implementation Plan - Renderer Interface Refactoring

**Refactor 1: Rename spacing constants** ✅ COMPLETED
- ✅ Renamed all spacing constants from `spacerWidth` → `horizontalSpacerWidth`, etc.
- ✅ Updated both text and D3 renderers with new constant names
- ✅ Updated `layoutFamily()` to use new names throughout
- ✅ All tests pass - no functionality broken

**Refactor 2: Add `personBoxMetrics()` and update person measurements** ✅ COMPLETED
- ✅ Added `personBoxMetrics()` method to both text and D3 renderers
- ✅ Updated layout to use `personBoxMetrics()` for person boxes
- ✅ Extract `topPort`, `ancestorButtonX`, `ancestorButtonY` from metrics
- ✅ Removed calls to `getPortPosition()` and `getAncestorButtonPosition()`
- ✅ All tests pass - functionality preserved

**Refactor 3: Add button methods and update button measurements** ✅ COMPLETED
- ✅ Added `measureButton()` method to both text and D3 renderers
- ✅ Replaced `measureBox('+')` with `measureButton()`
- ✅ Replaced `measureBox('−')` with `measureButton()`
- ✅ Eliminated string comparisons in button measurement
- ✅ All tests pass - functionality preserved

### Summary of Renderer Interface Refactoring ✅ COMPLETE

**Key Achievements:**
- ✅ **Clean Constants**: All spacing constants renamed to `horizontalXxx` for clarity
- ✅ **Consolidated Metrics**: `personBoxMetrics()` returns all box data in one call:
  - Box dimensions (width, height)  
  - Port positions (topPort for horizontal layout, leftPort for vertical layout)
  - Ancestor button positioning (ancestorButtonX, ancestorButtonY)
- ✅ **Eliminated String Comparisons**: `measureButton()` replaces `measureBox('+')` checks
- ✅ **Consistent Interface**: Both text and D3 renderers implement the same clean methods
- ✅ **Zero Functionality Changes**: All tests pass, existing behavior preserved

**Renderer Interface is now ready for vertical layout implementation!**

## Remaining Work

### Phase 5: Multiple Partnerships (Continuity Lines) ⬅️ NEXT
- Implement vertical continuity lines for multiple partnerships
- Test person with 2-3 spouses showing proper repetition
- Expected: Vertical continuity lines (║) connecting repeated person boxes

### Phase 6: Ancestor Expansion Buttons
- Position ancestor expansion buttons in vertical mode
- Test unexpanded ancestors show [+] button correctly

### Phase 7: D3 Renderer Updates
- Update D3 renderer to support vertical layout mode
- Implement same spacing constants and positioning logic
- Ensure buttons and interactions work correctly

### Phase 8: Responsive Integration
- Add layout mode switching (horizontal vs vertical)
- Auto-detect based on viewport width
- User preference toggle
- Smooth transitions between modes

## Implementation Decisions (For Phase 8)
- **Mobile-first**: Start with vertical as default on narrow screens?
- **Breakpoint**: ~768px viewport width for mobile/desktop switch?
- **User control**: Allow manual override of auto-detection?
- **Performance**: Vertical mode should be as fast as horizontal

## Key Interface Methods ✅ IMPLEMENTED
- `personBoxMetrics(text)` → Returns all box metrics including ports and button positions
- `measureButton()` → Unified button measurement (no string comparisons)
- `horizontalXxx` spacing constants for horizontal layout
- `verticalXxx` spacing constants for vertical layout

## Incremental Implementation Plan

### Phase 1: Single Person + Vertical Constants ✅ COMPLETED
- ✅ Added vertical spacing constants to text renderer only
- ✅ Created `layoutFamilyVertical()` function 
- ✅ Handle: single person with no family
- ✅ Test: single person renders correctly in vertical mode
- ✅ All tests pass - linting clean

### Phase 2: Simple Marriage (No Children) ✅ COMPLETED
- ✅ Extended vertical layout to handle partnerships
- ✅ Test: two people connected with marriage line
- ✅ Expected output: Partners side-by-side with horizontal connection
- ✅ Used correct line length calculation (2x minimum to junction)
- ✅ All tests pass - linting clean

### Phase 3: Simple Family (Parents + One Child) ✅ COMPLETED
- ✅ Added child positioning logic with break-left pattern
- ✅ Used `leftPort` for child connections to connect at middle of child box
- ✅ Test: parents with single child below them
- ✅ Expected: Child appears below partnership with vertical connection
- ✅ Proper junction characters: `┌─────────┘` and `└─┤`
- ✅ All vertical tests pass - linting clean

### Phase 3.5: Partnership with No Children ✅ COMPLETED
- ✅ Created fixture with marriage but no children in genea data
- ✅ Test that no expansion button appears (neither `[+]` nor `[−]`)
- ✅ Expected: `│Bob Test│ ────── │Alice Test│` (plain marriage line, no button)
- ✅ Validates `hasChildren = false` case
- ✅ All vertical tests pass

### Phase 3.6: Child with Own Family (Recursive Layout) ✅ COMPLETED
- ✅ Created fixture with three generations (Dad+Mom → Son+Wife → Grandson)
- ✅ Test child who has spouse and children
- ✅ Verified recursive `layoutFamilyVertical()` call works properly
- ✅ Expected: Child's family appears as complete unit below parents
- ✅ Critical test of recursive layout algorithm - passes immediately!
- ✅ Refactored to use Family.port interface instead of digging into renderTree
- ✅ Set family.port = leftPort for vertical layout connections
- ✅ All vertical tests pass

### Phase 4: Multiple Children (Sibling Stacking) ✅ COMPLETED
- ✅ Extended `layoutFamilyVertical()` to process ALL children instead of just first
- ✅ Implemented vertical sibling positioning with proper junction characters
- ✅ Test: parents with 2 children stacked vertically (├─ for continuing, └─ for last)
- ✅ Created separate `single-child` fixture to test single child case independently
- ✅ Expected: Children stacked vertically with no gaps between them for compact layout
- ✅ All vertical tests pass - supports both single child and multiple children scenarios

### Phase 5: Multiple Partnerships (Continuity Lines) ✅ COMPLETED
- ✅ Implemented loop to handle all partnerships instead of just the first
- ✅ Added continuity line logic with proper vertical spacing  
- ✅ Created repeated person rectangles for subsequent partnerships
- ✅ Test: person with 3 spouses showing proper vertical continuity lines
- ✅ Expected: Vertical continuity lines (║) connecting repeated person boxes
- ✅ All vertical tests pass - supports multiple partnerships with children

### Phase 6: Ancestor Expansion Buttons ✅ COMPLETED
- ✅ Added ancestor expansion button logic to `layoutFamilyVertical()`
- ✅ Reused existing positioning logic from horizontal layout (`personMetrics.ancestorButtonX/Y`)
- ✅ Created test focusing on Child One with unexpanded ancestors
- ✅ Test validates button positioning: `┌───[+]───┐` above person's name box
- ✅ All 125 tests pass - no regressions introduced
- ✅ Ancestor buttons now work correctly in vertical layout matching horizontal behavior

### Phase 7: D3 Renderer Updates ✅ COMPLETED
- ✅ Added vertical layout support to D3 renderer with `layoutMode` option
- ✅ Implemented optimized vertical spacing constants:
  - `verticalChildIndent`: 15px for compact child positioning
  - `verticalMinimumLineLength`: 40px for closer partner spacing
  - `verticalSiblingSpacing`: 30px for visual separation between children
- ✅ Fixed proportional spacing: equal 15px gaps from continuity → children line → children
- ✅ Corrected ancestor expansion button positioning (half-overlap with top border)
- ✅ Cleaned up line length calculations removing extra spacer additions
- ✅ D3 vertical layout provides clean, compact family tree visualization for mobile
- ✅ All visual issues resolved through iterative spacing refinements

## Vertical Spacing Constants ✅ IMPLEMENTED
```javascript
// Text renderer values (characters) - All added to TextRenderer
verticalSpacerWidth: 1          // Gap between person and marriage line
verticalChildIndent: 2          // Fixed horizontal offset for children  
verticalGenerationGap: 2        // Vertical gap between parent and children
verticalSiblingSpacing: 1       // Vertical gap between siblings (currently 0 for compact layout)
verticalContinuityOffset: 1     // X offset for continuity line
verticalMinimumLineLength: 3    // Min marriage line length
```

## Key Technical Differences
1. **Port Usage**: `leftPort` instead of `topPort` for child connections
2. **Child Positioning**: Fixed horizontal indent + vertical stacking
3. **Junction Flow**: Down → break left → connect to child's left side
4. **Mobile Optimized**: Narrow horizontal space, generous vertical space