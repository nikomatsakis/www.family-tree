import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class IndexRoute extends Route {
  @service genea;

  async model() {
    await this.genea.populate();
    return this.genea.roots();
  }
}
