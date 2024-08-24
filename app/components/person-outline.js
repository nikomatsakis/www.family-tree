import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class PersonOutlineComponent extends Component {
    @service store;

    get outline() {
        return (async () => {
            let { id } = this.args;
            const person = await this.store.findRecord('person', id);
            return person.name;
        })();
    }
}
