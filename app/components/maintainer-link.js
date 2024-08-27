import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class MaintainerLink extends Component {
    @service genea;

    get maintainerLink() {
        console.log("maintainerLink", this.genea.roots().maintainerLink);
        return this.genea.roots().maintainerLink
            .replace("$ID", this.args.person.id)
            .replace("$NAME", this.args.person.name);
    }
}
