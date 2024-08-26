import Component from '@glimmer/component';

export default class PersonLinkComponent extends Component {
    get isPagePerson() {
        return this.args.person === this.args.pagePerson;
    }

    get boldReferencePerson() {
        return this.args.pagePerson && this.args.person === this.args.referencePerson;
    }
}
