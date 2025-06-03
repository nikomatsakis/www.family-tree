import BaseRenderer from './base-renderer';
import mermaid from 'mermaid';

/**
 * Mermaid-based family tree renderer.
 * Generates interactive flowchart diagrams using Mermaid.js.
 */
export default class MermaidRenderer extends BaseRenderer {
  constructor(options = {}) {
    super(options);
    this.initializeMermaid();
  }

  initializeMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      flowchart: {
        nodeSpacing: 50,
        rankSpacing: 100,
        curve: 'basis',
      },
    });
  }

  /**
   * Converts graph structure to mermaid flowchart syntax.
   * Creates a family tree using mermaid's flowchart format.
   *
   * @param {Object} graph - The graph with persons and partnerships arrays
   * @param {Object} options - Rendering options
   * @returns {Object} Object with mermaidCode and other rendering data
   */
  render(graph) {
    const { persons, partnerships } = graph;
    let mermaidCode = 'flowchart TD\n';

    // Add person nodes
    persons.forEach((personNode, idx) => {
      const person = personNode.person;
      const name = person.name.replace(/"/g, '&quot;');
      const nodeId = `P${idx}`;
      mermaidCode += `    ${nodeId}["${name}"]\n`;
      // Add click event to navigate to person
      mermaidCode += `    click ${nodeId} call navigateToPerson("${person.id}")\n`;
    });

    // Add partnership nodes (diamonds with no text) and connections
    partnerships.forEach((partnershipNode, idx) => {
      const partnershipId = `R${idx}`;
      const hasChildren = partnershipNode.partnership.children.length > 0;
      const isExpanded = partnershipNode.expanded;

      // Create partnership node as diamond
      // Show different styles for partnerships with/without children
      if (hasChildren && !isExpanded) {
        // Has children but not expanded - show with "..."
        mermaidCode += `    ${partnershipId}{...}\n`;
        // Add click event for expandable partnerships
        mermaidCode += `    click ${partnershipId} call togglePartnership("${partnershipNode.partnership.id}")\n`;
      } else if (hasChildren && isExpanded) {
        // Has children and expanded - show with "+"
        mermaidCode += `    ${partnershipId}{+}\n`;
        // Add click event to collapse
        mermaidCode += `    click ${partnershipId} call togglePartnership("${partnershipNode.partnership.id}")\n`;
      } else {
        // No children - empty diamond
        mermaidCode += `    ${partnershipId}{ }\n`;
      }

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
    mermaidCode +=
      '    classDef partnershipCollapsed fill:#ffccbc,stroke:#bf360c,stroke-width:2px\n';
    mermaidCode +=
      '    classDef partnershipExpanded fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px\n';

    // Apply classes
    persons.forEach((_, idx) => {
      mermaidCode += `    class P${idx} person\n`;
    });
    partnerships.forEach((partnershipNode, idx) => {
      const hasChildren = partnershipNode.partnership.children.length > 0;
      const isExpanded = partnershipNode.expanded;

      if (hasChildren && !isExpanded) {
        mermaidCode += `    class R${idx} partnershipCollapsed\n`;
      } else if (hasChildren && isExpanded) {
        mermaidCode += `    class R${idx} partnershipExpanded\n`;
      } else {
        mermaidCode += `    class R${idx} partnership\n`;
      }
    });

    return {
      type: 'mermaid',
      mermaidCode,
      graph,
    };
  }

  /**
   * Render the mermaid diagram into a DOM element
   * @param {HTMLElement} element - Target DOM element
   * @param {Object} renderData - Data from render() method
   * @param {Object} callbacks - Callback functions for interactions
   * @returns {Promise} Promise that resolves when rendering is complete
   */
  async renderToElement(element, renderData, callbacks = {}) {
    // Clear any existing content
    element.innerHTML = '';

    // Set up mermaid with click callbacks
    if (callbacks.togglePartnership) {
      window.togglePartnership = callbacks.togglePartnership;
    }

    if (callbacks.navigateToPerson) {
      window.navigateToPerson = callbacks.navigateToPerson;
    }

    // Render the mermaid diagram
    if (renderData.mermaidCode) {
      try {
        const { svg } = await mermaid.render(
          'mermaid-family-tree',
          renderData.mermaidCode,
        );
        element.innerHTML = svg;
      } catch (error) {
        console.error('Error rendering mermaid diagram:', error);
        element.innerHTML = '<p>Error rendering family tree diagram</p>';
        throw error;
      }
    }
  }

  getType() {
    return 'mermaid';
  }
}
