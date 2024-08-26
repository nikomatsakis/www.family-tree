import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class IndexController extends Controller {
    queryParams = ['referencePersonId'];

    @service genea;
    referencePersonId = null;

    get referencePerson() {
        if (this.referencePersonId)
            return this.genea.person(this.referencePersonId);
        else
            return null;
    }
}
