/**
 * RenderTree Data Structures
 * =========================
 * These represent the family tree in a form optimized for rendering,
 * separate from the original genea data structures.
 *
 * Uses integer indices to reference persons and partnerships for
 * performance and easy serialization/debugging.
 *
 * DESIGN PRINCIPLES:
 * - Index-based references enable efficient lookups and debugging
 * - Partnership types handle different visual elements (T-junctions, navigation, placeholders)
 * - Structure maps directly to visual design requirements from architecture/visual_design.md
 *
 * KEY VISUAL MAPPINGS:
 * - RegularPartnership with parents + children = T-junction marriage display
 * - Multiple parentIn partnerships = repeated person with continuity connectors
 * - UnexpandedAncestorPartnership = "more ancestors above" placeholder
 * - AlternateLineagePartnership = "(show [person]'s family)" navigation buttons
 * - Primary lineage control prevents exponential ancestor explosion (2^n problem)
 */

/**
 * Base class for all partnership types in the render tree
 */
export class Partnership {
  constructor(id) {
    this.id = id;
  }
}

/**
 * Regular partnership with parents and optionally children
 *
 * VISUAL MAPPING: Creates T-junction display
 * Parent1 ──┬── Parent2
 *           |
 *       ┌───┴───┐
 *    Child1   Child2
 *
 * IMPORTANT: Partnership expansion states:
 * - children: null = Partnership exists but hasn't been expanded yet (no children loaded)
 * - children: [] = Partnership has been expanded but has no children (childless couple)
 * - children: [1, 2, ...] = Partnership has been expanded and has children
 *
 * The distinction between null and [] is critical:
 * - null means "we haven't looked at the children yet" (collapsed state)
 * - [] means "we looked and there are no children" (expanded childless state)
 */
export class RegularPartnership extends Partnership {
  constructor(id, parents, children = null) {
    super(id);
    this.type = 'regular';
    this.parents = parents; // number[] - indices into persons array
    this.children = children; // number[] | null - indices, null if not expanded, [] if expanded but childless
  }

  get isExpanded() {
    return this.children !== null;
  }
}

/**
 * Placeholder for unexpanded ancestors at top of primary lineage
 *
 * VISUAL MAPPING: Shows "(show ancestors)" at top of tree
 * Prevents exponential growth by limiting to one ancestral path
 */
export class UnexpandedAncestorPartnership extends Partnership {
  constructor(id, from) {
    super(id);
    this.type = 'unexpanded-ancestor';
    this.from = from; // number - index of person at top of current lineage
  }
}

/**
 * Placeholder for alternate lineage (e.g., Amanda's family)
 *
 * VISUAL MAPPING: Creates "(show Amanda's family)" navigation buttons
 * Enables switching family tree perspective at marriage points
 */
export class AlternateLineagePartnership extends Partnership {
  constructor(id, person, fromPartnership) {
    super(id);
    this.type = 'alternate-lineage';
    this.person = person; // number - index of person who could become primary
    this.fromPartnership = fromPartnership; // number - index of original partnership
  }
}

/**
 * Person in the render tree
 *
 * VISUAL MAPPING: Multiple parentIn partnerships = repeated person display
 * Person ──┬── Spouse1     ← First occurrence (full styling)
 *    :     |
 *    :   Child1
 *    :
 * Person ──┬── Spouse2     ← Repeated occurrence (light grey + continuity line)
 *    :     |
 *    :   Child2
 */
export class RenderPerson {
  constructor(id, name, childIn = null, parentIn = []) {
    this.id = id; // string - original person ID for reference
    this.name = name;
    this.childIn = childIn; // number | null - partnership index
    this.parentIn = parentIn; // number[] - partnership indices
  }
}

/**
 * Complete render tree structure
 */
export class RenderTree {
  constructor(focusPersonIndex) {
    this.persons = []; // RenderPerson[]
    this.partnerships = []; // Partnership[]
    this.focusPersonIndex = focusPersonIndex; // number - index of focus person
  }

  /**
   * Add a person to the tree and return their index
   */
  addPerson(person) {
    const index = this.persons.length;
    this.persons.push(person);
    return index;
  }

  /**
   * Add a partnership to the tree and return their index
   */
  addPartnership(partnership) {
    const index = this.partnerships.length;
    this.partnerships.push(partnership);
    return index;
  }

  /**
   * Get person by index
   */
  getPerson(index) {
    return this.persons[index];
  }

  /**
   * Get partnership by index
   */
  getPartnership(index) {
    return this.partnerships[index];
  }

  /**
   * Get the focus person
   */
  getFocusPerson() {
    return this.persons[this.focusPersonIndex];
  }

  /**
   * Get partnerships by type
   */
  getPartnershipsByType(type) {
    return this.partnerships
      .map((p, index) => ({ partnership: p, index }))
      .filter(({ partnership }) => partnership.type === type);
  }

  /**
   * Find person index by original ID
   */
  findPersonByOriginalId(originalId) {
    return this.persons.findIndex((p) => p.id === originalId);
  }

  /**
   * Debug representation that's easily serializable
   */
  toDebugObject() {
    return {
      focusPersonIndex: this.focusPersonIndex,
      focusPersonName: this.getFocusPerson()?.name,
      persons: this.persons.map((person, index) => ({
        index,
        ...person,
      })),
      partnerships: this.partnerships.map((partnership, index) => ({
        index,
        ...partnership,
      })),
      stats: {
        personCount: this.persons.length,
        partnershipCount: this.partnerships.length,
        expandedPartnerships: this.partnerships.filter(
          (p) => p.type === 'regular' && p.isExpanded,
        ).length,
      },
    };
  }
}
