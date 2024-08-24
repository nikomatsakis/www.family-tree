import Model, { hasMany } from '@ember-data/model';

export default class RootModel extends Model {
  @hasMany('person', { async: true, inverse: null }) rootPeople;
}
