# T-Junction Family Tree Rendering

## Status: Layout algorithm 90% complete, needs TODO cleanup

### Completed
- **Data structures**: `app/utils/render-tree.js`, `app/utils/render-tree-builder.js`
- **Layout algorithm**: `app/utils/family-layout.js` (core T-junction positioning)  
- **Supporting files**: `app/utils/layout-elements.js`, `app/utils/text-metrics.js`
- **Tests**: `tests/unit/utils/render-tree-builder-test.js` (passing)

### Next Steps (Priority Order)

1. **Code clarity improvements from programmer review** (COMPLETED)
   - ✅ Document "port" concept in header comments (`family-layout.js`)
   - ✅ Clarify junction calculation math - why `2 * (partnershipLineJunction - partnershipLineStart)`?
   - ✅ Explain `continuityMinWidth + firstChild.port` relationship in comments
   - ✅ Add comments about recursive layout overlap prevention strategy
   - ✅ Move hardcoded calculations to proper metrics methods (`family-layout.js:119, 184`)

2. **Complete layout algorithm TODOs** (HIGH)
   - `family-layout.js:83` - Handle unexpanded partnerships (navigation buttons)
   - `family-layout.js:94,103` - Add constraint diagrams for junction positioning
   - `family-layout.js:119` - Make partnership line centering a metrics method  
   - `family-layout.js:184` - Make sibling line offset a proper metric

3. **Henry number-based lineage selection** (HIGH)
   - Update `createDefaultRenderTree()` to use Henry numbers for primary parent choice
   - Ensure consistent lineage selection across family perspectives

4. **Visual renderer integration** (MEDIUM)
   - Connect RenderTree to existing D3TreeRenderer or create new renderer
   - Implement actual SVG/Canvas drawing of T-junction structures

5. **Navigation implementation** (MEDIUM)
   - Handle clicks on `AlternateLineagePartnership` nodes to switch perspectives
   - Add breadcrumb tracking for navigation history

### Key Design Decisions
- **Index-based references**: Performance and debugging (see `render-tree.js` comments)
- **Partnership-centric model**: Maps directly to T-junction visual representation  
- **Box-based coordinates**: (0,0) = top-left of primary person (see `family-layout.js` header)

### Integration Points
- **Data source**: `app/services/genea.js` 
- **Visual spec**: `architecture/visual_design.md`
- **Target component**: `app/components/family-tree-visual.gjs`
- **Debugging**: `renderTree.toDebugObject()` for JSON representation