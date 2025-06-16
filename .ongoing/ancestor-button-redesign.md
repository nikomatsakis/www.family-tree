# Ancestor Button Redesign

## Status: Design Approved, Not Yet Implemented
**Created**: December 16, 2024
**Context**: See tmp/screenshot.png for current awkward placement

## Problem
Current D3 implementation places `[+]` button directly on top of person box, which looks visually awkward and inconsistent with other UI patterns.

## Approved Design
```
    [+]  <-- Ancestor expansion button (junction point)
     |
     |   <-- Vertical connector line  
+--------+
| Person |
+--------+
```

## Benefits
- Visual consistency with other expansion buttons at connection points
- Clear hierarchy showing these are ancestors
- No overlap with person box
- Intuitive interaction at natural junction point

## When Expanded
```
+-------+     +-------+
| Parent|─────| Parent|  <-- Parents appear to sides
+-------+  |  +-------+
           |
        +------+
        |Person|
        +------+
```

## Implementation Notes
- Position button above person box with appropriate spacing
- Add vertical connector line from button to person
- Adjust click area to include button and line
- Ensure proper animation when ancestors appear
- Update both D3 and text renderers for consistency

## Dependencies
- May need to adjust layout spacing calculations
- Consider interaction with vertical mobile layout