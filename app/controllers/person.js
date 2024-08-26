import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class PersonController extends Controller {
    queryParams = ['referencePersonId'];

    @service genea;
    @tracked referencePersonId = null;

    get isReferencePerson() {
        return this.referencePerson === this.model;
    }

    get referencePerson() {
        if (this.referencePersonId)
            return this.genea.person(this.referencePersonId);
        else
            return null;
    }

    get commonAncestralPartnerships() {
        if (this.referencePerson)
            return this.model.commonAncestralPartnershipsWith(this.referencePerson);
        else
            return [];
    }

    get ancestors() {
        if (this.referencePerson) {
            let result = this.model.allAncestors().union(this.referencePerson.allAncestors());
            result.add(this.model);
            result.add(this.referencePerson);
            return result;
        } else {
            return null;
        }
    }
}
