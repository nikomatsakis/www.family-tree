import BaseRenderer from './base-renderer';
import { RenderTree, RenderPerson, RegularPartnership } from '../render-tree';
import { layoutFamily } from '../family-layout';
import { TextRenderer as TextLayoutRenderer } from '../text-renderer';
import { TextCanvas } from '../text-canvas';

/**
 * TextRenderer - Renders family trees as ASCII art for debugging
 *
 * This renderer converts the family tree graph into ASCII diagrams using
 * the text-based layout system. It's useful for debugging layout algorithms
 * and visualizing the family structure in a simple, text-based format.
 */
export default class TextRenderer extends BaseRenderer {
  getType() {
    return 'text';
  }

  /**
   * Renders the family tree as ASCII art
   * @param {Object} graph - The graph data from buildVisibleGraph
   * @param {Object} options - Rendering options
   * @returns {Object} Text rendering data
   */
  render(graph, options = {}) {
    const { persons, partnerships } = graph;

    try {
      // Convert the graph back to RenderTree format for the layout algorithm
      const renderTree = this.convertGraphToRenderTree(
        persons,
        partnerships,
        options,
      );

      // Use the layout algorithm to position elements
      const textLayoutRenderer = new TextLayoutRenderer();
      const startPersonIndex = options.startPersonIdx || 0;
      const family = layoutFamily(
        renderTree,
        startPersonIndex,
        textLayoutRenderer,
      );

      // Render to ASCII using TextCanvas
      const canvas = new TextCanvas();
      textLayoutRenderer.render(canvas, family);
      const asciiOutput = canvas.render();

      return {
        type: 'text',
        data: {
          ascii: asciiOutput,
          metadata: {
            personCount: persons.length,
            partnershipCount: partnerships.length,
            expandedPartnerships: Array.from(this.expandedPartnerships),
            expandedPersons: Array.from(this.expandedPersons),
            startPersonIndex: startPersonIndex,
            renderTree: this.debug ? this.debugRenderTree(renderTree) : null,
          },
        },
      };
    } catch (error) {
      console.error('Error in TextRenderer.render:', error);
      return {
        type: 'text',
        data: {
          ascii: `Error rendering family tree:\n${error.message}`,
          metadata: {
            error: error.message,
            personCount: persons.length,
            partnershipCount: partnerships.length,
          },
        },
      };
    }
  }

  /**
   * Convert graph format back to RenderTree format for layout algorithm
   * @param {Array} persons - Graph persons array
   * @param {Array} partnerships - Graph partnerships array
   * @param {Object} options - Rendering options
   * @returns {RenderTree} RenderTree instance
   */
  convertGraphToRenderTree(persons, partnerships, options) {
    const startPersonIndex = options.startPersonIdx || 0;
    const renderTree = new RenderTree(startPersonIndex);

    // Create RenderPerson objects and add them to the tree
    const personIndexMap = new Map(); // graph index -> render tree index
    persons.forEach((graphPerson, graphIndex) => {
      const renderPerson = new RenderPerson(
        graphPerson.person.id,
        graphPerson.person.name,
      );
      const renderIndex = renderTree.addPerson(renderPerson);
      personIndexMap.set(graphIndex, renderIndex);
    });

    // Create RegularPartnership objects and add them to the tree
    const partnershipIndexMap = new Map(); // graph index -> render tree index
    partnerships.forEach((graphPartnership, graphIndex) => {
      const parentIndices = graphPartnership.parents.map((graphIdx) =>
        personIndexMap.get(graphIdx),
      );
      const childIndices = graphPartnership.children.map((graphIdx) =>
        personIndexMap.get(graphIdx),
      );

      // Only create partnership if it's expanded or has connected children
      if (graphPartnership.expanded || childIndices.length > 0) {
        const partnership = new RegularPartnership(
          graphPartnership.partnership.id,
          parentIndices,
          childIndices,
        );
        partnership.isExpanded = graphPartnership.expanded;

        const renderIndex = renderTree.addPartnership(partnership);
        partnershipIndexMap.set(graphIndex, renderIndex);
      }
    });

    // Update person relationships to point to render tree indices
    persons.forEach((graphPerson, graphIndex) => {
      const renderPersonIndex = personIndexMap.get(graphIndex);
      const renderPerson = renderTree.getPerson(renderPersonIndex);

      // Set parentIn relationships
      renderPerson.parentIn = graphPerson.parentIn
        .map((graphPartnershipIdx) =>
          partnershipIndexMap.get(graphPartnershipIdx),
        )
        .filter((idx) => idx !== undefined);

      // Set childIn relationship
      if (graphPerson.parentIn.length > 0) {
        const parentPartnershipIdx = partnershipIndexMap.get(
          graphPerson.parentIn[0],
        );
        if (parentPartnershipIdx !== undefined) {
          renderPerson.childIn = parentPartnershipIdx;
        }
      }
    });

    return renderTree;
  }

  /**
   * Create debug information for RenderTree
   * @param {RenderTree} renderTree - The render tree
   * @returns {Object} Debug information
   */
  debugRenderTree(renderTree) {
    const persons = [];
    const partnerships = [];

    for (let i = 0; i < renderTree.persons.length; i++) {
      const person = renderTree.getPerson(i);
      persons.push({
        index: i,
        id: person.id,
        name: person.name,
        childIn: person.childIn,
        parentIn: [...person.parentIn],
      });
    }

    for (let i = 0; i < renderTree.partnerships.length; i++) {
      const partnership = renderTree.getPartnership(i);
      partnerships.push({
        index: i,
        id: partnership.id,
        type: partnership.constructor.name,
        parents: [...partnership.parents],
        children: partnership.children ? [...partnership.children] : null,
        isExpanded: partnership.isExpanded,
      });
    }

    return {
      focusPersonIndex: renderTree.focusPersonIndex,
      persons,
      partnerships,
      stats: {
        personCount: persons.length,
        partnershipCount: partnerships.length,
        expandedPartnerships: partnerships.filter((p) => p.isExpanded).length,
      },
    };
  }

  /**
   * Renders the ASCII output to a DOM element
   * @param {HTMLElement} element - Container element
   * @param {Object} renderData - Data from render()
   */
  renderToElement(element, renderData) {
    // Clear previous content
    element.innerHTML = '';

    if (!renderData.data || !renderData.data.ascii) {
      element.innerHTML = '<div class="no-data">No ASCII data available</div>';
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.className = 'text-renderer';
    container.style.cssText = `
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.2;
      max-height: 80vh;
      overflow: auto;
      border: 1px solid #ddd;
      background: #f8f9fa;
      padding: 20px;
      white-space: pre;
      color: #212529;
    `;

    // Create header with metadata
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #dee2e6;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: normal;
    `;

    const title = document.createElement('h4');
    title.textContent = 'ASCII Family Tree';
    title.style.cssText = 'margin: 0; color: #495057;';

    const metadata = renderData.data.metadata;
    const stats = document.createElement('div');
    stats.style.cssText = 'font-size: 12px; color: #6c757d; text-align: right;';
    stats.innerHTML = `
      <div>Persons: ${metadata.personCount}</div>
      <div>Partnerships: ${metadata.partnershipCount}</div>
      <div>Focus: Person ${metadata.startPersonIndex}</div>
    `;

    header.appendChild(title);
    header.appendChild(stats);

    // Create ASCII display with copy functionality
    const asciiContainer = document.createElement('div');
    asciiContainer.style.cssText = 'position: relative;';

    const asciiDisplay = document.createElement('pre');
    asciiDisplay.style.cssText = `
      margin: 0;
      padding: 16px;
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      overflow: auto;
      color: #212529;
      white-space: pre;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.2;
    `;
    asciiDisplay.textContent = renderData.data.ascii;

    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy ASCII';
    copyButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 6px 12px;
      font-size: 11px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      z-index: 1;
    `;

    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(renderData.data.ascii);
        copyButton.textContent = 'Copied!';
        copyButton.style.background = '#28a745';
        setTimeout(() => {
          copyButton.textContent = 'Copy ASCII';
          copyButton.style.background = '#007bff';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy ASCII:', err);
        copyButton.textContent = 'Copy failed';
        copyButton.style.background = '#dc3545';
      }
    });

    asciiContainer.appendChild(asciiDisplay);
    asciiContainer.appendChild(copyButton);

    container.appendChild(header);
    container.appendChild(asciiContainer);

    // Add debug info if available
    if (this.debug && metadata.renderTree) {
      const debugSection = document.createElement('details');
      debugSection.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        font-family: system-ui, -apple-system, sans-serif;
        white-space: normal;
      `;

      const debugSummary = document.createElement('summary');
      debugSummary.textContent = 'Debug Information';
      debugSummary.style.cssText =
        'cursor: pointer; font-weight: bold; margin-bottom: 8px;';

      const debugContent = document.createElement('pre');
      debugContent.style.cssText = `
        margin: 8px 0 0 0;
        padding: 12px;
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        overflow: auto;
        font-size: 12px;
        white-space: pre;
      `;
      debugContent.textContent = JSON.stringify(metadata.renderTree, null, 2);

      debugSection.appendChild(debugSummary);
      debugSection.appendChild(debugContent);
      container.appendChild(debugSection);
    }

    element.appendChild(container);

    if (this.debug) {
      console.log('Text renderer displayed ASCII output:', renderData.data);
    }
  }
}
