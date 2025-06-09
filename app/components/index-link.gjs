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
    const currentRenderer =
      this.router.currentRoute?.queryParams?.renderer || 'text';
    return {
      referencePersonId: this.args.referencePerson?.id ?? null,
      renderer: currentRenderer,
    };
  }
}
