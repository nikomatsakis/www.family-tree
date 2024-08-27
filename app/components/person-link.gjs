import Component from '@glimmer/component';
import { LinkTo } from '@ember/routing';
import { hash } from '@ember/helper';

export default class PersonLinkComponent extends Component {
  <template>
    {{#if this.isPagePerson}}
      <b>{{@person.name}}</b>
    {{else if this.boldReferencePerson}}
      <b>{{@person.name}}</b>
    {{else if @referencePerson}}
      <LinkTo
        @route='person'
        @model={{@person}}
        @query={{hash referencePersonId=@referencePerson.id}}
      >
        {{@person.name}}
      </LinkTo>
    {{else}}
      <LinkTo @route='person' @model={{@person}}>
        {{@person.name}}
      </LinkTo>
    {{/if}}
  </template>

  get isPagePerson() {
    return this.args.person === this.args.pagePerson;
  }

  get boldReferencePerson() {
    return (
      this.args.pagePerson && this.args.person === this.args.referencePerson
    );
  }
}
