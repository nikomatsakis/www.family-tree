import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class PersonOutlineComponent extends Component {
    @service genea;

    get zeroPartnerships() {
        return this.args.person.parentIn.length === 0;
    }

    get firstPartnership() {
        return this.partnerships[0];
    }

    get nextPartnerships() {
        return this.partnerships.slice(1);
    }

    get partnerships() {
        let parentIn = this.args.person.parentIn;

        if (this.args.includeSet) {
            parentIn = parentIn.filter(p => p.parentSet.isSubsetOf(this.args.includeSet));
        }

        return parentIn.map(partnership => ({
            partner: partnership.partnerTo(this.args.person),
            children: partnership.children
        }));

    }
}
