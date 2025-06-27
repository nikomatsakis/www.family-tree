import Component from '@glimmer/component';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';

export default class extends Component {
  @service router;

  <template>
    <LinkTo @route='index' @query={{this.query}} class={{@class}}>
      {{yield}}
    </LinkTo>
  </template>

  get query() {
    return {
      referencePersonId: this.args.referencePerson?.id ?? null,
    };
  }
}
