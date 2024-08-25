import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/json-api/request';

export default class PeopleRoute extends Route {
  @service genea;

  async model(params) {
    await this.genea.populate();
    return this.genea.person(params.id);
  }
}
