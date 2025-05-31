import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class MaintainerLink extends Component {
  @service genea;

  <template>
    {{#if this.maintainerLink}}
      <a
        target='_blank'
        href={{this.maintainerLink}}
        rel='noopener noreferrer'
        class={{@class}}
      >See a mistake? Suggest an edit!</a>
    {{/if}}
  </template>

  get maintainerLink() {
    console.log('maintainerLink', this.genea.roots().maintainerLink);
    return this.genea
      .roots()
      .maintainerLink.replace('$ID', encodeURIComponent(this.args.person.id))
      .replace('$NAME', encodeURIComponent(this.args.person.name))
      .replace(' ', '%20');
  }
}
