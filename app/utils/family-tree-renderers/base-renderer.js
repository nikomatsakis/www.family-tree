import {
  RenderTree,
  RenderPerson,
  RegularPartnership,
} from '../render-tree.js';

/**
 * Base class for family tree renderers.
 * Provides common functionality for building and rendering family tree visualizations.
 *
 * DESIGN PRINCIPLE: Data Structure Ownership
 * ========================================
 * The BaseRenderer is responsible for owning and managing all core data structures
 * used in family tree visualization:
 *
 * - Primary lineage paths (which ancestral line to follow upward)
 * - Expansion state (which partnerships/branches are visible)
 * - Layout coordinates and positioning data
 * - Visual styling and interaction state
 *
 * These data structures should be built and maintained here so they are visible
 * to the DebugRenderer for inspection and debugging. Concrete renderers like
 * D3TreeRenderer should focus on INTERPRETING these data structures for their
 * specific rendering technology, not on building or managing the data itself.
 *
 * This separation allows us to:
 * - Debug complex layout algorithms by examining the complete state
 * - Share data structures between different renderer implementations
 * - Maintain consistency in how family tree logic is handled
 * - Test layout algorithms independently of rendering technology
 */
export default class BaseRenderer {
  constructor(options = {}) {
    this.expandedPartnerships = options.expandedPartnerships || new Set();
    this.expandedPersons = options.expandedPersons || new Set();
    this.debug = options.debug || false;
  }

  /**
   * Builds a RenderTree representation of the visible family tree.
   *
   * This algorithm creates a RenderTree with proper RenderPerson and RegularPartnership objects.
   * The algorithm handles cycles by immediately adding placeholders to the maps
   * before recursively processing relationships. This ensures each person/partnership
   * is processed exactly once.
   *
   * @param {*} startPerson - The person to start building from (from genea service)
   * @returns {RenderTree} RenderTree with proper RenderPerson and RegularPartnership objects
   */
  buildVisibleGraph(startPerson) {
    // Find the start person index (will be 0 since we add them first)
    const renderTree = new RenderTree(0);
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

      // Create RenderPerson with correct semantics
      const renderPerson = new RenderPerson(
        person.id,
        person.name,
        person.gender,
        person.comments,
        null, // childIn - will be set below if person has parents
        [], // parentIn - will be populated below with partnerships where this person is a parent
      );

      // Add to render tree and store index mapping
      const idx = renderTree.addPerson(renderPerson);
      personToIndex.set(person.id, idx);

      if (this.debug) {
        console.log(`Added person: ${person.name} at index ${idx}`);
      }

      // Process partnership where this person is a child (their parents' partnership)
      // Only include parent partnership if it's explicitly expanded
      if (person.childIn && this.isPartnershipExpanded(person.childIn.id)) {
        const parentPartnershipIdx = buildPartnership(person.childIn);
        renderTree.getPerson(idx).childIn = parentPartnershipIdx;
        if (this.debug) {
          console.log(`  - Child in partnership ${parentPartnershipIdx}`);
        }
      }

      // Process partnerships where this person is a parent (partnerships with their spouses)
      for (const partnership of person.parentIn) {
        const partnershipIdx = buildPartnership(partnership);
        renderTree.getPerson(idx).parentIn.push(partnershipIdx);
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

      // Create RegularPartnership with proper expansion state
      const isExpanded = this.isPartnershipExpanded(partnership.id);
      const childrenArray = isExpanded ? [] : null; // null = not expanded, [] = expanded but no children yet
      const hasChildren =
        partnership.children && partnership.children.length > 0;

      const regularPartnership = new RegularPartnership(
        partnership.id,
        [], // parents - will be populated below
        childrenArray,
        hasChildren,
      );

      // Add to render tree and store index mapping
      const idx = renderTree.addPartnership(regularPartnership);
      partnershipToIndex.set(partnership.id, idx);

      if (this.debug) {
        const partnerNames = partnership.parents.map((p) => p.name).join(' & ');
        console.log(
          `Added partnership: ${partnerNames} (${partnership.id}) at index ${idx}`,
        );
      }

      // Add all parents
      for (const parent of partnership.parents) {
        const parentIdx = buildPerson(parent);
        renderTree.getPartnership(idx).parents.push(parentIdx);
        if (this.debug) {
          console.log(`  - Has parent ${parent.name} at index ${parentIdx}`);
        }
      }

      // If partnership has only one parent, add a placeholder for missing partner
      if (partnership.parents.length === 1) {
        const unknownPerson = new RenderPerson(
          `unknown-partner-${partnership.id}`,
          'Unknown',
          null,
          [idx], // This partnership
        );
        const unknownIdx = renderTree.addPerson(unknownPerson);
        renderTree.getPartnership(idx).parents.push(unknownIdx);
        if (this.debug) {
          console.log(
            `  - Added placeholder Unknown partner at index ${unknownIdx}`,
          );
        }
      }

      // Process children
      for (const child of partnership.children) {
        if (this.isPartnershipExpanded(partnership.id)) {
          // If expanded, fully build the child
          const childIdx = buildPerson(child);
          renderTree.getPartnership(idx).children.push(childIdx);

          // Update the child's childIn to point to this partnership (their parents' partnership)
          if (renderTree.getPerson(childIdx).childIn === null) {
            renderTree.getPerson(childIdx).childIn = idx;
          }

          if (this.debug) {
            console.log(`  - Has child ${child.name} at index ${childIdx}`);
          }
        } else {
          // If not expanded, check if child already exists in graph
          if (personToIndex.has(child.id)) {
            const childIdx = personToIndex.get(child.id);
            // Note: for unexpanded partnerships, children array should be null, not populated
            // This might need adjustment based on the visual design requirements

            // Ensure child knows about this parent partnership
            if (renderTree.getPerson(childIdx).childIn === null) {
              renderTree.getPerson(childIdx).childIn = idx;
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
        const connectedCount =
          renderTree.getPartnership(idx).children?.length || 0;
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
      console.log('\nFinal RenderTree structure:');
      console.log(`Persons: ${renderTree.persons.length}`);
      console.log(`Partnerships: ${renderTree.partnerships.length}`);

      // Find and log root nodes
      const roots = renderTree.persons
        .map((p, idx) => ({ person: p, idx }))
        .filter((p) => p.person.childIn === null);
      console.log(
        `Root nodes: ${roots
          .map((r) => `${r.person.name} (${r.idx})`)
          .join(', ')}`,
      );
    }

    // Compute root nodes for the completed tree
    renderTree.computeRootNodes();

    if (this.debug) {
      console.log(
        'Computed root nodes:',
        renderTree.rootNodes.map(
          (idx) => `${renderTree.getPerson(idx).name} (${idx})`,
        ),
      );
    }

    return renderTree;
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
   * Prepare render data for the family tree. Must be implemented by subclasses.
   * This method does not perform actual rendering, but prepares the data structure
   * needed for rendering (e.g., layout calculations, positioning, etc.).
   * @param {Object} graph - The graph data from buildVisibleGraph
   * @param {Object} options - Layout options
   * @returns {Object} Render data (format depends on renderer)
   */
  prepareRenderData() {
    throw new Error('prepareRenderData method must be implemented by subclass');
  }

  /**
   * Get the renderer name/type
   * @returns {string} The renderer type
   */
  getType() {
    throw new Error('getType method must be implemented by subclass');
  }
}
