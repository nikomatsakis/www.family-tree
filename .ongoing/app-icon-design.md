# App Icon Design

## Status: Design Phase - Generating Variants
**Created**: June 23, 2025
**Priority**: LOW - Visual enhancement, no functional impact

## Overview
Replace the default "F" icon with a proper family tree icon that represents the Greek family heritage. Focus on Karpathos island while including broader family geography.

## Design Direction Approved
Greece map-based icon with Karpathos emphasis. Three variants being explored:
1. **Greece map with enlarged Karpathos** - Simple, direct
2. **Greece map with Karpathos detail bubble** - Professional, cartographic 
3. **Greece map with location pin + "Family Tree" text** - Clear purpose

## Implementation Tasks

### Icon Creation
- [ ] Generate all three design variants 
- [ ] Create in multiple sizes (16x16 to 512x512)
- [ ] Export as SVG + PNG formats
- [ ] Test readability at small sizes

### Technical Integration  
- [ ] Update manifest.json with new icon paths
- [ ] Replace existing icons in public/icons/ directory
- [ ] Test icon appearance on iOS and Android home screens
- [ ] Verify PWA installation flow with new icons

## Design Specifications

### Context
Create app icons for a Greek family tree/genealogy application. The family is primarily from Karpathos (a small Greek island) but includes relatives from mainland Greece. The icon should feel like a navigation app or atlas - professional and geographic.

### Variant 1: Greece Map with Emphasized Karpathos

Design a mobile app icon with these elements:

**BACKGROUND:**
- Oval shape filled with Mediterranean blue (#0077BE or similar ocean blue)
- Oval should have slight padding around the map elements

**MAIN MAP:**
- White silhouette of Greece (mainland + major islands)
- Greece mainland looks like an upside-down hand with "fingers" pointing south
- Include major islands: Crete (large horizontal island at bottom), island chains
- Style: Simple, clean shapes - think Google Maps or Apple Maps aesthetic

**KARPATHOS EMPHASIS:**
- Karpathos: Small, thin vertical island southeast of mainland (between mainland and Crete)
- Make Karpathos 2-3x larger than geographically accurate but keep its elongated shape
- Keep it obviously connected to its correct location in the Dodecanese island chain
- Include major islands (Crete, Rhodes nearby) but Karpathos should be prominently enlarged
- Should be noticeably bigger than it would be in reality while maintaining visual harmony

**TECHNICAL:**
- Primary size: 192x192 pixels (also need 512x512 for app stores)
- Must remain crisp and readable at 64x64, 32x32, and 16x16 (favicon)
- Format: SVG preferred (scalable), PNG fallbacks needed
- Colors: Flat blue background (#0077BE), pure white (#FFFFFF) geography
- At smallest sizes (32x32): simplify by removing tiny islands if needed for clarity
- Clean vector shapes, no gradients or fine details
- iOS style: slightly rounded corners on final icon
- Android style: should work with adaptive icon system

### Variant 2: Greece Map with Karpathos Detail Bubble

Design a mobile app icon with these elements:

**BACKGROUND & MAIN MAP:**
- Same as Variant 1: blue oval, accurate white Greece silhouette
- Keep Karpathos at its correct geographic size and location

**DETAIL INSET BUBBLE:**
- Small white circle in bottom-right corner of the oval
- Circle should be about 20-25% of the total icon width
- Inside the circle: enlarged, clear silhouette of Karpathos island
- Karpathos shape: thin, elongated vertical island (like a skinny finger)
- Optional: very thin white line connecting the bubble to actual Karpathos location

**STYLE REFERENCE:**
- Think atlas or GPS navigation app
- Professional cartographic look
- Like a "zoom in" detail view you'd see on Google Maps
- Clean, modern, not decorative

**TECHNICAL:**
- Same specs as Variant 1
- Bubble should remain readable even at small sizes
- If bubble becomes too small at 32x32, prioritize the main Greece map

### Variant 3: Greece Map with Location Pin

Design a mobile app icon with these elements:

**BACKGROUND & MAIN MAP:**
- Same as Variants 1 & 2: Mediterranean blue oval, white Greece silhouette
- Keep all geography at accurate scale (don't enlarge Karpathos)

**LOCATION PIN:**
- Classic Google Maps style red/orange pin (like 📍)
- Drop pin precisely at Karpathos location (southeast of mainland)
- Pin should be proportionally sized - visible but not overwhelming the map
- Pin color: Bright red (#EA4335) or orange (#FF6B35) for high contrast against blue
- Pin style: Simple teardrop shape with small circle at bottom

**TEXT ELEMENT:**
- "Family Tree" text positioned to the right side of the Greece map
- Font: Clean, medium-weight sans-serif (Helvetica, Arial, or system font)
- Color: White (#FFFFFF) to match the map
- Size: Large enough to read at 64x64px, secondary to the map
- Layout: Stack words vertically ("Family" above "Tree") to fit better
- At 32x32px and smaller: consider removing text for clarity
- Optional: Very subtle drop shadow for better contrast if needed

**VISUAL HIERARCHY:**
1. Greece map outline (primary focus)
2. Red location pin (draws attention to Karpathos)
3. "Family Tree" text (clarifies purpose)

**STYLE REFERENCE:**
- Google Maps app aesthetic
- Location-based service apps
- Clean, functional, immediately communicates "geographic family connections"

**TECHNICAL:**
- Same multi-size specs as other variants (192x192, 512x512, down to 16x16)
- Pin should have subtle drop shadow for depth and visibility
- At 32x32px: consider text-free version focusing on map + pin
- High contrast throughout: blue background (#0077BE), white map/text (#FFFFFF), red pin (#EA4335)
- Formats: SVG source + PNG exports
- Pin should be proportional but clearly visible at all sizes

## Visual Reference Points
- Google Maps app icon (clean, geographic)
- Apple Maps style (simple, high contrast)
- Atlas or educational geography materials

## Output Requirements
- **File Formats:** SVG (source) + PNG exports
- **Sizes Needed:** 16x16, 32x32, 64x64, 192x192, 512x512 pixels
- **File Naming:** family-tree-icon-variant1-192.png (etc.)
- **Deliverables:** All three variants in all required sizes
- **Style Guide:** Show how icon looks at different sizes
- **Colors:** Use exact hex codes provided (#0077BE, #FFFFFF, #EA4335)

## Success Criteria
- Icons work well at all sizes from favicon (16x16) to app store (512x512)
- Clear representation of both Greek heritage and family tree purpose
- Professional appearance matching modern mobile app standards
- Proper integration with PWA installation flow

## Dependencies
- Requires icon generation tool or designer
- Must coordinate with existing PWA manifest.json structure
- Should test on actual mobile devices after implementation