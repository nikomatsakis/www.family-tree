import { action } from '@ember/object';
import { service } from '@ember/service';
import IndexLink from './index-link';
import { LinkTo } from '@ember/routing';
import PersonLink from './person-link';
import PersonOutline from './person-outline';
import { on } from '@ember/modifier';
import { hash } from '@ember/helper';

import Component from '@glimmer/component';

export default class Person extends Component {
  @service genea;

  <template>
    <h1>{{@model.name}}</h1>

    <p>
      {{@model.comments}}
    </p>

    <hr />
    {{#if this.showSiblings}}
      <h2>Parents, partners, and children</h2>
      <IndexLink @referencePerson={{@model}}>See how
        {{@model.name}}
        is related to other people.</IndexLink>

      {{#if @model.childIn}}
        <Child @model={{@model}} @referencePerson={{this.referencePerson}} />
      {{else}}
        <ul>
          <PersonOutline
            @person={{@model}}
            @pagePerson={{@model}}
            @referencePerson={{this.referencePerson}}
          />
        </ul>
      {{/if}}
    {{else if this.referencePerson}}
      <h2>How is
        <PersonLink @person={{this.referencePerson}} />
        related to
        {{@model.name}}?
      </h2>

      <LinkTo @query={{hash referencePersonId=null}}>(clear)</LinkTo>

      <ul>
        {{#each this.commonAncestralPartnerships as |p|}}
          <PersonOutline
            @person={{p.firstParent}}
            @pagePerson={{@model}}
            @referencePerson={{this.referencePerson}}
            @includeSet={{this.ancestors}}
          />
        {{/each}}
      </ul>
    {{/if}}

    <hr />
    <IndexLink @referencePerson={{this.referencePerson}}>
      Return to the root listing
      {{#if this.referencePerson}}for {{this.referencePerson.name}}{{/if}}
    </IndexLink>
  </template>

  get showSiblings() {
    return (
      this.referencePerson === null || this.referencePerson === this.args.model
    );
  }

  @action
  clearReferencePerson() {
    this.args.reference.setId(null);
  }

  get referencePerson() {
    if (this.args.reference.getId())
      return this.genea.person(this.args.reference.getId());
    else return null;
  }

  get commonAncestralPartnerships() {
    if (this.referencePerson)
      return this.args.model.commonAncestralPartnershipsWith(
        this.referencePerson,
      );
    else return [];
  }

  get ancestors() {
    if (this.referencePerson) {
      let result = this.args.model
        .allAncestors()
        .union(this.referencePerson.allAncestors());
      result.add(this.args.model);
      result.add(this.referencePerson);
      return result;
    } else {
      return null;
    }
  }
}

const Child = <template>
  <ul>
    <PersonLink
      @person={{@model.childIn.firstParent}}
      @pagePerson={{@model}}
      @referencePerson={{@referencePerson}}
    />
    {{#each @model.childIn.nextParents as |parent|}}
      +
      <PersonLink
        @person={{parent}}
        @pagePerson={{@model}}
        @referencePerson={{@referencePerson}}
      />
    {{/each}}
    <ul>
      <PersonOutline
        @person={{@model}}
        @pagePerson={{@model}}
        @referencePerson={{@referencePerson}}
      />
    </ul>
  </ul>
</template>;
