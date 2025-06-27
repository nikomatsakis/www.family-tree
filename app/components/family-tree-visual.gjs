import Component from '@glimmer/component';
import { tracked, cached } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { modifier } from 'ember-modifier';
import {
  createRenderer,
  DEFAULT_RENDERER_TYPE,
} from '../utils/family-tree-renderers';

/**
 * FamilyTreeVisual Component - Renders family trees using different visualization strategies
 *
 * ## Ember's Rendering Flow in this Component:
 *
 * 1. **Template References Trigger Getters**
 *    - When the template references {{this.computedTreeData}}, Ember calls the getter
 *    - Ember tracks that the template depends on this getter
 *    - If any @tracked properties the getter uses change, Ember re-renders
 *
 * 2. **The Modifier Does DOM Manipulation**
 *    - {{this.renderTree}} is a modifier that runs AFTER Ember creates the DOM element
 *    - It calls the renderer's renderToElement() method to manipulate the DOM
 *    - Modifiers re-run whenever the component re-renders
 *
 * 3. **Reactivity Chain**
 *    - User changes dropdown → updates @tracked selectedRendererType
 *    - currentRenderer getter sees the change → returns new renderer
 *    - computedTreeData getter sees renderer changed → computes new tree data
 *    - Template re-renders because computedTreeData changed
 *    - renderTree modifier runs again with new data
 *
 * This design leverages Ember's reactivity system to automatically update
 * the visualization when the renderer type changes, without manual checks
 * or side effects in getters.
 */
export default class FamilyTreeVisual extends Component {
  @service router;

  // Tracked properties that trigger re-renders when changed
  @tracked selectedRendererType = null;

  /**
   * Getter that returns the current renderer type.
   * Uses selectedRendererType if set, otherwise falls back to args.rendererType.
   * This allows the component to work both with internal state changes
   * and external prop changes from the parent.
   */
  get activeRendererType() {
    return (
      this.selectedRendererType ||
      this.args.rendererType ||
      DEFAULT_RENDERER_TYPE
    );
  }

  /**
   * Derived expansion state from URL params or defaults.
   * No stored state - always computed from current URL and person.
   */
  @cached
  get expandedPartnerships() {
    if (!this.args.pagePerson) {
      return new Set();
    }

    // Parse URL query params
    const urlExpansions = this.parseQueryParams();

    if (urlExpansions.hasData) {
      // Use URL state if present
      return new Set(urlExpansions.expandedPartnerships);
    } else {
      // Use defaults
      const defaults = this.computeDefaultExpansions();
      return new Set(defaults.expandedPartnerships);
    }
  }

  /**
   * Derived expanded persons state from URL params or defaults.
   */
  @cached
  get expandedPersons() {
    if (!this.args.pagePerson) {
      return new Set();
    }

    // Parse URL query params
    const urlExpansions = this.parseQueryParams();

    if (urlExpansions.hasData) {
      // Use URL state if present
      return new Set(urlExpansions.expandedPersons);
    } else {
      // Use defaults
      const defaults = this.computeDefaultExpansions();
      return new Set(defaults.expandedPersons);
    }
  }

  /**
   * Cached getter that creates a renderer instance.
   *
   * @cached ensures this only creates a new renderer when activeRendererType changes.
   * Without @cached, it would create a new renderer on every access, even if nothing changed.
   *
   * This getter is automatically called by computedTreeData when it needs the renderer.
   */
  @cached
  get currentRenderer() {
    const type = this.activeRendererType;

    return createRenderer(type, {
      expandedPartnerships: this.expandedPartnerships,
      expandedPersons: this.expandedPersons,
      debug: this.args.debug || false,
    });
  }

  /**
   * Cached getter that builds the complete tree data structure.
   *
   * This is called by the template when it renders {{#if this.computedTreeData}}.
   * It automatically re-runs when any of its dependencies change:
   * - this.args.pagePerson (from parent)
   * - this.args.referencePerson (from parent)
   * - this.currentRenderer (when renderer type changes)
   * - this.expandedPartnerships/expandedPersons (when user expands/collapses nodes)
   *
   * @cached prevents creating new objects on every template re-render,
   * which would cause unnecessary modifier re-runs.
   */
  @cached
  get computedTreeData() {
    const pagePerson = this.args.pagePerson;
    const referencePerson = this.args.referencePerson;
    const renderer = this.currentRenderer;

    // Debug: log when tree data is recomputed
    console.log(
      'computedTreeData recomputing for person:',
      pagePerson?.name,
      'ID:',
      pagePerson?.id,
    );

    if (!renderer || !pagePerson) {
      return null;
    }

    // Build the graph structure using the current renderer
    const graph = renderer.buildVisibleGraph(pagePerson);

    // Determine person styling based on context
    const personStyles = this.computePersonStyles(pagePerson, referencePerson);

    // Convert graph to renderer-specific format (Mermaid code or HTML)
    const renderData = renderer.prepareRenderData(graph, {
      startPersonIdx: 0, // The starting person is always at index 0
      personStyles: personStyles.personStyles,
      defaultStyle: personStyles.defaultStyle,
    });

    // Return complete data structure for rendering
    return {
      ...renderData,
      pagePerson,
      referencePerson,
      currentPersonIdx: 0,
      rendererType: renderer.getType(),
    };
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
      hasData: !!queryParams.expandedPartnerships || !!queryParams.expandedPersons,
      expandedPartnerships,
      expandedPersons,
    };
  }

  computeDefaultExpansions() {
    const expandedPartnerships = new Set();
    const expandedPersons = new Set();

    // Check if we're in relationship comparison mode and have a relationship object
    if (this.args.relationship) {
      // Extract partnerships from the relationship paths
      this.extractPartnershipIdsFromPath(
        this.args.relationship.thisPath,
        expandedPartnerships,
      );
      this.extractPartnershipIdsFromPath(
        this.args.relationship.thatPath,
        expandedPartnerships,
      );

      console.log(
        '🔗 Using relationship paths to expand partnerships:',
        Array.from(expandedPartnerships),
      );
    } else {
      // Normal mode: show immediate family around focus person
      // 1. Expand focus person's own partnerships (to show their children)
      this.args.pagePerson.parentIn.forEach((partnership) => {
        expandedPartnerships.add(partnership.id);
      });

      // 2. Expand parent partnership that produced current person
      if (this.args.pagePerson.childIn) {
        expandedPartnerships.add(this.args.pagePerson.childIn.id);
      }

      // 3. Only show immediate family - stop at focus person's parents
      // (Removed ancestor chain walking to limit tree size)
    }

    return { expandedPartnerships, expandedPersons };
  }

  /**
   * Extract partnership IDs from a single relationship path.
   * Each link in the path represents a step between people that requires a partnership to be visible.
   */
  extractPartnershipIdsFromPath(path, partnershipIds) {
    for (const link of path.links) {
      let partnershipId = null;

      if (link.relation === 'parent' || link.relation === 'child') {
        // For parent/child relationships, find the partnership that connects them
        // The child's childIn partnership should connect to the parent
        if (link.relation === 'parent') {
          // Going from child to parent - child's childIn partnership
          partnershipId = link.fromPerson.childIn?.id;
        } else {
          // Going from parent to child - child's childIn partnership
          partnershipId = link.toPerson.childIn?.id;
        }
      } else if (link.relation === 'partner') {
        // For partner relationships, find the partnership where both are parents
        partnershipId = this.findPartnershipBetween(
          link.fromPerson,
          link.toPerson,
        );
      }

      if (partnershipId) {
        partnershipIds.add(partnershipId);
        console.log(
          `  📎 Added partnership ${partnershipId} for ${link.relation} link: ${link.fromPerson.name} → ${link.toPerson.name}`,
        );
      }
    }
  }

  /**
   * Find the partnership ID where two people are both parents.
   */
  findPartnershipBetween(person1, person2) {
    // Look through person1's partnerships to find one where person2 is also a parent
    for (const partnership of person1.parentIn) {
      const partnerIds = partnership.parents.map((p) => p.id);
      if (partnerIds.includes(person2.id)) {
        return partnership.id;
      }
    }
    return null;
  }

  @action
  togglePartnershipExpansion(partnershipId) {
    console.log('🌀 togglePartnershipExpansion called', {
      partnershipId,
      currentExpanded: Array.from(this.expandedPartnerships),
      hasPartnership: this.expandedPartnerships.has(partnershipId),
    });

    // Create new state by toggling the partnership
    const newExpanded = new Set(this.expandedPartnerships);
    if (newExpanded.has(partnershipId)) {
      newExpanded.delete(partnershipId);
    } else {
      newExpanded.add(partnershipId);
    }

    console.log('🌆 After toggle', {
      newExpanded: Array.from(newExpanded),
      willUpdateURL: true,
    });

    // Update URL with new state - this will trigger getter recomputation
    this.updateURLWithState(newExpanded, this.expandedPersons);
  }

  @action
  togglePersonExpansion(personId) {
    // Create new state by toggling the person
    const newExpanded = new Set(this.expandedPersons);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
    }

    // Update URL with new state - this will trigger getter recomputation
    this.updateURLWithState(this.expandedPartnerships, newExpanded);
  }

  /**
   * Action called when the renderer type dropdown changes.
   * Updates the tracked property which triggers the reactive chain.
   */
  @action
  onRendererTypeChange(newType) {
    this.selectedRendererType = newType;
    // No need to manually update anything - the cached getters will recompute!
  }

  @action
  updateURLWithState(expandedPartnerships, expandedPersons) {
    // Check if current state matches defaults
    const defaults = this.computeDefaultExpansions();
    const defaultPartnerships = defaults.expandedPartnerships;
    const defaultPersons = defaults.expandedPersons;

    // Compare sets - only include in URL if different from defaults
    const partnershipsMatchDefaults =
      expandedPartnerships.size === defaultPartnerships.size &&
      [...expandedPartnerships].every((id) => defaultPartnerships.has(id));

    const personsMatchDefaults =
      expandedPersons.size === defaultPersons.size &&
      [...expandedPersons].every((id) => defaultPersons.has(id));

    const expandedPartnershipsStr = partnershipsMatchDefaults
      ? undefined
      : Array.from(expandedPartnerships).join(',') || undefined;

    const expandedPersonsStr = personsMatchDefaults
      ? undefined
      : Array.from(expandedPersons).join(',') || undefined;

    // Get current query params to preserve renderer setting
    const currentQueryParams = this.router.currentRoute?.queryParams || {};

    this.router.replaceWith('person', this.args.pagePerson.id, {
      queryParams: {
        renderer: currentQueryParams.renderer || this.activeRendererType,
        expandedPartnerships: expandedPartnershipsStr,
        expandedPersons: expandedPersonsStr,
        referencePersonId: this.args.referencePerson?.id,
      },
    });
  }

  @action
  handleNodeClick(person) {
    if (this.args.onPersonClick) {
      this.args.onPersonClick(person);
    }
  }

  computePersonStyles(pagePerson, referencePerson) {
    const personStyles = {};
    let defaultStyle = 'normal';

    // If we have both a page person and reference person, we're in comparison mode
    if (pagePerson && referencePerson && pagePerson.id !== referencePerson.id) {
      // Comparison mode: highlight the two people being compared, grey out others
      personStyles[pagePerson.id] = 'highlight-focus';
      personStyles[referencePerson.id] = 'highlight-reference';
      defaultStyle = 'greyed-out';
    } else if (pagePerson) {
      // Normal mode: just highlight the page person
      personStyles[pagePerson.id] = 'highlight-focus';
      defaultStyle = 'normal';
    }

    return { personStyles, defaultStyle };
  }

  /**
   * Modifier that handles the actual DOM manipulation.
   * Runs after Ember creates the DOM element and re-runs on re-renders.
   * Uses the computedTreeData getter to get the current tree data.
   */
  renderTree = modifier((element) => {
    const treeData = this.computedTreeData;
    const renderer = this.currentRenderer;

    if (!treeData || !renderer) {
      element.innerHTML = '<div class="loading">Building family tree...</div>';
      return;
    }

    const callbacks = {
      togglePartnershipExpansion: (partnershipId) => {
        console.log('👉 Callback wrapper called with:', partnershipId);
        this.togglePartnershipExpansion(partnershipId);
      },
      navigateToPerson: (personId) => {
        // Scroll to top before navigation
        window.scrollTo(0, 0);

        this.router.transitionTo('person', personId, {
          queryParams: {
            referencePersonId: null,
            renderer: this.activeRendererType,
          },
        });
      },
    };

    console.log('🎨 renderTree modifier running', {
      hasRenderer: !!renderer,
      rendererType: renderer?.getType(),
      expandedPartnerships: Array.from(this.expandedPartnerships),
      timestamp: new Date().toISOString(),
    });

    try {
      if (renderer.renderToElement) {
        renderer.renderToElement(element, treeData, callbacks);
      } else {
        // Fallback for renderers that don't implement renderToElement
        console.warn('Renderer does not implement renderToElement method');
        element.innerHTML = '<div class="error">Renderer error</div>';
      }
    } catch (error) {
      console.error('Error rendering family tree:', error);
      element.innerHTML =
        '<div class="error">Error rendering family tree</div>';
    }
  });

  get rendererType() {
    return this.currentRenderer?.getType() || 'unknown';
  }

  <template>
    {{#if this.computedTreeData}}
      <div class='family-tree-visual-container' {{this.renderTree}}>
        {{! Content will be rendered by the modifier }}
      </div>
    {{else}}
      <div class='family-tree-visual-container'>
        <div class='loading'>Building family tree...</div>
      </div>
    {{/if}}
  </template>
}
