import { service } from '@ember/service';
import IndexLink from './index-link';
import MaintainerLink from './maintainer-link';
import { LinkTo } from '@ember/routing';
import PersonLink from './person-link';
import PersonSearch from './person-search';
import FamilyTreeVisual from './family-tree-visual';
import { hash } from '@ember/helper';
import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class Person extends Component {
  @service genea;
  @service router;

  <template>
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
            <PersonSearch
              @label='See how {{@model.name}} is related to:'
              @placeholder='Search for someone...'
              @onSelectPerson={{this.selectPersonForComparison}}
              @excludePerson={{@model}}
              @showDetails={{true}}
              @inputClass='relationship-search-input'
              @inputId='relationship-search'
            />
          </div>

          {{#if this.referencePerson}}
            <div class='relationship-display'>
              <h3>
                {{@model.name}}
                and
                {{this.referencePerson.name}}
                relationship:
              </h3>

              {{#if this.selectedRelationships.length}}
                {{#each this.selectedRelationships as |r|}}
                  <div class='relationship-info'>
                    {{@model.name}}
                    is
                    {{this.referencePerson.name}}'s
                    <a
                      href='/family-tree-explainer.png'
                      target='_blank'
                      rel='noopener noreferrer'
                      class='relationship-link'
                    ><strong>{{this.relationshipName r}}</strong></a>
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
          <IndexLink @referencePerson={{this.referencePerson}} class='nav-link'>
            Return to the root listing
            {{#if this.referencePerson}}for {{this.referencePerson.name}}{{/if}}
          </IndexLink>
        </div>
      </div>
    </div>
  </template>

  relationshipName = (r) => r.name;

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
    return this.args.renderer || 'd3-tree';
  }

  @action
  navigateToPerson(person) {
    this.router.transitionTo('person', person, {
      queryParams: { 
        referencePersonId: null,
        renderer: this.rendererType 
      },
    });
  }
}
