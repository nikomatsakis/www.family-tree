/**
 * Family Layout Algorithm
 * =======================
 *
 * Implements vertical family tree layout using the box-based coordinate algorithm.
 * See architecture/visual_design.md for design principles.
 *
 * Family Port Concept:
 * Each Family has a "port" - the connection point where a parent-child line from above
 * should attach. The port is always:
 * - Located on the left edge of the family's bounding box
 * - Vertically aligned with the center of the focus person's rectangle
 * - Used when this family is positioned as a child to align with parent junction lines
 *
 * This ensures clean T-junction connections when families are nested recursively.
 */

import { Family, Rectangle, Line } from './layout-elements.js';

/**
 * Layout a single person and their immediate family using vertical layout.
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
 * - verticalSpacerWidth: number - Gap between person box and marriage line
 * - verticalContinuityOffset: number - X offset from person where continuity line is placed
 * - verticalChildIndent: number - X indentation for child positioning
 * - verticalChildOffset: number - Additional X offset for child boxes
 * - verticalMinimumLineLength: number - Minimum length for marriage line segments
 * - verticalSiblingSpacing: number - Vertical gap between sibling children
 *
 * Methods:
 * - personBoxMetrics(text: string) → {width: number, height: number, leftPort: number} - Measure person box
 * - measureButton() → {width: number, height: number} - Measure expansion button
 * - getPartnershipLineY(personHeight: number) → number - Y offset for marriage line
 * - getButtonPosition(junctionX: number, lineY: number, buttonWidth: number, buttonHeight: number) → {x: number, y: number}
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

  // Create primary person rectangle at origin
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

  // Add ancestor expansion button if person has unexpanded ancestors
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

  // Handle multiple partnerships with continuity lines
  let leftParent = primaryRect;
  for (
    let familyIndex = 0;
    familyIndex < person.rightFamilyRIndices.length;
    familyIndex++
  ) {
    const renderFamily = renderTree.getFamily(
      person.rightFamilyRIndices[familyIndex],
    );

    // Find partner
    const partnerIndex = renderFamily.spouseRIndices.find(
      (idx) => idx !== personIndex,
    );
    const partner =
      partnerIndex !== undefined ? renderTree.getPerson(partnerIndex) : null;
    const partnerMetrics = partner
      ? renderer.personBoxMetrics(partner.name)
      : null;

    // Layout children recursively
    const childFamilies = [];
    if (renderFamily.isExpanded && renderFamily.childRIndices.length > 0) {
      // Layout all children recursively
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
        );
        childFamilies.push(childFamily);
      }
    }

    // Calculate junction position with spacing for text compatibility
    // Add 1 character spacing before and after the marriage line for text rendering
    const partnershipLineStart = leftParent.x + leftParent.width + 1;
    const partnershipLineJunction =
      partnershipLineStart + renderer.verticalMinimumLineLength;
    const partnershipLineLength =
      2 * (partnershipLineJunction - partnershipLineStart);
    const totalPartnershipWidth = partnershipLineLength + 2; // Line + spaces

    // Position partnership line and partner (show partnerships always)
    // For childless partnerships: simple marriage line
    // For partnerships with children: marriage line with expansion button
    // For single parents: full line with "?" unknown partner box
    let partnershipLine = null;
    if (partner && partnerMetrics) {
      // Real partnership - always show the partnership line and partner
      partnershipLine = new Line(partnershipLineLength, 'marriage-line');
      partnershipLine.x = partnershipLineStart;
      partnershipLine.y =
        leftParent.y + renderer.getPartnershipLineY(leftParent.height);
      family.addElement(partnershipLine);

      // Position real partner
      const rightParent = new Rectangle(
        partner.name,
        'partner',
        partnerMetrics.width,
        partnerMetrics.height,
        partner.gender,
        partner.id,
      );
      rightParent.x = leftParent.x + leftParent.width + totalPartnershipWidth;
      rightParent.y = leftParent.y;
      family.addElement(rightParent);
    } else if (renderFamily.hasChildren) {
      // Single parent with children - show unknown partner placeholder
      partnershipLine = new Line(partnershipLineLength, 'marriage-line');
      partnershipLine.x = partnershipLineStart;
      partnershipLine.y =
        leftParent.y + renderer.getPartnershipLineY(leftParent.height);
      family.addElement(partnershipLine);

      // Unknown partner placeholder
      const unknownPartnerMetrics = renderer.personBoxMetrics('?');
      const unknownPartner = new Rectangle(
        '?',
        'unknown-partner',
        unknownPartnerMetrics.width,
        unknownPartnerMetrics.height,
        null, // gender
        null, // id
      );
      unknownPartner.x =
        leftParent.x + leftParent.width + totalPartnershipWidth;
      unknownPartner.y = leftParent.y;
      family.addElement(unknownPartner);
    }

    // Position children if expanded (multiple children stacking)
    // This must run for both partnered families AND single parent families
    if (childFamilies.length > 0) {
      // Calculate child positioning using renderer constants
      // Continuity line is at offset, children line needs equal gap to children
      const childrenLineX =
        leftParent.x +
        renderer.verticalContinuityOffset +
        renderer.verticalChildIndent;
      // Child box starts after the junction characters (└─)
      const childX = childrenLineX + renderer.verticalChildOffset;

      // Create vertical drop line from junction to jog point
      //
      // Expected vertical layout pattern:
      // │Dad Test│ ──[−]─ │Mom Test│  <- marriage line (Y=1)
      // └────────┘    │   └────────┘  <- parent bottom + junction drop (Y=2)
      //     ┌─────────┘                <- horizontal jog (Y=3)
      //     │ ┌─────────┐              <- vertical line + child (Y=4)
      //     ├─┤Child One│              <- continuing child junction
      //     │ └─────────┘
      //     │ ┌─────────┐              <- next child (Y=6)
      //     └─┤Child Two│              <- last child junction
      //       └─────────┘
      //
      // Start below the marriage line (if present) or parent box (single parent)
      const jogY = partnershipLine.y + 2 * renderer.verticalSpacerWidth;

      // Position all children vertically with proper spacing
      let currentChildY = jogY + renderer.verticalSpacerWidth;

      for (let i = 0; i < childFamilies.length; i++) {
        const child = childFamilies[i];

        // Position child
        child.x = childX;
        child.y = currentChildY;
        family.addElement(child);

        // Create horizontal connection to child (├─ or └─)
        // For vertical layout, use child family's port (which is set to leftPort)
        const childHorizontalY = child.y + child.port;
        const childHorizontalLength = child.x - childrenLineX + 1;
        const childHorizontalLine = new Line(
          childHorizontalLength,
          'sibling-line',
        );
        childHorizontalLine.x = childrenLineX;
        childHorizontalLine.y = childHorizontalY;
        family.addElement(childHorizontalLine);

        // Update Y position for next child (add spacing for visual separation)
        currentChildY += child.height + renderer.verticalSiblingSpacing;
      }

      // Calculate total height needed for all children
      const lastChild = childFamilies[childFamilies.length - 1];
      const lastChildConnectionY = lastChild.y + lastChild.port;

      // Create initial drop line from junction
      const dropLineLength = jogY - partnershipLine.y + 1;
      const dropLine = new Line(dropLineLength, 'parent-child-line');
      dropLine.x = partnershipLineJunction;
      dropLine.y = partnershipLine.y;
      family.addElement(dropLine);

      // Create horizontal jog line
      const jogLineLength = partnershipLineJunction - childrenLineX + 1;
      const jogLine = new Line(jogLineLength, 'sibling-line');
      jogLine.x = childrenLineX;
      jogLine.y = jogY;
      family.addElement(jogLine);

      // Create vertical spine connecting all children
      const spineLength = lastChildConnectionY - jogY + 1;
      const spine = new Line(spineLength, 'parent-child-line');
      spine.x = childrenLineX;
      spine.y = jogY;
      family.addElement(spine);
    }

    // Add expansion button LAST so it renders on top of lines
    // This must run for both partnered families AND single parent families
    //
    // SUBTLE DISTINCTION: renderFamily.hasChildren vs childFamilies.length > 0
    // - renderFamily.hasChildren: TRUE if children exist in the genea data (whether expanded or not)
    // - childFamilies.length > 0: TRUE if children are currently loaded/expanded in this render
    //
    // Button logic:
    // - Show [+] if hasChildren=true but childFamilies.length=0 (children exist but collapsed)
    // - Show [−] if hasChildren=true and childFamilies.length>0 (children exist and expanded)
    // - Show nothing if hasChildren=false (no children in data)
    if (renderFamily.hasChildren && partnershipLine) {
      const expansionBox = renderer.measureButton();
      const buttonType = renderFamily.isExpanded
        ? 'collapse-button'
        : 'expansion-placeholder';
      const buttonChar = renderFamily.isExpanded ? '−' : '+';

      const button = new Rectangle(
        buttonChar,
        buttonType,
        expansionBox.width,
        expansionBox.height,
        null, // gender
        renderFamily.id, // Store partnership ID for click handling
      );

      // Partnership line exists for families with children
      const buttonLineY = partnershipLine.y;

      const buttonPos = renderer.getButtonPosition(
        partnershipLineJunction,
        buttonLineY,
        expansionBox.width,
        expansionBox.height,
      );
      button.x = buttonPos.x;
      button.y = buttonPos.y;
      family.addElement(button);
    }

    // Add continuity line and shadow person if not the last family
    if (familyIndex < person.rightFamilyRIndices.length - 1) {
      // Calculate where the next partnership should start
      const nextY = family.height + renderer.verticalSpacerWidth;

      // Create continuity line from current leftParent to next position
      // ┌─────────┐        ┌────────────┐
      // │John Smith│ ──[−]─ │Mary Johnson│
      // └╥────────┘    │   └────────────┘
      //  ║ <-- continuity line extends down
      //  ║
      //  ║
      // ┌╨────────┐        ┌──────────────┐
      // │John Smith│ ──[−]─ │Susan Williams│
      // └─────────┘        └──────────────┘
      const continuityLineLength =
        nextY - (leftParent.y + leftParent.height) + 2;
      const continuityLine = new Line(continuityLineLength, 'continuity-line');
      continuityLine.x = renderer.verticalContinuityOffset;
      continuityLine.y = leftParent.y + leftParent.height - 1;
      family.addElement(continuityLine);

      // Create shadow person rectangle for next partnership
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

  // For vertical layout, use leftPort for child connections
  family.port = personMetrics.leftPort;

  // Remove from visited set when done processing this person
  visitedPersons.delete(personIndex);

  return family;
}
