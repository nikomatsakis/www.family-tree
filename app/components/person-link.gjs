import Component from '@glimmer/component';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class PersonLinkComponent extends Component {
  @service router;

  <template>
    {{#if this.isPagePerson}}
      <b>{{@person.name}}</b>
    {{else if this.boldReferencePerson}}
      <b>{{@person.name}}</b>
    {{else if @referencePerson}}
      <LinkTo
        @route='person'
        @model={{@person}}
        @query={{this.queryParamsWithReference}}
        class='person-link'
      >
        {{@person.name}}
      </LinkTo>
    {{else}}
      <LinkTo
        @route='person'
        @model={{@person}}
        @query={{this.queryParams}}
        class='person-link'
      >
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

  get currentRenderer() {
    // Get renderer from current route's query params
    return (
      this.router.currentRoute?.queryParams?.renderer || DEFAULT_RENDERER_TYPE
    );
  }

  get queryParams() {
    return {
      renderer: this.currentRenderer,
    };
  }

  get queryParamsWithReference() {
    return {
      referencePersonId: this.args.referencePerson.id,
      renderer: this.currentRenderer,
    };
  }
}
