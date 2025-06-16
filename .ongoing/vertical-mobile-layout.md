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

## 🤔 Planning Questions for Tomorrow

1. **Is this mainly a positioning change?** Rather than building a completely new algorithm, are we mainly adjusting:
   - How children are positioned relative to parents
   - Spacing and branch directions  
   - Mobile-optimized dimensions

2. **Layout parameter approach?** Should we add a `layoutDirection` parameter to the existing `layoutFamily()` function rather than creating a separate function?

3. **What's the key difference?** Looking at both layouts, it seems like the vertical version:
   - Keeps the same continuity line logic
   - Changes child positioning to branch right more compactly
   - Optimizes spacing for narrow screens

## Renderer Interface Design

### Current Issues
1. **String comparisons**: `measureBox()` checks if text === '+' or '−' 
2. **Complex parameters**: Button position methods take 5+ parameters
3. **Mixed concerns**: Box measurement separate from port calculations

### Agreed Upon Interface Refactor
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

### Next Phase: Vertical Layout Implementation
After completing the renderer interface refactoring:
- Create `layoutFamilyVertical()` function
- Use vertical spacing constants and leftPort from metrics
- Implement child positioning with fixed indent and vertical stacking
- Test with text renderer first, then update D3 renderer

## Technical Approach (To Be Refined)
### Phase 1: Layout Algorithm
- ~~Create new `layoutFamilyVertical()` function~~ → Maybe just add parameter to existing?
- ~~Implement continuity line logic~~ → Already exists!
- Focus on: Calculate mobile-optimized spacing and right-branching for children
- Handle partnership positioning and connection routing for narrow screens

### Phase 2: Renderer Updates  
- ~~Update text renderer to support vertical line characters~~ → Already supported!
- Modify D3 renderer for mobile-optimized SVG positioning
- Add layout mode parameter to switch between horizontal/vertical

### Phase 3: Responsive Integration
- Auto-detect mobile vs desktop viewport
- Add user preference toggle
- Ensure smooth transitions between modes

## Implementation Decisions (Pending Discussion)
- **Mobile-first**: Start with vertical as default on narrow screens?
- **Breakpoint**: ~768px viewport width for mobile/desktop switch?
- **User control**: Allow manual override of auto-detection?
- **Performance**: Vertical mode should be as fast as horizontal