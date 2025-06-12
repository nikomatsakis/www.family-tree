import Component from '@glimmer/component';
import { tracked, cached } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { modifier } from 'ember-modifier';
import { createRenderer } from '../utils/family-tree-renderers';

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
  @tracked userExpandedPartnerships = new Set(); // User's manual expansions/collapses
  @tracked userExpandedPersons = new Set(); // User's manual expansions/collapses

  constructor() {
    super(...arguments);
  }

  /**
   * Getter that returns the current renderer type.
   * Uses selectedRendererType if set, otherwise falls back to args.rendererType.
   * This allows the component to work both with internal state changes
   * and external prop changes from the parent.
   */
  get activeRendererType() {
    return this.selectedRendererType || this.args.rendererType || 'd3-tree';
  }

  /**
   * Reactive getter for expansion state that recomputes when person changes.
   * Integrates URL state, defaults, and user modifications.
   */
  @cached
  get expandedPartnerships() {
    if (!this.args.person) {
      return new Set();
    }

    // Parse URL query params
    const urlExpansions = this.parseQueryParams();
    
    if (urlExpansions.hasData) {
      // Use URL state (allows users to share/bookmark specific expansion states)
      return urlExpansions.expandedPartnerships;
    }

    // Start with defaults for current person
    const defaults = this.computeDefaultExpansions();
    const expansions = new Set(defaults.expandedPartnerships);

    // Apply user modifications (expansions/collapses)
    for (const partnershipId of this.userExpandedPartnerships) {
      if (expansions.has(partnershipId)) {
        expansions.delete(partnershipId); // User collapsed a default
      } else {
        expansions.add(partnershipId); // User expanded a non-default
      }
    }

    return expansions;
  }

  /**
   * Reactive getter for expanded persons that recomputes when person changes.
   */
  @cached
  get expandedPersons() {
    if (!this.args.person) {
      return new Set();
    }

    // Parse URL query params
    const urlExpansions = this.parseQueryParams();
    
    if (urlExpansions.hasData) {
      // Use URL state (allows users to share/bookmark specific expansion states)
      return urlExpansions.expandedPersons;
    }

    // Start with defaults for current person
    const defaults = this.computeDefaultExpansions();
    const expansions = new Set(defaults.expandedPersons);

    // Apply user modifications
    for (const personId of this.userExpandedPersons) {
      if (expansions.has(personId)) {
        expansions.delete(personId); // User collapsed a default
      } else {
        expansions.add(personId); // User expanded a non-default
      }
    }

    return expansions;
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
   * - this.args.person (from parent)
   * - this.currentRenderer (when renderer type changes)
   * - this.expandedPartnerships/expandedPersons (when user expands/collapses nodes)
   *
   * @cached prevents creating new objects on every template re-render,
   * which would cause unnecessary modifier re-runs.
   */
  @cached
  get computedTreeData() {
    const person = this.args.person;
    const pagePerson = this.args.pagePerson;
    const referencePerson = this.args.referencePerson;
    const renderer = this.currentRenderer;

    // Debug: log when tree data is recomputed  
    console.log('computedTreeData recomputing for person:', person?.name, 'ID:', person?.id);

    if (!renderer || !person) {
      return null;
    }

    // Build the graph structure using the current renderer
    const graph = renderer.buildVisibleGraph(person);

    // Convert graph to renderer-specific format (Mermaid code or HTML)
    const renderData = renderer.prepareRenderData(graph, {
      startPersonIdx: 0, // The starting person is always at index 0
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

    // 1. Expand focus person's own partnerships (to show their children)
    this.args.person.parentIn.forEach((partnership) => {
      expandedPartnerships.add(partnership.id);
    });

    // 2. Expand parent partnership that produced current person
    if (this.args.person.childIn) {
      expandedPartnerships.add(this.args.person.childIn.id);
    }

    // 3. Only show immediate family - stop at focus person's parents
    // (Removed ancestor chain walking to limit tree size)

    return { expandedPartnerships, expandedPersons };
  }

  @action
  togglePartnershipExpansion(partnershipId) {
    // Toggle in user modifications - this will cause expandedPartnerships getter to recompute
    if (this.userExpandedPartnerships.has(partnershipId)) {
      this.userExpandedPartnerships.delete(partnershipId);
    } else {
      this.userExpandedPartnerships.add(partnershipId);
    }
    // Create new Set to trigger tracked update and recompute cached getters
    this.userExpandedPartnerships = new Set(this.userExpandedPartnerships);
    this.updateURL();
  }

  @action
  togglePersonExpansion(personId) {
    // Toggle in user modifications - this will cause expandedPersons getter to recompute
    if (this.userExpandedPersons.has(personId)) {
      this.userExpandedPersons.delete(personId);
    } else {
      this.userExpandedPersons.add(personId);
    }
    // Create new Set to trigger tracked update and recompute cached getters
    this.userExpandedPersons = new Set(this.userExpandedPersons);
    this.updateURL();
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

  @action
  handleNodeClick(person) {
    if (this.args.onPersonClick) {
      this.args.onPersonClick(person);
    }
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
      togglePartnership: (partnershipId) => {
        this.togglePartnershipExpansion(partnershipId);
      },
      navigateToPerson: (personId) => {
        // Scroll to top before navigation
        window.scrollTo(0, 0);
        
        this.router.transitionTo('person', personId, {
          queryParams: {
            referencePersonId: this.args.referencePerson?.id,
            renderer: this.activeRendererType,
          },
        });
      },
    };

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
    <div class='family-tree-visual-container'>
      <div class='renderer-info' data-renderer-type={{this.rendererType}}>
        {{#if this.computedTreeData}}
          <div class='tree-container' {{this.renderTree}}>
            {{! Content will be rendered by the modifier }}
          </div>
        {{else}}
          <div class='loading'>Building family tree...</div>
        {{/if}}
      </div>
    </div>
  </template>
}
