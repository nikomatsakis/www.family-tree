/**
 * Family Layout Algorithm
 * =======================
 *
 * Implements T-junction family tree layout using the box-based coordinate algorithm.
 * See architecture/visual_design.md for design principles.
 *
 * Family Port Concept:
 * Each Family has a "port" - the connection point where a parent-child line from above
 * should attach. The port is always:
 * - Located on the top edge of the family's bounding box
 * - Horizontally aligned with the center of the focus person's rectangle
 * - Used when this family is positioned as a child to align with parent junction lines
 *
 * This ensures clean T-junction connections when families are nested recursively.
 */

import { Family, Rectangle, Line } from './layout-elements.js';

/**
 * Layout a single person and their immediate family using T-junction algorithm.
 *
 * This function should be called with a root ancestor person and will recursively
 * layout all descendants. The layout proceeds top-down from ancestors to children.
 *
 * Example output for Parent1 with 2 partnerships:
 * ```
 *    port     partnership line
 *      │      and junction
 *      ▼        │
 * +----*----+   ▼   +---------+
 * | Parent1 | --+-- | Parent2 |
 * +---------+   |   +---------+
 *  ::           |
 *  ::           | ← parent-child line
 *  ::           +---------------------+--------------+ ← sibling line
 *  ::           |                     |              |
 *  ::       +---*---------------+  +--*--------+  +--*--------+
 *  ::       | Child1 and family |  | Child2... |  | Child3... |
 *  ::       +-------------------+  +-----------+  +-----------+
 *  :: ← continuity line
 * +---------+       +---------+
 * | Parent1 | ----- | Parent3 |
 * +---------+       +---------+                               .
 *                                                             ▲
 *                                                             │
 *                     resulting family dimensions ────────────┘
 * ```
 *
 * @param {RenderTree} renderTree - The render tree data structure
 * @param {number} personIndex - Index of person to layout
 * @param {TextRenderer} renderer - Text renderer with measurement capabilities
 * @returns {Family} Complete family layout with positioned elements
 *
 * Renderer Interface Requirements:
 * The renderer parameter must implement the following interface:
 *
 * Properties (spacing constants):
 * - spacerWidth: number - Gap between person box and marriage line
 * - continuityOffset: number - X offset from person where continuity line is placed
 * - continuityMinWidth: number - Minimum X position where first child can start
 * - minimumLineLength: number - Minimum length for marriage line segments
 * - verticalSpacing: number - Gap between generations
 * - childSpacing: number - Horizontal gap between siblings
 *
 * Methods:
 * - measureBox(text: string) → {width: number, height: number} - Measure dimensions for a box with given text
 * - getPortPosition(width: number) → number - Calculate X offset for connection point (port) on top of box
 * - getPartnershipLineY(personHeight: number) → number - Y offset for marriage line relative to person box top
 * - getSiblingLineY(parentChildLineHeight: number) → number - Y offset for sibling connector line
 * - getButtonPosition(junctionX: number, lineY: number) → {x: number, y: number} - Position for expand/collapse buttons
 * - getAncestorButtonPosition(personX: number, personY: number, personWidth: number, personHeight: number, buttonWidth: number) → {x: number, y: number} - Position for ancestor expansion buttons
 */
export function layoutFamily(
  renderTree,
  personIndex,
  renderer,
  visitedPersons = new Set(),
) {
  // Prevent infinite recursion by tracking visited persons
  if (visitedPersons.has(personIndex)) {
    console.error(
      `Circular reference detected: person ${personIndex} already being laid out`,
    );
    console.error('Visit chain:', Array.from(visitedPersons));
    throw new Error(
      `Circular reference detected in family tree: person ${personIndex}`,
    );
  }

  visitedPersons.add(personIndex);

  const person = renderTree.getPerson(personIndex);
  const family = new Family();

  // Step 1: Create primary person rectangle at origin
  //
  // +----------+
  // | Parent1  | <--
  // +----------+
  const personMetrics = renderer.personBoxMetrics(person.name);
  const primaryRect = new Rectangle(
    person.name,
    'primary-person',
    personMetrics.width,
    personMetrics.height,
    person.gender,
    person.id,
  );
  family.addElement(primaryRect);
  family.port = personMetrics.topPort;

  // Step 1.5: Add ancestor expansion button if person has unexpanded ancestors
  if (person.unexpandedChildIn) {
    const expansionBox = renderer.measureButton();
    const ancestorButton = new Rectangle(
      '+',
      'ancestor-expansion-placeholder',
      expansionBox.width,
      expansionBox.height,
      null, // gender
      person.unexpandedChildIn, // store partnership ID for click handling
    );

    // Use position from person metrics
    ancestorButton.x = primaryRect.x + personMetrics.ancestorButtonX;
    ancestorButton.y = primaryRect.y + personMetrics.ancestorButtonY;

    family.addElement(ancestorButton);
  }

  // Step 2: Handle partnerships (stacked vertically for multiple partnerships)
  let leftParent = primaryRect;

  for (
    let familyIndex = 0;
    familyIndex < person.rightFamilyRIndices.length;
    familyIndex++
  ) {
    const renderFamily = renderTree.getFamily(
      person.rightFamilyRIndices[familyIndex],
    );

    // Always show families (expanded or not)
    // Find partner and create partner rectangle
    const partnerIndex = renderFamily.spouseRIndices.find(
      (idx) => idx !== personIndex,
    );
    const partner =
      partnerIndex !== undefined ? renderTree.getPerson(partnerIndex) : null;
    const partnerMetrics = partner
      ? renderer.personBoxMetrics(partner.name)
      : null;

    // Layout children recursively FIRST
    //
    // Overlap Prevention Strategy: Each child family is recursively laid out
    // as a complete, self-contained unit with its own dimensions. These child
    // families are then positioned sequentially left-to-right with spacing,
    // ensuring no overlap between sibling subtrees.
    const childFamilies = [];

    if (renderFamily.isExpanded) {
      // Layout actual children recursively
      for (const childIndex of renderFamily.childRIndices) {
        if (visitedPersons.has(childIndex)) {
          console.error(
            `WOULD CREATE CYCLE: Child ${childIndex} is already in visitedPersons`,
          );
          continue; // Skip this child to avoid cycle
        }

        const childFamily = layoutFamily(
          renderTree,
          childIndex,
          renderer,
          visitedPersons,
        ); // RECURSIVE
        childFamilies.push(childFamily);
      }
    }
    // Note: if unexpanded, childFamilies remains empty and expansion placeholder
    // will be added directly on the marriage line at the junction point

    // Calculate junction position using our algorithm
    const partnershipLineStart =
      leftParent.width + renderer.horizontalSpacerWidth;
    let partnershipLineJunction; // mid point of the partnership line
    if (childFamilies.length > 0) {
      // TODO: insert diagram to depict the two scenarios graphically
      const firstChild = childFamilies[0];
      partnershipLineJunction = Math.max(
        partnershipLineStart + renderer.horizontalMinimumLineLength,
        // Constraint: firstChild.port aligns with junction, so junction must be
        // at least continuityMinWidth + firstChild.port to ensure the child's
        // left edge doesn't overlap the continuity line reserved area
        renderer.horizontalContinuityMinWidth + firstChild.port,
      );
    } else {
      // TODO: insert diagram to depict the scenario graphically
      partnershipLineJunction =
        leftParent.width +
        renderer.horizontalSpacerWidth +
        renderer.horizontalMinimumLineLength;
    }

    // Create and position partnership line
    //
    // +---------+
    // | Parent1 | -----  <--
    // +---------+
    //
    // Line length calculation: The partnership line extends from partnershipLineStart
    // to the junction point, then continues symmetrically to position the partner.
    // Total length = 2 * (junction - start) creates a symmetric layout where:
    // - First half: start → junction (where children connect)
    // - Second half: junction → end (where partner connects with spacer)
    const partnershipLineLength =
      2 * (partnershipLineJunction - partnershipLineStart);
    const partnershipLine = new Line(partnershipLineLength, 'marriage-line');
    partnershipLine.x = partnershipLineStart;
    partnershipLine.y =
      leftParent.y + renderer.getPartnershipLineY(leftParent.height);
    family.addElement(partnershipLine);

    // Position partner (if present)
    //
    // +---------+       +---------+
    // | Parent1 | ----- | Parent2 | <--
    // +---------+       +---------+
    let rightParent = null;
    if (partner && partnerMetrics) {
      rightParent = new Rectangle(
        partner.name,
        'partner',
        partnerMetrics.width,
        partnerMetrics.height,
        partner.gender,
        partner.id,
      );
      rightParent.x =
        partnershipLineStart +
        partnershipLineLength +
        renderer.horizontalSpacerWidth;
      rightParent.y = leftParent.y;
      family.addElement(rightParent);
    }

    // Position children and create connecting lines
    if (childFamilies.length > 0) {
      // Position first child so its port aligns with junction (e.g., Child1 in the diagram)
      //
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 |
      // +---------+       +---------+
      //
      //           +---*---------------+ <--
      //           | Child1 and family |
      //           +-------------------+
      const firstChild = childFamilies[0];
      firstChild.x = partnershipLineJunction - firstChild.port;
      firstChild.y =
        leftParent.y + leftParent.height + renderer.horizontalVerticalSpacing;
      family.addElement(firstChild);

      // Position remaining children left-justified with spacing
      // Each child family has already been laid out recursively, so we just
      // position them sequentially using their complete width + childSpacing
      //
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 |
      // +---------+       +---------+
      //
      //           +---*---------------+  +--*--------+  +--*--------+ <--
      //           | Child1 and family |  | Child2... |  | Child3... |
      //           +-------------------+  +-----------+  +-----------+
      let currentChildX =
        firstChild.x + firstChild.width + renderer.horizontalChildSpacing;
      for (let i = 1; i < childFamilies.length; i++) {
        const child = childFamilies[i];
        child.x = currentChildX;
        child.y =
          leftParent.y + leftParent.height + renderer.horizontalVerticalSpacing;
        family.addElement(child);
        currentChildX += child.width + renderer.horizontalChildSpacing;
      }

      // Create parent-child line (vertical drop)
      //
      // +---------+       +---------+
      // | Parent1 | --+-- | Parent2 |
      // +---------+   |   +---------+
      //               | <--
      //           [children positioned below]
      const parentChildLineLength =
        childFamilies.length > 1
          ? firstChild.y - partnershipLine.y
          : firstChild.y - partnershipLine.y + 1; // Extend by 1 for single child to connect to box
      const parentChildLine = new Line(
        parentChildLineLength,
        'parent-child-line',
      );
      parentChildLine.x = partnershipLineJunction;
      parentChildLine.y = partnershipLine.y;
      family.addElement(parentChildLine);

      // Create sibling line (single horizontal line from first to last child)
      // +---------+       +---------+
      // | Parent1 | --+-- | Parent2 |
      // +---------+   |   +---------+
      //               |
      //               +─────────────── <-- single horizontal sibling line
      //               |     |     |
      //           [Child1] [Child2] [Child3]
      if (childFamilies.length > 1) {
        const siblingLineY =
          parentChildLine.y + renderer.getSiblingLineY(parentChildLine.height);

        // Create one continuous horizontal sibling line from first to last child
        const firstChildPort = firstChild.x + firstChild.port;
        const lastChild = childFamilies[childFamilies.length - 1];
        const lastChildPort = lastChild.x + lastChild.port;
        const siblingLine = new Line(
          lastChildPort - firstChildPort + 1,
          'sibling-line',
        );
        siblingLine.x = firstChildPort;
        siblingLine.y = siblingLineY;
        family.addElement(siblingLine);

        // Add vertical drop lines from sibling line to each child box (extended by 1)
        for (const child of childFamilies) {
          const childPort = child.x + child.port;
          const dropLineLength = child.y - siblingLineY + 1;
          const dropLine = new Line(dropLineLength, 'parent-child-line');
          dropLine.x = childPort;
          dropLine.y = siblingLineY;
          family.addElement(dropLine);
        }
      }
    }

    // Add expansion/collapse button at junction point after all lines are drawn
    // This ensures the button appears on top of any lines
    if (renderFamily.isExpanded && renderFamily.childRIndices.length > 0) {
      // Add collapse button for expanded partnerships with children
      const collapseBox = renderer.measureButton();
      const collapseButton = new Rectangle(
        '−',
        'collapse-button',
        collapseBox.width,
        collapseBox.height,
        null, // gender
        renderFamily.id, // Store partnership ID for click handling
      );
      // ⚠️ IMPORTANT: Always use renderer.getButtonPosition() instead of hardcoding math
      // Position calculations must be delegated to the renderer to handle coordinate systems properly
      const collapsePos = renderer.getButtonPosition(
        partnershipLineJunction,
        partnershipLine.y,
        collapseBox.width,
        collapseBox.height,
      );
      collapseButton.x = collapsePos.x;
      collapseButton.y = collapsePos.y;
      family.addElement(collapseButton);
    } else if (!renderFamily.isExpanded && renderFamily.hasChildren) {
      // Add expansion placeholder only for unexpanded partnerships that have children
      const expansionBox = renderer.measureButton();
      const expansionPlaceholder = new Rectangle(
        '+',
        'expansion-placeholder',
        expansionBox.width,
        expansionBox.height,
        null, // gender
        renderFamily.id, // Store partnership ID for click handling
      );
      // ⚠️ IMPORTANT: Always use renderer.getButtonPosition() instead of hardcoding math
      // Position calculations must be delegated to the renderer to handle coordinate systems properly
      const expansionPos = renderer.getButtonPosition(
        partnershipLineJunction,
        partnershipLine.y,
        expansionBox.width,
        expansionBox.height,
      );
      expansionPlaceholder.x = expansionPos.x;
      expansionPlaceholder.y = expansionPos.y;
      family.addElement(expansionPlaceholder);
    }
    // Note: if !renderFamily.isExpanded && !renderFamily.hasChildren, no button is shown
    // The partnership line appears without any expansion control

    // Add continuity line and shadow person if not the last family
    if (familyIndex < person.rightFamilyRIndices.length - 1) {
      // Calculate where the next partnership should start
      const nextY = family.height + renderer.horizontalVerticalSpacing;

      // Create continuity line from current leftParent to next position
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 |
      // +---------+       +---------+
      //  :: <--
      //  :: (extends down past children if any)
      //  ::
      const continuityLineLength =
        nextY - (leftParent.y + leftParent.height) + 2;
      const continuityLine = new Line(continuityLineLength, 'continuity-line');
      continuityLine.x = renderer.horizontalContinuityOffset;
      continuityLine.y = leftParent.y + leftParent.height - 1;
      family.addElement(continuityLine);

      // Create shadow person rectangle for next partnership
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 |
      // +---------+       +---------+
      //  ::
      //  :: (extends down past children if any)
      //  ::
      // +---------+ <--
      // | Parent1 | (ready for next partnership)
      // +---------+
      leftParent = new Rectangle(
        person.name,
        'repeated-person',
        personMetrics.width,
        personMetrics.height,
        person.gender,
        person.id,
      );
      leftParent.x = 0;
      leftParent.y = nextY;
      family.addElement(leftParent);
    }
  }

  // Remove from visited set when done processing this person
  visitedPersons.delete(personIndex);

  return family;
}

/**
 * Layout a single person and their immediate family using vertical layout.
 *
 * Phase 1: Single person only (no partnerships, children, or ancestors)
 *
 * @param {RenderTree} renderTree - The render tree data structure
 * @param {number} personIndex - Index of person to layout
 * @param {TextRenderer} renderer - Text renderer with measurement capabilities
 * @returns {Family} Complete family layout with positioned elements
 */
export function layoutFamilyVertical(
  renderTree,
  personIndex,
  renderer,
  visitedPersons = new Set(),
) {
  // Prevent infinite recursion by tracking visited persons
  if (visitedPersons.has(personIndex)) {
    console.error(
      `Circular reference detected: person ${personIndex} already being laid out`,
    );
    console.error('Visit chain:', Array.from(visitedPersons));
    throw new Error(
      `Circular reference detected in family tree: person ${personIndex}`,
    );
  }

  visitedPersons.add(personIndex);

  const person = renderTree.getPerson(personIndex);
  const family = new Family();

  // Phase 1: Create primary person rectangle at origin (same as horizontal)
  const personMetrics = renderer.personBoxMetrics(person.name);
  const primaryRect = new Rectangle(
    person.name,
    'primary-person',
    personMetrics.width,
    personMetrics.height,
    person.gender,
    person.id,
  );
  family.addElement(primaryRect);

  // For vertical layout, port calculation will be different in future phases
  // For now, use topPort since there are no connections
  family.port = personMetrics.topPort;

  return family;
}
