import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AllRoute extends Route {
  @service genea;

  model() {
    // Data should already be loaded by application route
    return this.genea.roots();
  }
}
