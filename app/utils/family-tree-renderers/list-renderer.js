import BaseRenderer from './base-renderer';

/**
 * ListRenderer - Renders family trees as hierarchical HTML lists
 *
 * This renderer creates the same list-based view that was previously
 * handled directly in the Person component template. It shows family
 * relationships as nested <ul> lists with person links and partnership
 * separators.
 */
export default class ListRenderer extends BaseRenderer {
  getType() {
    return 'list';
  }

  /**
   * Renders the family tree as an HTML list structure
   * @param {Object} graph - The graph data from buildVisibleGraph
   * @param {Object} options - Rendering options
   * @returns {Object} Rendered HTML and metadata
   */
  render(graph, options = {}) {
    const { persons } = graph;
    const startPersonIdx = options.startPersonIdx || 0;

    if (persons.length === 0) {
      return {
        html: '<div class="no-data">No family data available</div>',
        type: 'list',
      };
    }

    const startPerson = persons[startPersonIdx];
    let html = '';

    // If the person has parents, show them first (like the "Child" template)
    if (startPerson.parentIn.length > 0) {
      html = this.renderAsChild(graph, startPersonIdx);
    } else {
      // Otherwise show the person and their descendants
      html = `<ul class="family-tree-list">${this.renderPersonOutline(graph, startPersonIdx)}</ul>`;
    }

    return {
      html,
      type: 'list',
    };
  }

  /**
   * Renders a person as a child (showing their parents first)
   * This replicates the "Child" component logic from person.gjs
   */
  renderAsChild(graph, personIdx) {
    const { persons, partnerships } = graph;
    const person = persons[personIdx];

    if (person.parentIn.length === 0) {
      return `<ul class="family-tree-list">${this.renderPersonOutline(graph, personIdx)}</ul>`;
    }

    const parentPartnership = partnerships[person.parentIn[0]];
    const parents = parentPartnership.parents.map((idx) => persons[idx]);

    let html = '<ul class="family-tree-list"><li>';

    // Render parents
    html += this.renderPersonLink(parents[0].person, 'parent');
    for (let i = 1; i < parents.length; i++) {
      html += '<span class="partnership-separator">+</span>';
      html += this.renderPersonLink(parents[i].person, 'parent');
    }

    // Render the current person
    html += `<ul>${this.renderPersonOutline(graph, personIdx)}</ul>`;
    html += '</li></ul>';

    return html;
  }

  /**
   * Renders a person outline with their partnerships and children
   * This replicates the PersonOutline component logic
   */
  renderPersonOutline(graph, personIdx) {
    const { persons, partnerships } = graph;
    const person = persons[personIdx];

    if (person.partnerships.length === 0) {
      // Person with no partnerships - just show the link
      return `<li>${this.renderPersonLink(person.person, 'person')}</li>`;
    }

    let html = '';

    // Render each partnership
    person.partnerships.forEach((partnershipIdx, index) => {
      const partnership = partnerships[partnershipIdx];
      const partnerIdx = partnership.parents.find((idx) => idx !== personIdx);
      const partner = partnerIdx !== undefined ? persons[partnerIdx] : null;

      html += '<li>';

      if (index === 0) {
        // First partnership - show the main person
        html += this.renderPersonLink(person.person, 'person');
      } else {
        // Subsequent partnerships - show ellipsis
        html += '...';
      }

      if (partner) {
        html += '<span class="partnership-separator">+</span>';
        html += this.renderPersonLink(partner.person, 'partner');
      }

      // Render children if partnership is expanded
      if (partnership.expanded && partnership.children.length > 0) {
        html += '<ul>';
        partnership.children.forEach((childIdx) => {
          html += this.renderPersonOutline(graph, childIdx);
        });
        html += '</ul>';
      } else if (partnership.children.length > 0) {
        // Show collapsed indicator
        html += '<ul><li>...</li></ul>';
      }

      html += '</li>';
    });

    return html;
  }

  /**
   * Renders a person link with appropriate CSS classes and navigation
   */
  renderPersonLink(person, relationship = 'person') {
    const classes = `person-link ${relationship}-link`;
    return `<a href="/person/${person.id}" class="${classes}" data-person-id="${person.id}">${this.escapeHtml(person.name)}</a>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Renders the tree to a DOM element with click handlers
   */
  renderToElement(element, treeData, callbacks = {}) {
    element.innerHTML = treeData.html;

    // Add click handlers for person links
    const personLinks = element.querySelectorAll(
      '.person-link[data-person-id]',
    );
    personLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const personId = link.getAttribute('data-person-id');
        if (callbacks.navigateToPerson) {
          callbacks.navigateToPerson(personId);
        }
      });
    });

    // Add click handlers for expand/collapse (if we add that functionality later)
    const expandButtons = element.querySelectorAll('.expand-toggle');
    expandButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const partnershipId = button.getAttribute('data-partnership-id');
        if (callbacks.togglePartnership) {
          callbacks.togglePartnership(partnershipId);
        }
      });
    });
  }
}
