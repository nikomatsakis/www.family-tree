import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class CurrentReferencePersonComponent extends Component {
    @service referencePerson;

    get pagePersonisReferencePerson() {
        return this.referencePerson.current === this.args.pagePerson;
    }
}
