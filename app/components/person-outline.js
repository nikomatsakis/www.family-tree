import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class PersonOutlineComponent extends Component {
    @service genea;

    get isSingle() {
        return this.args.person.parentIn.length === 0;
    }

    get partnerships() {
        return this.args.person.parentIn.map(partnership => ({
            partner: partnership.partnerTo(this.args.person),
            children: partnership.children
        }));
    }
}
