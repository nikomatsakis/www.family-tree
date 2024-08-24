import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class PersonModel extends Model {
  @attr('string') name;
  @attr('string') comments;
  @belongsTo('partnership', { async: true, inverse: 'children' }) childIn;
  @hasMany('partnership', { async: true, inverse: 'parents' }) parentIn;
}
