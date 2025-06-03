/**
 * Base class for family tree renderers.
 * Provides common functionality for building and rendering family tree visualizations.
 */
export default class BaseRenderer {
  constructor(options = {}) {
    this.expandedPartnerships = options.expandedPartnerships || new Set();
    this.expandedPersons = options.expandedPersons || new Set();
    this.debug = options.debug || false;
  }

  /**
   * Builds an index-based graph representation of the visible family tree.
   *
   * This algorithm creates two arrays:
   * - persons: Array of person nodes with indices pointing to their relationships
   * - partnerships: Array of partnership nodes with indices pointing to parents/children
   *
   * The algorithm handles cycles by immediately adding placeholders to the maps
   * before recursively processing relationships. This ensures each person/partnership
   * is processed exactly once.
   *
   * @param {Person} startPerson - The person to start building from
   * @returns {Object} Graph with persons and partnerships arrays
   */
  buildVisibleGraph(startPerson) {
    const persons = [];
    const partnerships = [];
    const personToIndex = new Map(); // person.id -> index
    const partnershipToIndex = new Map(); // partnership.id -> index

    const buildPerson = (person) => {
      // Return existing index if already processed
      if (personToIndex.has(person.id)) {
        const existingIdx = personToIndex.get(person.id);
        if (this.debug) {
          console.log(
            `Person already exists: ${person.name} at index ${existingIdx}`,
          );
        }
        return existingIdx;
      }

      // Add placeholder immediately to handle cycles
      const idx = persons.length;
      personToIndex.set(person.id, idx);
      persons.push({
        person,
        parentIn: [], // Partnership(s) where this person is a child
        partnerships: [], // Partnerships where this person is a parent
      });

      if (this.debug) {
        console.log(`Added person: ${person.name} at index ${idx}`);
      }

      // Process partnership where this person is a child
      if (person.childIn) {
        const parentPartnershipIdx = buildPartnership(person.childIn);
        persons[idx].parentIn = [parentPartnershipIdx];
        if (this.debug) {
          console.log(`  - Child in partnership ${parentPartnershipIdx}`);
        }
      }

      // Process partnerships where this person is a parent
      for (const partnership of person.parentIn) {
        const partnershipIdx = buildPartnership(partnership);
        persons[idx].partnerships.push(partnershipIdx);
        if (this.debug) {
          console.log(`  - Parent in partnership ${partnershipIdx}`);
        }
      }

      return idx;
    };

    const buildPartnership = (partnership) => {
      // Return existing index if already processed
      if (partnershipToIndex.has(partnership.id)) {
        const existingIdx = partnershipToIndex.get(partnership.id);
        if (this.debug) {
          console.log(
            `Partnership already exists: ${partnership.id} at index ${existingIdx}`,
          );
        }
        return existingIdx;
      }

      // Add placeholder immediately to handle cycles
      const idx = partnerships.length;
      partnershipToIndex.set(partnership.id, idx);
      partnerships.push({
        partnership,
        parents: [],
        children: [],
        expanded: this.isPartnershipExpanded(partnership.id),
      });

      if (this.debug) {
        const partnerNames = partnership.parents.map((p) => p.name).join(' & ');
        console.log(
          `Added partnership: ${partnerNames} (${partnership.id}) at index ${idx}`,
        );
      }

      // Add all parents
      for (const parent of partnership.parents) {
        const parentIdx = buildPerson(parent);
        partnerships[idx].parents.push(parentIdx);
        if (this.debug) {
          console.log(`  - Has parent ${parent.name} at index ${parentIdx}`);
        }
      }

      // Process children
      for (const child of partnership.children) {
        if (this.isPartnershipExpanded(partnership.id)) {
          // If expanded, fully build the child
          const childIdx = buildPerson(child);
          partnerships[idx].children.push(childIdx);

          // Update the child's parentIn if needed
          if (persons[childIdx].parentIn.length === 0) {
            persons[childIdx].parentIn = [idx];
          }

          if (this.debug) {
            console.log(`  - Has child ${child.name} at index ${childIdx}`);
          }
        } else {
          // If not expanded, check if child already exists in graph
          if (personToIndex.has(child.id)) {
            const childIdx = personToIndex.get(child.id);
            partnerships[idx].children.push(childIdx);

            // Ensure child knows about this parent partnership
            if (!persons[childIdx].parentIn.includes(idx)) {
              persons[childIdx].parentIn.push(idx);
            }

            if (this.debug) {
              console.log(
                `  - Connected to existing child ${child.name} at index ${childIdx}`,
              );
            }
          }
        }
      }

      if (
        this.debug &&
        !this.isPartnershipExpanded(partnership.id) &&
        partnership.children.length > 0
      ) {
        const connectedCount = partnerships[idx].children.length;
        const totalCount = partnership.children.length;
        console.log(
          `  - Has ${totalCount} children total (${connectedCount} connected, partnership not expanded)`,
        );
      }

      return idx;
    };

    // Start building from the initial person
    buildPerson(startPerson);

    if (this.debug) {
      console.log('\nFinal graph structure:');
      console.log(`Persons: ${persons.length}`);
      console.log(`Partnerships: ${partnerships.length}`);

      // Find and log root nodes
      const roots = persons
        .map((p, idx) => ({ ...p, idx }))
        .filter((p) => p.parentIn.length === 0);
      console.log(
        `Root nodes: ${roots
          .map((r) => `${r.person.name} (${r.idx})`)
          .join(', ')}`,
      );
    }

    return { persons, partnerships };
  }

  /**
   * Check if a partnership is expanded
   * @param {string} partnershipId - The partnership ID
   * @returns {boolean} True if expanded
   */
  isPartnershipExpanded(partnershipId) {
    return this.expandedPartnerships.has(partnershipId);
  }

  /**
   * Check if a person is expanded
   * @param {string} personId - The person ID
   * @returns {boolean} True if expanded
   */
  isPersonExpanded(personId) {
    return this.expandedPersons.has(personId);
  }

  /**
   * Update expansion state for partnerships
   * @param {Set} expandedPartnerships - Set of expanded partnership IDs
   */
  setExpandedPartnerships(expandedPartnerships) {
    this.expandedPartnerships = expandedPartnerships;
  }

  /**
   * Update expansion state for persons
   * @param {Set} expandedPersons - Set of expanded person IDs
   */
  setExpandedPersons(expandedPersons) {
    this.expandedPersons = expandedPersons;
  }

  /**
   * Render the family tree. Must be implemented by subclasses.
   * @param {Object} graph - The graph data from buildVisibleGraph
   * @param {Object} options - Rendering options
   * @returns {Object} Rendered output (format depends on renderer)
   */
  render() {
    throw new Error('render method must be implemented by subclass');
  }

  /**
   * Get the renderer name/type
   * @returns {string} The renderer type
   */
  getType() {
    throw new Error('getType method must be implemented by subclass');
  }
}
