import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class MakeReferencePersonComponent extends Component {
    @service referencePerson;

    @action
    makeReference() {
        this.referencePerson.current = this.args.person;
    }
}
