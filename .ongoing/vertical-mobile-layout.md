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