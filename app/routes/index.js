import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { query } from '@ember-data/json-api/request';

export default class IndexRoute extends Route {
  @service store;

  async model() {
    // let response = await fetch('/api/v1/roots.json');
    // let parsed = await response.json();
    // let result = {
    //     rootPeople: parsed.data.relationships.rootPeople
    // };
    // console.log('parsed = ', JSON.stringify(parsed), JSON.stringify(result));
    // return result;

    const { content } = await this.store.request(query('root'));
    console.log('content.data', content.data);
    console.log('content.data.rootPerson', content.data.rootPeople);
    return content.data;
  }
}
