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
 */
export function layoutFamily(renderTree, personIndex, renderer) {
  const person = renderTree.getPerson(personIndex);
  const family = new Family();

  // Step 1: Create primary person rectangle at origin
  //
  // +----------+
  // | Parent1  | <--
  // +----------+
  const personBox = renderer.measureBox(person.name);
  const primaryRect = new Rectangle(
    person.name,
    'primary-person',
    personBox.width,
    personBox.height,
  );
  family.addElement(primaryRect);
  family.port = renderer.getPortPosition(personBox.width);

  // Step 2: Handle partnerships (stacked vertically for multiple partnerships)
  let leftParent = primaryRect;

  for (
    let partnershipIndex = 0;
    partnershipIndex < person.parentIn.length;
    partnershipIndex++
  ) {
    const partnership = renderTree.getPartnership(
      person.parentIn[partnershipIndex],
    );

    if (partnership.isExpanded) {
      // Find partner and create partner rectangle
      const partnerIndex = partnership.parents.find(
        (idx) => idx !== personIndex,
      );
      const partner = renderTree.getPerson(partnerIndex);
      const partnerBox = renderer.measureBox(partner.name);

      // Layout children recursively FIRST
      //
      // Overlap Prevention Strategy: Each child family is recursively laid out
      // as a complete, self-contained unit with its own dimensions. These child
      // families are then positioned sequentially left-to-right with spacing,
      // ensuring no overlap between sibling subtrees.
      const childFamilies = [];

      if (partnership.isExpanded) {
        // Layout actual children recursively
        for (const childIndex of partnership.children) {
          const childFamily = layoutFamily(renderTree, childIndex, renderer); // RECURSIVE
          childFamilies.push(childFamily);
        }
      } else {
        // Create expansion placeholder for unexpanded partnership
        const expansionBox = renderer.measureBox('...');
        const expansionPlaceholder = new Rectangle(
          '...',
          'expansion-placeholder',
          expansionBox.width,
          expansionBox.height,
        );
        const placeholderFamily = new Family();
        placeholderFamily.addElement(expansionPlaceholder);
        placeholderFamily.port = renderer.getPortPosition(expansionBox.width);
        childFamilies.push(placeholderFamily);
      }

      // Calculate junction position using our algorithm
      const partnershipLineStart = leftParent.width + renderer.spacerWidth;
      let partnershipLineJunction; // mid point of the partnership line
      if (childFamilies.length > 0) {
        // TODO: insert diagram to depict the two scenarios graphically
        const firstChild = childFamilies[0];
        partnershipLineJunction = Math.max(
          partnershipLineStart + renderer.minimumLineLength,
          // Constraint: firstChild.port aligns with junction, so junction must be
          // at least continuityMinWidth + firstChild.port to ensure the child's
          // left edge doesn't overlap the continuity line reserved area
          renderer.continuityMinWidth + firstChild.port,
        );
      } else {
        // TODO: insert diagram to depict the scenario graphically
        partnershipLineJunction =
          leftParent.width + renderer.spacerWidth + renderer.minimumLineLength;
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

      // Position partner
      //
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 | <--
      // +---------+       +---------+
      const rightParent = new Rectangle(
        partner.name,
        'partner',
        partnerBox.width,
        partnerBox.height,
      );
      rightParent.x =
        partnershipLineStart + partnershipLineLength + renderer.spacerWidth;
      rightParent.y = leftParent.y;
      family.addElement(rightParent);

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
          leftParent.y + leftParent.height + renderer.verticalSpacing;
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
          firstChild.x + firstChild.width + renderer.childSpacing;
        for (let i = 1; i < childFamilies.length; i++) {
          const child = childFamilies[i];
          child.x = currentChildX;
          child.y = leftParent.y + leftParent.height + renderer.verticalSpacing;
          family.addElement(child);
          currentChildX += child.width + renderer.childSpacing;
        }

        // Create parent-child line (vertical drop)
        //
        // +---------+       +---------+
        // | Parent1 | --+-- | Parent2 |
        // +---------+   |   +---------+
        //               | <--
        //           [children positioned below]
        const parentChildLine = new Line(
          firstChild.y - partnershipLine.y,
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
            parentChildLine.y +
            renderer.getSiblingLineY(parentChildLine.height);

          // Create one continuous horizontal sibling line from first to last child
          const firstChildPort = firstChild.x + firstChild.port;
          const lastChild = childFamilies[childFamilies.length - 1];
          const lastChildPort = lastChild.x + lastChild.port;
          const siblingLine = new Line(
            lastChildPort - firstChildPort,
            'sibling-line',
          );
          siblingLine.x = firstChildPort;
          siblingLine.y = siblingLineY;
          family.addElement(siblingLine);

          // Note: Vertical drop lines from sibling line to individual child ports are not drawn
          // The current design uses a continuous horizontal sibling line without individual drops
        }
      }
    }

    // Add continuity line and shadow person if not the last partnership
    if (partnershipIndex < person.parentIn.length - 1) {
      // Calculate where the next partnership should start
      const nextY = family.height + renderer.verticalSpacing;

      // Create continuity line from current leftParent to next position
      // +---------+       +---------+
      // | Parent1 | ----- | Parent2 |
      // +---------+       +---------+
      //  :: <--
      //  :: (extends down past children if any)
      //  ::
      const continuityLineLength = nextY - (leftParent.y + leftParent.height);
      const continuityLine = new Line(continuityLineLength, 'continuity-line');
      continuityLine.x = renderer.continuityOffset;
      continuityLine.y = leftParent.y + leftParent.height;
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
        personBox.width,
        personBox.height,
      );
      leftParent.x = 0;
      leftParent.y = nextY;
      family.addElement(leftParent);
    }
  }

  return family;
}
