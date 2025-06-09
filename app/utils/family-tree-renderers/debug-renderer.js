import BaseRenderer from './base-renderer';

/**
 * DebugRenderer - Displays raw data structures as formatted JSON
 *
 * This renderer provides a way to inspect the graph data structures
 * produced by BaseRenderer.buildVisibleGraph(). It's useful for
 * debugging and understanding the data flow.
 */
export default class DebugRenderer extends BaseRenderer {
  getType() {
    return 'debug';
  }

  /**
   * Renders the family tree data as JSON for debugging
   * @param {RenderTree} renderTree - The RenderTree data from buildVisibleGraph
   * @param {Object} options - Rendering options
   * @returns {Object} Debug data structure
   */
  render(renderTree, options = {}) {
    return {
      type: 'debug',
      data: {
        renderTree: {
          focusPersonIndex: renderTree.focusPersonIndex,
          persons: renderTree.persons.map((p, idx) => ({
            index: idx,
            id: p.id,
            name: p.name,
            childIn: p.childIn,
            parentIn: p.parentIn,
          })),
          partnerships: renderTree.partnerships.map((p, idx) => ({
            index: idx,
            id: p.id,
            type: p.type,
            parents: p.parents,
            children: p.children,
            isExpanded: p.isExpanded,
          })),
        },
        options: options,
        metadata: {
          personCount: renderTree.persons.length,
          partnershipCount: renderTree.partnerships.length,
          expandedPartnerships: Array.from(this.expandedPartnerships),
          expandedPersons: Array.from(this.expandedPersons),
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Renders the debug data to a DOM element with copy functionality
   * @param {HTMLElement} element - Container element
   * @param {Object} debugData - Data from render()
   */
  renderToElement(element, debugData) {
    // Clear previous content
    element.innerHTML = '';

    if (!debugData.data) {
      element.innerHTML = '<div class="no-data">No debug data available</div>';
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.className = 'debug-renderer';
    container.style.cssText = `
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      max-height: 600px;
      overflow: auto;
      border: 1px solid #ddd;
      background: #f8f9fa;
      padding: 16px;
    `;

    // Create header with copy button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #dee2e6;
    `;

    const title = document.createElement('h4');
    title.textContent = 'Debug Data Structure';
    title.style.cssText = 'margin: 0; color: #495057;';

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy JSON';
    copyButton.style.cssText = `
      padding: 4px 12px;
      font-size: 11px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    const jsonString = JSON.stringify(debugData.data, null, 2);

    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(jsonString);
        copyButton.textContent = 'Copied!';
        copyButton.style.background = '#28a745';
        setTimeout(() => {
          copyButton.textContent = 'Copy JSON';
          copyButton.style.background = '#007bff';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        copyButton.textContent = 'Copy failed';
        copyButton.style.background = '#dc3545';
      }
    });

    header.appendChild(title);
    header.appendChild(copyButton);

    // Create JSON display
    const jsonDisplay = document.createElement('pre');
    jsonDisplay.style.cssText = `
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #212529;
      background: #ffffff;
      padding: 12px;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      overflow: auto;
    `;
    jsonDisplay.textContent = jsonString;

    container.appendChild(header);
    container.appendChild(jsonDisplay);
    element.appendChild(container);

    if (this.debug) {
      console.log('Debug renderer displayed data structure');
    }
  }
}
