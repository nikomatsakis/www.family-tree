import { service } from '@ember/service';
import IndexLink from './index-link';
import MaintainerLink from './maintainer-link';
import UnifiedSearch from './unified-search';
import FamilyTreeVisual from './family-tree-visual';
import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class Person extends Component {
  @service genea;
  @service router;

  <template>
    <button
      type='button'
      class='floating-search-button'
      {{on 'click' this.navigateToSearch}}
      title='Search for someone'
    >
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-linecap='round'
        stroke-linejoin='round'
      >
        <circle cx='11' cy='11' r='8'></circle>
        <path d='m21 21-4.35-4.35'></path>
      </svg>
    </button>

    <div class='person-detail'>
      <div class='person-header'>
        <h1 class='person-name'>{{@model.name}}</h1>
        {{#if @model.comments}}
          <p class='person-comments'>
            {{@model.comments}}
          </p>
        {{/if}}
      </div>

      {{#if this.showSiblings}}
        <div class='family-section'>
          <h2>Parents, partners, and children</h2>

          <div class='relationship-search'>
            <UnifiedSearch
              @placeholder='See how {{@model.name}} is related to...'
              @onSelectPerson={{this.selectPersonForComparison}}
              @excludePerson={{@model}}
              @inputClass='relationship-search-input'
              @inputId='relationship-search'
            />
          </div>

          {{#if this.referencePerson}}
            <div class='relationship-display'>
              {{#if this.selectedRelationships.length}}
                {{#each this.selectedRelationships as |r|}}
                  <div class='relationship-info'>
                    <span>{{this.relationshipSentence r}}</span>
                    <button
                      type='button'
                      class='clear-comparison'
                      {{on 'click' this.clearComparison}}
                    >
                      Clear comparison
                    </button>
                  </div>
                  <FamilyTreeVisual
                    @relationship={{r}}
                    @pagePerson={{@model}}
                    @referencePerson={{this.referencePerson}}
                    @onPersonClick={{this.navigateToPerson}}
                  />
                {{/each}}
              {{else}}
                <div class='no-relation'>
                  No relation found between
                  {{@model.name}}
                  and
                  {{this.referencePerson.name}}!
                </div>
              {{/if}}

            </div>
          {{else}}
            {{#if @model}}
              <FamilyTreeVisual
                @pagePerson={{@model}}
                @onPersonClick={{this.navigateToPerson}}
                @rendererType={{this.rendererType}}
              />
            {{else}}
              <div>Loading person data...</div>
            {{/if}}
          {{/if}}
        </div>
      {{/if}}

      <hr class='section-divider' />

      <div class='navigation-section'>
        <div class='nav-links'>
          <MaintainerLink @person={{@model}} class='edit-link' />
          {{#if this.isNonDefaultRenderer}}
            <button
              type='button'
              class='nav-link renderer-switch'
              {{on 'click' this.returnToDefaultRenderer}}
            >
              Return to default view
            </button>
          {{/if}}
          <IndexLink @referencePerson={{this.referencePerson}} class='nav-link'>
            Return to the root listing
            {{#if this.referencePerson}}for {{this.referencePerson.name}}{{/if}}
          </IndexLink>
        </div>
      </div>
    </div>
  </template>

  relationshipSentence = (r) => r.sentence;

  get showSiblings() {
    return true; // Always show the new search interface
  }

  get selectedRelationships() {
    if (this.referencePerson) {
      return this.args.model.relationshipsTo(this.referencePerson);
    }
    return [];
  }

  @action
  selectPersonForComparison(person) {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: person.id,
        renderer: this.rendererType,
        // Clear expanded partnerships to use relationship-specific defaults
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  @action
  clearComparison() {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: null,
        renderer: this.rendererType,
        // Clear expanded partnerships to return to normal defaults
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  get referencePerson() {
    if (this.args.reference.getId())
      return this.genea.person(this.args.reference.getId());
    else return null;
  }

  get notRelated() {
    return this.relationships.length === 0;
  }

  get relationships() {
    if (this.referencePerson)
      return this.args.model.relationshipsTo(this.referencePerson);
    else return [];
  }

  get ancestors() {
    if (this.referencePerson) {
      const modelAncestors = this.args.model.allAncestors();
      const refPersonAncestors = this.referencePerson.allAncestors();
      return new Set([...modelAncestors, ...refPersonAncestors]);
    } else {
      return null;
    }
  }

  generationsFrom = (person, partnership) =>
    person.generationsFromAncestralPartnership(partnership);

  get rendererType() {
    return this.args.renderer || DEFAULT_RENDERER_TYPE;
  }

  get isNonDefaultRenderer() {
    return this.rendererType !== DEFAULT_RENDERER_TYPE;
  }

  @action
  navigateToSearch() {
    this.router.transitionTo('index');
  }

  @action
  returnToDefaultRenderer() {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: this.referencePerson?.id,
        renderer: null, // Clear renderer to use default
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  @action
  navigateToPerson(person) {
    this.router.transitionTo('person', person, {
      queryParams: {
        referencePersonId: null,
        renderer: this.rendererType,
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }
}
