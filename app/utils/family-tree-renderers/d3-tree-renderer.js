import BaseRenderer from './base-renderer';
import * as d3 from 'd3';

/**
 * D3TreeRenderer - Custom family tree renderer using D3.js
 *
 * This renderer creates hierarchical tree visualizations using D3's native
 * tree layout algorithms. It converts our graph data into D3 hierarchy format
 * and renders interactive SVG trees with zoom/pan capabilities.
 * 
 * DESIGN PRINCIPLE: Data Structure Interpretation
 * ==============================================
 * This renderer should focus on INTERPRETING data structures built by BaseRenderer,
 * not on creating or managing the core family tree logic. The BaseRenderer owns:
 * 
 * - Primary lineage paths and expansion state
 * - Layout coordinates and positioning algorithms  
 * - Family tree traversal and graph building logic
 * 
 * This D3TreeRenderer's responsibilities:
 * - Convert BaseRenderer data structures to D3-compatible formats
 * - Handle SVG rendering and D3-specific layout calculations
 * - Manage zoom/pan interactions and visual styling
 * - Provide click handlers that delegate back to BaseRenderer for state changes
 * 
 * By keeping data structure ownership in BaseRenderer, we can debug complex
 * layout algorithms using the DebugRenderer while letting this class focus
 * purely on the D3.js visualization technology.
 */
export default class D3TreeRenderer extends BaseRenderer {
  getType() {
    return 'd3-tree';
  }

  /**
   * Renders the family tree using D3's tree layout
   * @param {Object} graph - The graph data from buildVisibleGraph
   * @param {Object} options - Rendering options
   * @returns {Object} Rendered data for D3 tree
   */
  render(graph, options = {}) {
    const { persons } = graph;
    const currentPersonIdx = options.startPersonIdx || 0;

    if (persons.length === 0) {
      return {
        hierarchyData: null,
        type: 'd3-tree',
      };
    }

    // Find all root ancestors
    const roots = this.findRootAncestors(graph);

    if (this.debug) {
      console.log(`Found ${roots.length} root ancestors`);
    }

    // Convert to D3 hierarchy format
    const hierarchyData = this.buildHierarchy(graph, roots, currentPersonIdx);

    return {
      hierarchyData,
      type: 'd3-tree',
      currentPersonId: persons[currentPersonIdx].person.id,
    };
  }

  /**
   * Find all root ancestors in the graph
   * A root is someone with no parents and whose spouses also have no parents
   */
  findRootAncestors(graph) {
    const { persons } = graph;
    const roots = [];

    for (let i = 0; i < persons.length; i++) {
      if (this.isRoot(i, graph)) {
        roots.push(i);
      }
    }

    return roots;
  }

  /**
   * Check if a person is a root ancestor
   */
  isRoot(personIdx, graph) {
    const person = graph.persons[personIdx];

    // Check if person has parents
    if (person.parentIn.length > 0) return false;

    // Check if any spouse has parents
    for (const partnershipIdx of person.partnerships) {
      const partnership = graph.partnerships[partnershipIdx];

      // We don't need to filter out the current person from partnership.parents
      // because we already know they have no parents (checked above).
      for (const parentIdx of partnership.parents) {
        if (graph.persons[parentIdx].parentIn.length > 0) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Build D3 hierarchy data from our graph structure
   */
  buildHierarchy(graph, roots, currentPersonIdx) {
    const visited = new Set();

    // For simplicity, start with the first root
    // In the future, we could handle multiple roots or merge them
    if (roots.length === 0) return null;

    const rootIdx = roots[0];
    return this.buildPersonHierarchy(graph, rootIdx, visited, currentPersonIdx);
  }

  /**
   * Build a D3 hierarchy node for a person
   */
  buildPersonHierarchy(graph, personIdx, visited, currentPersonIdx) {
    const { persons, partnerships } = graph;
    const personData = persons[personIdx];
    const person = personData.person;

    // Check if this person has already been visited
    if (visited.has(person.id)) {
      return {
        name: `${person.name} (see above)`,
        id: `${person.id}-ref`,
        data: {
          person,
          isReference: true,
          originalId: person.id,
          isCurrent: personIdx === currentPersonIdx,
        },
        children: [], // Reference nodes have no children
      };
    }

    visited.add(person.id);

    // Create the hierarchy node
    const node = {
      name: person.name || 'Unknown',
      id: person.id,
      data: {
        person,
        isReference: false,
        isCurrent: personIdx === currentPersonIdx,
        comments: person.comments,
      },
      children: [],
    };

    // Add children from partnerships
    for (const partnershipIdx of personData.partnerships) {
      const partnership = partnerships[partnershipIdx];

      // Add spouse as a sibling-style node (optional)
      const spouseIdx = partnership.parents.find((idx) => idx !== personIdx);
      if (spouseIdx !== undefined) {
        const spouseData = persons[spouseIdx];
        const spouse = spouseData.person;

        // Add spouse info to the node data for rendering
        if (!node.data.spouses) node.data.spouses = [];
        node.data.spouses.push({
          name: spouse.name,
          id: spouse.id,
          comments: spouse.comments,
        });
      }

      // Add children
      for (const childIdx of partnership.children) {
        const childNode = this.buildPersonHierarchy(
          graph,
          childIdx,
          visited,
          currentPersonIdx,
        );
        if (childNode) {
          node.children.push(childNode);
        }
      }
    }

    return node;
  }

  /**
   * Renders the tree to a DOM element using D3
   */
  renderToElement(element, treeData, callbacks = {}) {
    // Clear previous content
    element.innerHTML = '';

    if (!treeData.hierarchyData) {
      element.innerHTML =
        '<div class="no-data">No family tree data available</div>';
      return;
    }

    // Set up dimensions
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = 800 - margin.right - margin.left;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .style('border', '1px solid #ccc');

    // Create container group for zoom/pan
    const container = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create D3 hierarchy
    const root = d3.hierarchy(treeData.hierarchyData);

    // Create tree layout
    const treeLayout = d3.tree().size([height, width]);

    // Generate the tree
    treeLayout(root);

    // Add links (connections between nodes)
    container
      .selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)
      .attr(
        'd',
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x),
      );

    // Add nodes
    const nodes = container
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', (d) => {
        const classes = ['node'];
        if (d.data.data.isCurrent) classes.push('current-person');
        if (d.data.data.isReference) classes.push('reference-node');
        if (d.data.data.person.gender) {
          classes.push(`person-${d.data.data.person.gender.toLowerCase()}`);
        }
        return classes.join(' ');
      })
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (callbacks.navigateToPerson) {
          const targetId = d.data.data.isReference
            ? d.data.data.originalId
            : d.data.id;
          callbacks.navigateToPerson(targetId);
        }
      });

    // Add circles for nodes
    nodes
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => {
        if (d.data.data.isCurrent) return '#3b82f6';
        if (d.data.data.isReference) return '#6b7280';
        return '#ffffff';
      })
      .attr('stroke', (d) => {
        if (d.data.data.isCurrent) return '#1d4ed8';
        if (d.data.data.isReference) return '#6b7280';
        if (d.data.data.person.gender === 'M') return '#3b82f6';
        if (d.data.data.person.gender === 'F') return '#ec4899';
        return '#6b7280';
      })
      .attr('stroke-width', 2);

    // Add text labels
    nodes
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', (d) => (d.children ? -8 : 8))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .text((d) => d.data.name)
      .style('font-family', 'sans-serif')
      .style('font-size', '12px')
      .style('fill', '#111827');

    // Add spouse information as smaller text
    nodes
      .filter((d) => d.data.data.spouses && d.data.data.spouses.length > 0)
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', (d) => (d.children ? -8 : 8))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .text((d) => `+ ${d.data.data.spouses.map((s) => s.name).join(', ')}`)
      .style('font-family', 'sans-serif')
      .style('font-size', '10px')
      .style('fill', '#6b7280')
      .style('font-style', 'italic');

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Center the tree initially
    const bounds = container.node().getBBox();
    const fullWidth = width + margin.right + margin.left;
    const fullHeight = height + margin.top + margin.bottom;
    const widthScale = fullWidth / bounds.width;
    const heightScale = fullHeight / bounds.height;
    const scale = Math.min(widthScale, heightScale) * 0.8;

    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(fullWidth / 2, fullHeight / 2)
        .scale(scale)
        .translate(-bounds.width / 2, -bounds.height / 2),
    );

    if (this.debug) {
      console.log('D3 Tree rendered successfully');
    }
  }
}
