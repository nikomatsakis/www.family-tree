import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class PersonOutlineComponent extends Component {
    @service genea;

    get outline() {
        const { id } = this.args;
        const person = this.genea.person(id);
        const partnerships = person.parentIn;
        if (partnerships.length !== 0) {
            return partnerships.map(partnership => {
                const partner = partnership.partnerTo(person);
                if (partner) {
                    return {
                        names: `${person.name} + ${partner.name}`,
                        children: partnership.children
                    };
                } else {
                    return {
                        names: `${person.name}`,
                        children: partnership.children
                    }
                }
            });
        } else {
            return [
                { names: `${person.name}`, children: [] }
            ];
        }
    }
}
