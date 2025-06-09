import BaseRenderer from './base-renderer';
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
  constructor(options) {
    super(options);
    this.debug = false;
  }

  getType() {
    return 'text';
  }

  /**
   * Prepares the family tree layout data for ASCII art rendering
   * @param {RenderTree} renderTree - The RenderTree data from buildVisibleGraph
   * @param {Object} options - Layout options
   * @returns {Object} Layout data for text rendering
   */
  prepareRenderData(renderTree, options = {}) {
    try {
      // Use root nodes to determine starting point for text rendering
      let startPersonIndex;
      if (renderTree.rootNodes.length > 0) {
        // Use the first root node for text rendering
        startPersonIndex = renderTree.rootNodes[0];
      } else {
        // Fallback to focus person if no roots found
        startPersonIndex =
          options.startPersonIdx || renderTree.focusPersonIndex || 0;
      }

      // Use the layout algorithm to position elements
      const textLayoutRenderer = new TextLayoutRenderer();

      // Add bounds checking to prevent infinite recursion
      if (
        startPersonIndex < 0 ||
        startPersonIndex >= renderTree.persons.length
      ) {
        throw new Error(
          `Invalid start person index: ${startPersonIndex}, valid range: 0-${renderTree.persons.length - 1}`,
        );
      }

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
            personCount: renderTree.persons.length,
            partnershipCount: renderTree.partnerships.length,
            expandedPartnerships: Array.from(this.expandedPartnerships),
            expandedPersons: Array.from(this.expandedPersons),
            startPersonIndex: startPersonIndex,
            renderTree: null,
          },
        },
      };
    } catch (error) {
      return {
        type: 'text',
        data: {
          ascii: `Error rendering family tree:\n${error.message}`,
          metadata: {
            error: error.message,
            personCount: renderTree.persons.length,
            partnershipCount: renderTree.partnerships.length,
          },
        },
      };
    }
  }

  /**
   * Renders the ASCII output to a DOM element
   * @param {HTMLElement} element - Container element
   * @param {Object} renderData - Data from prepareRenderData()
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

    element.appendChild(container);
  }
}
