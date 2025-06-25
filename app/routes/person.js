import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class PersonRoute extends Route {
  @service genea;

  model(params) {
    // Data should already be loaded by application route
    return this.genea.person(params.id);
  }
}
