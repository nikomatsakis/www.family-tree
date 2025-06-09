import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class PersonController extends Controller {
  @tracked referencePersonId = null;
  @tracked renderer = 'text';
  @tracked model;
  queryParams = ['referencePersonId', 'renderer'];

  reference = {
    getId: () => this.referencePersonId,
    setId: (id) => (this.referencePersonId = id),
  };
}
