import BaseRenderer from './base-renderer';

/**
 * HTML list-based family tree renderer.
 * Generates a simple nested list structure for debugging purposes.
 */
export default class HtmlListRenderer extends BaseRenderer {
  /**
   * Renders the family tree as nested HTML lists
   * @param {Object} graph - The graph with persons and partnerships arrays
   * @param {Object} options - Rendering options
   * @returns {Object} Object with HTML string and metadata
   */
  render(graph, options = {}) {
    const { persons, partnerships } = graph;
    const { startPersonIdx = 0 } = options;

    let html = '<div class="family-tree-debug">\n';
    html += '<h3>Family Tree Debug View</h3>\n';
    html += '<div class="debug-metadata">\n';
    html += `<p><strong>Persons:</strong> ${persons.length}</p>\n`;
    html += `<strong>Partnerships:</strong> ${partnerships.length}</p>\n`;
    html += '</div>\n';

    // Find root persons (those with no parent partnerships)
    const rootPersons = persons
      .map((p, idx) => ({ ...p, idx }))
      .filter((p) => p.parentIn.length === 0);

    if (rootPersons.length === 0) {
      html +=
        '<p class="debug-warning">No root persons found - there may be cycles in the data</p>\n';
      // Start from the initial person if no roots found
      html += this.renderPersonSubtree(
        startPersonIdx,
        persons,
        partnerships,
        new Set(),
      );
    } else {
      html += '<ul class="family-tree-list debug-tree">\n';
      rootPersons.forEach((rootPerson) => {
        html += this.renderPersonSubtree(
          rootPerson.idx,
          persons,
          partnerships,
          new Set(),
        );
      });
      html += '</ul>\n';
    }

    html += '</div>\n';

    return {
      type: 'html-list',
      html,
      graph,
    };
  }

  /**
   * Recursively render a person and their descendants
   * @param {number} personIdx - Index of the person to render
   * @param {Array} persons - All persons in the graph
   * @param {Array} partnerships - All partnerships in the graph
   * @param {Set} visited - Set of visited person indices to prevent cycles
   * @returns {string} HTML string for this subtree
   */
  renderPersonSubtree(personIdx, persons, partnerships, visited) {
    if (visited.has(personIdx)) {
      return `<li class="debug-cycle">⚠️ Cycle detected for person ${personIdx}</li>\n`;
    }

    visited.add(personIdx);
    const personNode = persons[personIdx];
    const person = personNode.person;

    let html = `<li class="debug-person" data-person-id="${person.id}">\n`;
    html += `  <div class="person-info">\n`;
    html += `    <span class="person-name">${this.escapeHtml(person.name)}</span>\n`;
    html += `    <span class="debug-index">[P${personIdx}]</span>\n`;
    if (person.comments) {
      html += `    <span class="person-comments">${this.escapeHtml(person.comments)}</span>\n`;
    }
    html += `  </div>\n`;

    // Show parent partnerships
    if (personNode.parentIn.length > 0) {
      html += '  <div class="debug-parent-info">Child in: ';
      html += personNode.parentIn
        .map((pIdx) => `Partnership ${pIdx}`)
        .join(', ');
      html += '</div>\n';
    }

    // Show partnerships where this person is a parent
    if (personNode.partnerships.length > 0) {
      html += '  <ul class="partnerships-list">\n';

      personNode.partnerships.forEach((partnershipIdx) => {
        const partnership = partnerships[partnershipIdx];
        const partnershipData = partnership.partnership;

        html += `    <li class="debug-partnership" data-partnership-id="${partnershipData.id}">\n`;
        html += `      <div class="partnership-info">\n`;

        // Show partners
        const partnerNames = partnership.parents
          .filter((pIdx) => pIdx !== personIdx) // Don't show current person
          .map((pIdx) => persons[pIdx].person.name);

        if (partnerNames.length > 0) {
          html += `        <span class="partners">Partners: ${partnerNames.join(', ')}</span>\n`;
        } else {
          html += `        <span class="partners">Single parent</span>\n`;
        }

        html += `        <span class="debug-index">[R${partnershipIdx}]</span>\n`;
        html += `        <span class="expansion-state">${partnership.expanded ? '(expanded)' : '(collapsed)'}</span>\n`;

        // Show child count
        const totalChildren = partnershipData.children.length;
        const visibleChildren = partnership.children.length;
        html += `        <span class="child-count">${visibleChildren}/${totalChildren} children</span>\n`;

        html += `      </div>\n`;

        // Show children if expanded or if they're already in the graph
        if (partnership.children.length > 0) {
          html += '      <ul class="children-list">\n';
          partnership.children.forEach((childIdx) => {
            // Create a new visited set for each child to allow showing the same person
            // in different parts of the tree
            const childVisited = new Set(visited);
            html += this.renderPersonSubtree(
              childIdx,
              persons,
              partnerships,
              childVisited,
            );
          });
          html += '      </ul>\n';
        }

        // Show hidden children if not expanded
        if (
          !partnership.expanded &&
          partnershipData.children.length > partnership.children.length
        ) {
          const hiddenCount =
            partnershipData.children.length - partnership.children.length;
          html += `      <div class="hidden-children">... ${hiddenCount} more children (collapsed)</div>\n`;
        }

        html += '    </li>\n';
      });

      html += '  </ul>\n';
    }

    html += '</li>\n';

    visited.delete(personIdx); // Remove from visited when backtracking
    return html;
  }

  /**
   * Render the HTML list into a DOM element
   * @param {HTMLElement} element - Target DOM element
   * @param {Object} renderData - Data from render() method
   * @param {Object} callbacks - Callback functions for interactions
   */
  renderToElement(element, renderData, callbacks = {}) {
    element.innerHTML = renderData.html;

    // Add click handlers for interactive elements
    if (callbacks.navigateToPerson) {
      element.querySelectorAll('[data-person-id]').forEach((personEl) => {
        const personId = personEl.dataset.personId;
        personEl.style.cursor = 'pointer';
        personEl.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacks.navigateToPerson(personId);
        });
      });
    }

    if (callbacks.togglePartnership) {
      element
        .querySelectorAll('[data-partnership-id]')
        .forEach((partnershipEl) => {
          const partnershipId = partnershipEl.dataset.partnershipId;
          const expansionEl = partnershipEl.querySelector('.expansion-state');
          if (expansionEl) {
            expansionEl.style.cursor = 'pointer';
            expansionEl.addEventListener('click', (e) => {
              e.stopPropagation();
              callbacks.togglePartnership(partnershipId);
            });
          }
        });
    }
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getType() {
    return 'html-list';
  }
}
