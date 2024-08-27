import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class PersonRoute extends Route {
  @service genea;

  async model(params) {
    await this.genea.populate();
    return this.genea.person(params.id);
  }
}
