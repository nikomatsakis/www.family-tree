/**
 * RenderTreeBuilder
 * =================
 * Builds RenderTree structures from genea data with controlled inclusion logic.
 *
 * INVARIANTS:
 * 1. When adding someone from primary lineage, always add their marriages
 *    (but not necessarily children of those marriages)
 * 2. Each genea person/partnership added only once (tracked via maps)
 * 3. Primary lineage persons get full marriage expansion
 */

import { RenderTree, RenderPerson, RenderPartnership } from './render-tree.js';

export class RenderTreeBuilder {
  constructor(geneaService) {
    this.geneaService = geneaService;

    // Building state
    this.renderTree = new RenderTree(null); // focusPersonIndex set later

    // Maps from genea objects to render tree indices (prevent duplicates)
    this.personMap = new Map(); // geneaPerson -> renderTreeIndex
    this.partnershipMap = new Map(); // geneaPartnership -> renderTreeIndex

    // Track which people are in the primary lineage vs partners
    this.primaryLineagePersons = new Set(); // renderTreeIndices
  }

  /**
   * Add a person from the primary lineage
   * - Adds the person to render tree
   * - Adds all their marriages (unexpanded initially)
   * - Returns render tree index
   */
  addPrimaryPerson(geneaPerson) {
    // Check if already added
    if (this.personMap.has(geneaPerson)) {
      return this.personMap.get(geneaPerson);
    }

    const renderPerson = new RenderPerson(
      geneaPerson.id,
      geneaPerson.name,
      geneaPerson.gender,
      geneaPerson.comments,
    );
    const renderIndex = this.renderTree.addPerson(renderPerson);

    this.personMap.set(geneaPerson, renderIndex);
    this.primaryLineagePersons.add(renderIndex);

    // Add all marriages for primary lineage person
    for (const geneaPartnership of geneaPerson.parentIn) {
      this.addPartnership(geneaPerson, geneaPartnership);
    }

    return renderIndex;
  }

  /**
   * Add a partner person (not in primary lineage)
   * - Adds the person to render tree
   * - Adds alternate lineage placeholder if they have ancestors
   * - Returns render tree index
   */
  addPartnerPerson(geneaPerson) {
    // Check if already added
    if (this.personMap.has(geneaPerson)) {
      return this.personMap.get(geneaPerson);
    }

    const renderPerson = new RenderPerson(geneaPerson.id, geneaPerson.name);
    const renderIndex = this.renderTree.addPerson(renderPerson);

    this.personMap.set(geneaPerson, renderIndex);

    // TODO: Handle tracking parent partnerships for partner persons

    return renderIndex;
  }

  /**
   * Add a partnership between primary person and partner
   * - Finds/adds the partner person
   * - Creates RegularPartnership (unexpanded initially)
   * - Updates person.parentIn arrays
   * - Returns partnership index
   */
  addPartnership(primaryPerson, geneaPartnership) {
    // Check if already added
    if (this.partnershipMap.has(geneaPartnership)) {
      return this.partnershipMap.get(geneaPartnership);
    }

    const primaryPersonIndex = this.personMap.get(primaryPerson);

    // Add partner person (the other person in this partnership)
    const partnerPerson = geneaPartnership.partnerTo(primaryPerson);
    const partnerPersonIndex = partnerPerson
      ? this.addPartnerPerson(partnerPerson)
      : null;

    // Create partnership
    const parents = partnerPersonIndex
      ? [primaryPersonIndex, partnerPersonIndex]
      : [primaryPersonIndex];

    const renderPartnership = new RenderPartnership(
      geneaPartnership.id,
      parents,
      null, // children unexpanded initially
    );

    const partnershipIndex = this.renderTree.addPartnership(renderPartnership);
    this.partnershipMap.set(geneaPartnership, partnershipIndex);

    // Update parentIn arrays
    this.renderTree
      .getPerson(primaryPersonIndex)
      .parentIn.push(partnershipIndex);
    if (partnerPersonIndex) {
      this.renderTree
        .getPerson(partnerPersonIndex)
        .parentIn.push(partnershipIndex);
    }

    return partnershipIndex;
  }

  /**
   * Expand a partnership to include its children
   * - Adds children to the partnership
   * - Recursively adds child persons to render tree
   * - Updates child.childIn references
   */
  expandPartnership(geneaPartnership) {
    const partnershipIndex = this.partnershipMap.get(geneaPartnership);
    if (partnershipIndex === undefined) {
      throw new Error(
        `Partnership ${geneaPartnership.id} not found in render tree`,
      );
    }

    const renderPartnership = this.renderTree.getPartnership(partnershipIndex);
    if (renderPartnership.type !== 'regular') {
      throw new Error(
        `Cannot expand non-regular partnership ${geneaPartnership.id}`,
      );
    }

    if (renderPartnership.isExpanded) {
      return; // Already expanded
    }

    const childIndices = [];

    for (const geneaChild of geneaPartnership.children) {
      let childIndex;

      if (this.personMap.has(geneaChild)) {
        // Child already exists in tree
        childIndex = this.personMap.get(geneaChild);
      } else {
        // Add new child (determine if primary lineage or not)
        // TODO: This needs logic to determine primary vs partner status
        const renderPerson = new RenderPerson(geneaChild.id, geneaChild.name);
        childIndex = this.renderTree.addPerson(renderPerson);
        this.personMap.set(geneaChild, childIndex);
      }

      // Set child's parent partnership
      this.renderTree.getPerson(childIndex).childIn = partnershipIndex;
      childIndices.push(childIndex);
    }

    // Update partnership with children
    renderPartnership.children = childIndices;
  }

  /**
   * Set the focus person index after building
   */
  setFocusPerson(geneaPerson) {
    const focusIndex = this.personMap.get(geneaPerson);
    if (focusIndex === undefined) {
      throw new Error(
        `Focus person ${geneaPerson.id} not found in render tree`,
      );
    }
    this.renderTree.focusPersonIndex = focusIndex;
  }

  /**
   * Return the completed RenderTree
   */
  build() {
    return this.renderTree;
  }

  /**
   * Debug helper - show current builder state
   */
  getDebugState() {
    return {
      personMap: Object.fromEntries(this.personMap),
      partnershipMap: Object.fromEntries(this.partnershipMap),
      primaryLineagePersons: Array.from(this.primaryLineagePersons),
      renderTree: this.renderTree.toDebugObject(),
    };
  }
}

/**
 * Create a default render tree focused on a specific person
 *
 * MINIMAL DEFAULT ALGORITHM:
 * 1. Add focus person as primary lineage
 * 2. Add their parents (if they have any)
 * 3. Expand focus person's marriages to show their children
 *
 * This creates a simple 3-generation view: parents -> focus -> children.
 */
export function createDefaultRenderTree(geneaService, focusPerson) {
  const builder = new RenderTreeBuilder(geneaService);

  // Add focus person and their marriages
  builder.addPrimaryPerson(focusPerson);

  // Add parents if they exist
  if (focusPerson.childIn) {
    const parentPartnership = focusPerson.childIn;
    const primaryParent = parentPartnership.firstParent;
    if (primaryParent) {
      builder.addPrimaryPerson(primaryParent);
      // Expand the parent partnership to include focus person as child
      builder.expandPartnership(parentPartnership);
    }
  }

  // Expand focus person's marriages to show their children
  for (const partnership of focusPerson.parentIn) {
    builder.expandPartnership(partnership);
  }

  // Set focus and return
  builder.setFocusPerson(focusPerson);
  return builder.build();
}
