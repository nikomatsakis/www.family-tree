import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/json-api/request';

export default class IndexRoute extends Route {
  @service genea;

  async model() {
    await this.genea.populate();
    return this.genea.roots();
  }
}
