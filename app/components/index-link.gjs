import Component from '@glimmer/component';
import { LinkTo } from '@ember/routing';

export default class extends Component {
  <template>
    <LinkTo @route='index' @query={{this.query}}>
      {{yield}}
    </LinkTo>
  </template>

  get query() {
    return { referencePersonId: this.args.referencePerson?.id ?? null };
  }
}
