import Component from '@glimmer/component';
import awaitEach from './await-each';
import PersonLink from './person-link';
import PersonOutline from './person-outline';
import { service } from '@ember/service';

export default class extends Component {
  @service genea;

  <template>
    <h1>Family tree</h1>

    {{#if this.referencePerson}}
      Pick someone to see how
      <PersonLink @person={{this.referencePerson}} />
      is related to them...
    {{/if}}

    <ul>
      {{#awaitEach @rootPeople as |person|}}
        <PersonOutline
          @person={{person}}
          @referencePerson={{this.referencePerson}}
        />
      {{/awaitEach}}
    </ul>
  </template>

  get referencePerson() {
    if (!this.args.referencePersonId) return null;
    return this.genea.person(this.args.referencePersonId);
  }
}
