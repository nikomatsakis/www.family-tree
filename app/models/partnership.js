import Model, { hasMany } from '@ember-data/model';

export default class PartnershipModel extends Model {
  @hasMany('person', { async: true, inverse: 'parentIn' }) parents;
  @hasMany('person', { async: true, inverse: 'childIn' }) children;
}
