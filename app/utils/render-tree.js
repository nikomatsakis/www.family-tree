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
 * Family in the render tree with spouses and optionally children
 *
 * VISUAL MAPPING: Creates T-junction display
 * Spouse1 ──┬── Spouse2
 *           |
 *       ┌───┴───┐
 *    Child1   Child2
 *
 * IMPORTANT: Family expansion states:
 * - childRIndices: null = Family exists but hasn't been expanded yet (no children loaded)
 * - childRIndices: [] = Family has been expanded but has no children (childless couple)
 * - childRIndices: [1, 2, ...] = Family has been expanded and has children
 *
 * The distinction between null and [] is critical:
 * - null means "we haven't looked at the children yet" (collapsed state)
 * - [] means "we looked and there are no children" (expanded childless state)
 */
export class RenderFamily extends Partnership {
  constructor(id, spouseRIndices, childRIndices = null, hasChildren = false) {
    super(id);
    this.type = 'regular';
    this.spouseRIndices = spouseRIndices; // number[] - indices into persons array
    this.childRIndices = childRIndices; // number[] | null - indices, null if not expanded, [] if expanded but childless
    this.hasChildren = hasChildren; // boolean - whether the original family has any children in the genea data
  }

  get isExpanded() {
    return this.childRIndices !== null;
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
    upFamilyRIndex = null,
    rightFamilyRIndices = [],
    unexpandedChildIn = null,
  ) {
    this.id = id; // string - original person ID for reference
    this.name = name;
    this.gender = gender; // string - gender for color coding (male, female, unknown, etc.)
    this.comments = comments; // string - additional person information
    this.upFamilyRIndex = upFamilyRIndex; // number | null - index of family where THIS person is a child (i.e., their parents' family)
    this.rightFamilyRIndices = rightFamilyRIndices; // number[] - indices of families where THIS person is a spouse (i.e., families with their spouses)
    this.unexpandedChildIn = unexpandedChildIn; // string | null - partnership ID of unexpanded parent family (for ancestor expansion buttons)
  }
}

/**
 * Complete render tree structure
 */
export class RenderTree {
  constructor(focusPersonIndex) {
    this.persons = []; // RenderPerson[]
    this.families = []; // RenderFamily[]
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
   * Add a family to the tree and return their index
   */
  addFamily(family) {
    const index = this.families.length;
    this.families.push(family);
    return index;
  }

  /**
   * Get person by index
   */
  getPerson(index) {
    return this.persons[index];
  }

  /**
   * Get family by index
   */
  getFamily(index) {
    return this.families[index];
  }

  /**
   * Get the focus person
   */
  getFocusPerson() {
    return this.persons[this.focusPersonIndex];
  }

  /**
   * Get families by type
   */
  getFamiliesByType(type) {
    return this.families
      .map((f, index) => ({ family: f, index }))
      .filter(({ family }) => family.type === type);
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
    // Find persons with no parents (upFamilyRIndex === null)
    const rootCandidates = this.persons
      .map((person, index) => ({ person, index }))
      .filter(({ person }) => person.upFamilyRIndex === null);

    // Filter out people who are partnered with someone who has parents
    this.rootNodes = rootCandidates
      .filter(({ person, index }) => {
        // Check if this person is partnered with someone who has parents
        for (const familyIndex of person.rightFamilyRIndices) {
          const family = this.getFamily(familyIndex);
          const spouses = family.spouseRIndices.filter((p) => p !== index);
          for (const spouseIndex of spouses) {
            const spouse = this.getPerson(spouseIndex);
            if (spouse.upFamilyRIndex !== null) {
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
      families: this.families.map((family, index) => ({
        index,
        ...family,
      })),
      stats: {
        personCount: this.persons.length,
        familyCount: this.families.length,
        expandedFamilies: this.families.filter(
          (f) => f.type === 'regular' && f.isExpanded,
        ).length,
        rootNodeCount: this.rootNodes.length,
      },
    };
  }
}
