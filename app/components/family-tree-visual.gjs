import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { modifier } from 'ember-modifier';
import mermaid from 'mermaid';

export default class FamilyTreeVisual extends Component {
  @service router;
  @tracked treeData = null;
  @tracked expandedPartnerships = new Set();
  @tracked expandedPersons = new Set();

  nodeWidth = 200;
  nodeHeight = 80;
  horizontalSpacing = 450;
  verticalSpacing = 150;

  constructor() {
    super(...arguments);
    this.initializeExpansionState();
    this.buildTreeData();

    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      flowchart: {
        nodeSpacing: 50,
        rankSpacing: 100,
        curve: 'basis',
      },
    });
  }

  initializeExpansionState() {
    // Parse URL query params
    const urlExpansions = this.parseQueryParams();

    if (urlExpansions.hasData) {
      // Use URL state (allows users to collapse defaults)
      this.expandedPartnerships = urlExpansions.expandedPartnerships;
      this.expandedPersons = urlExpansions.expandedPersons;
    } else {
      // No URL state, use defaults
      const defaults = this.computeDefaultExpansions();
      this.expandedPartnerships = defaults.expandedPartnerships;
      this.expandedPersons = defaults.expandedPersons;
    }
  }

  parseQueryParams() {
    const queryParams = this.router.currentRoute?.queryParams || {};
    const expandedPartnerships = new Set(
      queryParams.expandedPartnerships?.split(',').filter(Boolean) || [],
    );
    const expandedPersons = new Set(
      queryParams.expandedPersons?.split(',').filter(Boolean) || [],
    );

    return {
      hasData:
        queryParams.expandedPartnerships !== undefined ||
        queryParams.expandedPersons !== undefined,
      expandedPartnerships,
      expandedPersons,
    };
  }

  computeDefaultExpansions() {
    const expandedPartnerships = new Set();
    const expandedPersons = new Set();

    // Default: Show parent partnership that produced current person
    if (this.args.person.childIn) {
      expandedPartnerships.add(this.args.person.childIn.id);
    }

    // Default: Show partnerships of current person's children
    this.args.person.parentIn.forEach((partnership) => {
      partnership.children.forEach((child) => {
        child.parentIn.forEach((childPartnership) => {
          expandedPartnerships.add(childPartnership.id);
        });
      });
    });

    return { expandedPartnerships, expandedPersons };
  }

  @action
  togglePartnershipExpansion(partnershipId) {
    if (this.expandedPartnerships.has(partnershipId)) {
      this.expandedPartnerships.delete(partnershipId);
    } else {
      this.expandedPartnerships.add(partnershipId);
    }
    this.expandedPartnerships = new Set(this.expandedPartnerships); // Trigger tracked update
    this.buildTreeData(); // Rebuild tree with new state
    this.updateURL();
  }

  @action
  togglePersonExpansion(personId) {
    if (this.expandedPersons.has(personId)) {
      this.expandedPersons.delete(personId);
    } else {
      this.expandedPersons.add(personId);
    }
    this.expandedPersons = new Set(this.expandedPersons); // Trigger tracked update
    this.buildTreeData(); // Rebuild tree with new state
    this.updateURL();
  }

  @action
  updateURL() {
    const expandedPartnerships = Array.from(this.expandedPartnerships).join(
      ',',
    );
    const expandedPersons = Array.from(this.expandedPersons).join(',');

    this.router.transitionTo('person', this.args.person.id, {
      queryParams: {
        expandedPartnerships: expandedPartnerships || undefined,
        expandedPersons: expandedPersons || undefined,
        referencePersonId: this.args.referencePerson?.id,
      },
    });
  }

  isPartnershipExpanded = (partnershipId) => {
    return this.expandedPartnerships.has(partnershipId);
  };

  isPersonExpanded = (personId) => {
    return this.expandedPersons.has(personId);
  };

  // TODO: These will be calculated after layout
  get svgWidth() {
    return 1200;
  }

  get svgHeight() {
    return 800;
  }

  buildTreeData() {
    const person = this.args.person;
    const pagePerson = this.args.pagePerson;
    const referencePerson = this.args.referencePerson;

    // Build the graph using our new index-based structure
    const graph = this.buildVisibleGraph(person, {
      isExpanded: (partnershipId) =>
        this.expandedPartnerships.has(partnershipId),
      debug: true, // Set to true to see detailed logging of graph construction
    });

    // Generate mermaid syntax
    const mermaidCode = this.generateMermaidCode(graph);

    // Store graph data for rendering
    this.treeData = {
      graph,
      mermaidCode,
      pagePerson,
      referencePerson,
      currentPersonIdx: 0, // The starting person is always at index 0
    };
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
   * @param {Object} options - Options including expansion state and debug flag
   * @returns {Object} Graph with persons and partnerships arrays
   */
  buildVisibleGraph(startPerson, options = {}) {
    const { isExpanded, debug = false } = options;
    const persons = [];
    const partnerships = [];
    const personToIndex = new Map(); // person.id -> index
    const partnershipToIndex = new Map(); // partnership.id -> index

    function buildPerson(person) {
      // Return existing index if already processed
      if (personToIndex.has(person.id)) {
        const existingIdx = personToIndex.get(person.id);
        if (debug) {
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

      if (debug) {
        console.log(`Added person: ${person.name} at index ${idx}`);
      }

      // Process partnership where this person is a child
      if (person.childIn) {
        const parentPartnershipIdx = buildPartnership(person.childIn);
        persons[idx].parentIn = [parentPartnershipIdx];
        if (debug) {
          console.log(`  - Child in partnership ${parentPartnershipIdx}`);
        }
      }

      // Process partnerships where this person is a parent
      for (const partnership of person.parentIn) {
        const partnershipIdx = buildPartnership(partnership);
        persons[idx].partnerships.push(partnershipIdx);
        if (debug) {
          console.log(`  - Parent in partnership ${partnershipIdx}`);
        }
      }

      return idx;
    }

    function buildPartnership(partnership) {
      // Return existing index if already processed
      if (partnershipToIndex.has(partnership.id)) {
        const existingIdx = partnershipToIndex.get(partnership.id);
        if (debug) {
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
        expanded: isExpanded(partnership.id),
      });

      if (debug) {
        const partnerNames = partnership.parents.map((p) => p.name).join(' & ');
        console.log(
          `Added partnership: ${partnerNames} (${partnership.id}) at index ${idx}`,
        );
      }

      // Add all parents
      for (const parent of partnership.parents) {
        const parentIdx = buildPerson(parent);
        partnerships[idx].parents.push(parentIdx);
        if (debug) {
          console.log(`  - Has parent ${parent.name} at index ${parentIdx}`);
        }
      }

      // Add children if expanded
      if (isExpanded(partnership.id)) {
        for (const child of partnership.children) {
          const childIdx = buildPerson(child);
          partnerships[idx].children.push(childIdx);

          // Update the child's parentIn if needed
          if (persons[childIdx].parentIn.length === 0) {
            persons[childIdx].parentIn = [idx];
          }

          if (debug) {
            console.log(`  - Has child ${child.name} at index ${childIdx}`);
          }
        }
      } else if (debug && partnership.children.length > 0) {
        console.log(
          `  - Has ${partnership.children.length} children (not expanded)`,
        );
      }

      return idx;
    }

    // Start building from the initial person
    buildPerson(startPerson);

    if (debug) {
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
   * Converts our graph structure to mermaid flowchart syntax.
   * Creates a family tree using mermaid's flowchart format.
   *
   * @param {Object} graph - The graph with persons and partnerships arrays
   * @returns {string} Mermaid flowchart code
   */
  generateMermaidCode(graph) {
    const { persons, partnerships } = graph;
    let mermaidCode = 'flowchart TD\n';

    // Add person nodes
    persons.forEach((personNode, idx) => {
      const person = personNode.person;
      const name = person.name.replace(/"/g, '&quot;');
      const nodeId = `P${idx}`;
      mermaidCode += `    ${nodeId}["${name}"]\n`;
    });

    // Add partnership nodes (diamonds with no text) and connections
    partnerships.forEach((partnershipNode, idx) => {
      const partnershipId = `R${idx}`;

      // Create partnership node as diamond with no text
      mermaidCode += `    ${partnershipId}{ }\n`;

      // Connect parents to partnership with thick lines
      partnershipNode.parents.forEach((parentIdx) => {
        mermaidCode += `    P${parentIdx} ==> ${partnershipId}\n`;
      });

      // Connect partnership to children with normal lines
      partnershipNode.children.forEach((childIdx) => {
        mermaidCode += `    ${partnershipId} --> P${childIdx}\n`;
      });
    });

    // Add styling
    mermaidCode += '\n';
    mermaidCode +=
      '    classDef person fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n';
    mermaidCode +=
      '    classDef partnership fill:#f8bbd9,stroke:#880e4f,stroke-width:2px\n';

    // Apply classes
    persons.forEach((_, idx) => {
      mermaidCode += `    class P${idx} person\n`;
    });
    partnerships.forEach((_, idx) => {
      mermaidCode += `    class R${idx} partnership\n`;
    });

    return mermaidCode;
  }

  @action
  handleNodeClick(person) {
    if (this.args.onPersonClick) {
      this.args.onPersonClick(person);
    }
  }

  renderMermaid = modifier((element) => {
    // Clear any existing content
    element.innerHTML = '';

    // Render the mermaid diagram
    if (this.treeData?.mermaidCode) {
      mermaid
        .render('mermaid-family-tree', this.treeData.mermaidCode)
        .then(({ svg }) => {
          element.innerHTML = svg;
        })
        .catch((error) => {
          console.error('Error rendering mermaid diagram:', error);
          element.innerHTML = '<p>Error rendering family tree diagram</p>';
        });
    }
  });

  <template>
    <div class='family-tree-visual-container'>
      {{#if this.treeData}}
        <div class='mermaid-container' {{this.renderMermaid}}>
          {{this.treeData.mermaidCode}}
        </div>
      {{else}}
        <div class='loading'>Building family tree...</div>
      {{/if}}
    </div>
  </template>
}
