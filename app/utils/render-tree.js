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
  constructor(id, parents, children = null, hasChildren = false) {
    super(id);
    this.type = 'regular';
    this.parents = parents; // number[] - indices into persons array
    this.children = children; // number[] | null - indices, null if not expanded, [] if expanded but childless
    this.hasChildren = hasChildren; // boolean - whether the original partnership has any children in the genea data
  }

  get isExpanded() {
    return this.children !== null;
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
  constructor(
    id,
    name,
    gender = null,
    comments = null,
    childIn = null,
    parentIn = [],
  ) {
    this.id = id; // string - original person ID for reference
    this.name = name;
    this.gender = gender; // string - gender for color coding (male, female, unknown, etc.)
    this.comments = comments; // string - additional person information
    this.childIn = childIn; // number | null - index of partnership where THIS person is a child (i.e., their parents' partnership)
    this.parentIn = parentIn; // number[] - indices of partnerships where THIS person is a parent/spouse (i.e., partnerships with their spouses)
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
    this.rootNodes = []; // number[] - indices of root persons (no parents, not partnered with someone who has parents)
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
   * Compute and update the root nodes for this tree
   * Root nodes are persons with no parents who are not partnered with someone who has parents
   */
  computeRootNodes() {
    // Find persons with no parents (childIn === null)
    const rootCandidates = this.persons
      .map((person, index) => ({ person, index }))
      .filter(({ person }) => person.childIn === null);

    // Filter out people who are partnered with someone who has parents
    this.rootNodes = rootCandidates
      .filter(({ person, index }) => {
        // Check if this person is partnered with someone who has parents
        for (const partnershipIndex of person.parentIn) {
          const partnership = this.getPartnership(partnershipIndex);
          const partners = partnership.parents.filter((p) => p !== index);
          for (const partnerIndex of partners) {
            const partner = this.getPerson(partnerIndex);
            if (partner.childIn !== null) {
              return false; // This person is partnered with someone who has parents
            }
          }
        }
        return true;
      })
      .map(({ index }) => index);
  }

  /**
   * Debug representation that's easily serializable
   */
  toDebugObject() {
    return {
      focusPersonIndex: this.focusPersonIndex,
      focusPersonName: this.getFocusPerson()?.name,
      rootNodes: this.rootNodes,
      rootNodeNames: this.rootNodes.map((idx) => this.getPerson(idx).name),
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
        rootNodeCount: this.rootNodes.length,
      },
    };
  }
}
