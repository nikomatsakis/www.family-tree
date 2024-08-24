import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/json-api/request';

export default class PeopleRoute extends Route {
  @service store;

  async model(params) {
    const { content } = await this.store.request(
      findRecord('person', params.id),
    );
    return content.data;
  }
}
