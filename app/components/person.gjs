import { service } from '@ember/service';
import IndexLink from './index-link';
import MaintainerLink from './maintainer-link';
import { LinkTo } from '@ember/routing';
import PersonLink from './person-link';
import FamilyTreeVisual from './family-tree-visual';
import { hash } from '@ember/helper';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import {
  getAvailableRenderers,
  getRendererDisplayNames,
} from '../utils/family-tree-renderers';

export default class Person extends Component {
  @service genea;
  @service router;
  @tracked rendererType = 'mermaid';

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
          <div class='relationship-info'>
            <IndexLink @referencePerson={{@model}} class='nav-link'>
              See how
              {{@model.name}}
              is related to other people
            </IndexLink>

            <div class='renderer-controls'>
              <label for='renderer-select'>View:</label>
              <select
                id='renderer-select'
                {{on 'change' this.changeRenderer}}
                class='renderer-select'
              >
                {{#each this.availableRenderers as |rendererType|}}
                  <option
                    value={{rendererType}}
                    selected={{this.isSelectedRenderer rendererType}}
                  >
                    {{this.getRendererDisplayName rendererType}}
                  </option>
                {{/each}}
              </select>
            </div>
          </div>

          {{#if @model}}
            <FamilyTreeVisual
              @person={{@model}}
              @pagePerson={{@model}}
              @referencePerson={{this.referencePerson}}
              @onPersonClick={{this.navigateToPerson}}
              @rendererType={{this.rendererType}}
            />
          {{else}}
            <div>Loading person data...</div>
          {{/if}}
        </div>
      {{else if this.referencePerson}}
        <div class='family-section'>
          <h2>How is
            <PersonLink @person={{this.referencePerson}} />
            related to
            {{@model.name}}?
          </h2>

          <div class='relationship-actions'>
            <LinkTo @query={{hash referencePersonId=null}} class='nav-link'>
              Stop comparing relationships
            </LinkTo>
            <LinkTo
              @model={{this.referencePerson}}
              @query={{hash referencePersonId=@model.id}}
              class='nav-link'
            >
              Switch comparison
            </LinkTo>
          </div>

          {{#if this.notRelated}}
            <div class='no-relation'>
              No relation found!
            </div>
          {{/if}}

          {{#each this.relationships as |r|}}
            <div class='relationship-info'>
              {{@model.name}}
              is
              {{this.referencePerson.name}}'s
              <strong>{{this.relationshipName r}}</strong>
              <a
                href='/family-tree-explainer.png'
                target='_blank'
                rel='noopener noreferrer'
                class='explain-link'
              >(explain)</a>
            </div>
            <FamilyTreeVisual
              @person={{r.commonAncestor}}
              @pagePerson={{@model}}
              @referencePerson={{this.referencePerson}}
              @onPersonClick={{this.navigateToPerson}}
              @rendererType='list'
            />
          {{/each}}
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
    return (
      this.referencePerson === null || this.referencePerson === this.args.model
    );
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

  get availableRenderers() {
    return getAvailableRenderers();
  }

  @action
  navigateToPerson(person) {
    if (this.referencePerson) {
      this.router.transitionTo('person', person, {
        queryParams: { referencePersonId: this.referencePerson.id },
      });
    } else {
      this.router.transitionTo('person', person);
    }
  }

  @action
  changeRenderer(event) {
    this.rendererType = event.target.value;
  }

  getRendererDisplayName = (type) => {
    const displayNames = getRendererDisplayNames();
    return displayNames[type] || type;
  };

  isSelectedRenderer = (type) => {
    return this.rendererType === type;
  };
}
