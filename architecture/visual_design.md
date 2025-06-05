L# Family Tree Visual Design Architecture

## Overview

This document describes the visual design principles and implementation strategy for rendering family trees in the web application. The design prioritizes clarity, navigability, and scalability for complex family relationships while maintaining visual appeal and intuitive user interaction.

## Core Design Principles

### 1. Hierarchical Layout
- **Vertical flow**: Ancestors at top, descendants flowing downward
- **Generation alignment**: People of the same generation appear at the same horizontal level
- **Clear ancestry paths**: Unambiguous parent-child relationships

### 2. T-Junction Marriage Representation
Marriage relationships and their children are shown using T-shaped junctions:

```
Parent1 ──┬── Parent2
          |
    ┌─────┴─────┐
    |           |
  Child1     Child2
```

**Key elements:**
- Horizontal line connects married partners
- Vertical line drops from marriage to children level
- Multiple children branch horizontally in birth order

### 3. Multiple Marriage Handling
When a person has multiple marriages, we repeat the person for each marriage with visual continuity:

```
Person ──┬── Spouse1
   :     |
   :   Child1
   :
Person ──┬── Spouse2
   :     |
   :   Child2
   :
Person ───── Spouse3
```

**Design specifications:**
- **Vertical connector**: `:` represents same person (double line, light grey)
- **Repeated names**: Rendered in light grey after first occurrence
- **Chronological order**: Marriages listed top-to-bottom by date
- **Complete families**: Each marriage fully rendered before next

## Navigation Architecture

### 4. Primary Lineage Focus
Each view focuses on one primary ancestral line following Henry number hierarchy:

```
                        Primal Ancestor
                             |
                      Primary Child Line
                             |
                    (show alternative lineage)
                             |
                        Current Person
```

**Expansion Rules:**
- For any ancestor A in the tree, at most ONE of A's parents has their lineage expanded upward
- This creates a single "primary lineage" thread through the generations
- Other parents appear in the tree but their ancestry is not shown
- This prevents exponential growth (avoiding 2^n ancestors at generation n)
- The selected lineage forms the "spine" of the family tree visualization

Example:
```
                    Solkar ← (only Solkar's lineage expanded upward)
                      |
                   Solkar ──┬── T'Rama ← (appears but ancestry not shown)
                            |
                          Skon ← (continues primary lineage)
                            |
                         Skon ──┬── T'Les ← (appears but ancestry not shown)
                                |
                              Sarek ← (continues primary lineage)
                                |
                             Sarek ──┬── Amanda ← (appears but ancestry not shown)
                                     |
                                   Spock (current person)
```

### 5. Recursive Family Tree Navigation
Users can switch between family tree perspectives at marriage points:

```
Current View: Solkar → Skon → Sarek → Amanda → Spock
Alternative:  Amanda's Mommy → Amanda's Daddy → Amanda → Spock
```

**Navigation features:**
- **Toggle points**: `(show [person]'s family)` nodes at marriage junctions
- **Context preservation**: Current person remains highlighted across views
- **Breadcrumb tracking**: Clear indication of current lineage path
- **Recursive application**: Any marriage offers perspective switching

## Visual Elements

### 6. Line Types and Styling
- **Primary connections**: Solid black lines for marriages and parent-child relationships
- **Continuity connectors**: Light grey double lines (`:`) for same-person repetitions
- **Marriage lines**: Horizontal (`──`) connecting spouses
- **Parent-child lines**: Vertical (`|`) and T-junctions (`──┬──`)

### 7. Node Styling
- **First occurrence**: Full color/weight text
- **Repeated instances**: Light grey text with continuity line
- **Current person**: Highlighted with brackets `[NAME]` or special styling
- **Navigation nodes**: Italic or special styling for `(show ancestors)` buttons

### 8. Interactive Elements
- **Expandable ancestors**: Click to switch family tree perspective
- **Person navigation**: Click any person to make them the focal point
- **Hover effects**: Highlight all instances of repeated persons
- **Zoom/pan**: Navigate large family trees with smooth interaction

## Implementation Strategy

### 9. Data Structure Requirements
The renderer expects:
- **Henry number hierarchy**: Primary lineage determination
- **Marriage groupings**: Chronologically ordered for each person
- **Cross-references**: Links between family trees via marriages
- **Generation levels**: For proper vertical alignment

### 10. Rendering Algorithm
1. **Determine primary lineage** from Henry numbers starting with current person
2. **Build vertical generations** from oldest ancestor downward
3. **Process marriages sequentially** for each person with multiple spouses
4. **Insert navigation nodes** at marriage points to alternative lineages
5. **Apply visual styling** with proper line types and node emphasis

### 11. Responsive Considerations
- **Scalable layout**: Works for families with 3-50+ people
- **Smooth transitions**: Animate between different family perspectives
- **Mobile adaptation**: Touch-friendly navigation and appropriate sizing
- **Performance**: Efficient rendering for large family networks

## Future Enhancements

### 12. Advanced Features
- **Collapsible branches**: Hide/show distant relatives
- **Timeline integration**: Show marriages and births chronologically
- **Photo integration**: Person portraits within nodes
- **Relationship annotations**: Marriage dates, locations, notes
- **Export capabilities**: Print-friendly and shareable formats

### 13. Accessibility
- **Screen reader support**: Proper ARIA labels and navigation
- **Keyboard navigation**: Tab through family tree structure
- **High contrast modes**: Alternative styling for visibility
- **Text scaling**: Responsive to user font size preferences

## Technical Implementation

### 14. D3.js Integration
- **SVG rendering**: Scalable vector graphics for crisp lines and text
- **Zoom/pan behavior**: D3's built-in interaction handling
- **Data binding**: Reactive updates when switching family perspectives
- **Animation**: Smooth transitions between tree states

### 15. Component Architecture
- **Modular design**: Separate concerns for layout, styling, and interaction
- **State management**: Track current family perspective and navigation history
- **Event handling**: Click, hover, and keyboard interactions
- **Performance optimization**: Efficient re-rendering for large trees

## Implementation Notes

### Primary Lineage Selection
The expansion state needs to track not just which partnerships are expanded, but which specific ancestral path is being followed:
- Each person in the primary lineage has exactly one parent partnership expanded
- This creates a "selected path" through the ancestry
- The path can be represented as a map: personId → parentPartnershipId
- When switching perspectives, we rebuild this path map

### Graph Building Implications
The BaseRenderer's `buildVisibleGraph` method needs to understand:
- **Primary ancestors**: Those along the selected ancestral path
- **Expanded partnerships**: Controls which non-primary branches are shown
- **Visible but not expanded**: Spouses of primary ancestors whose lineages aren't shown

This design provides a clear, navigable, and visually appealing way to explore complex family relationships while maintaining simplicity and avoiding visual clutter.