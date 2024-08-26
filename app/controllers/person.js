import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class PersonController extends Controller {
  @tracked referencePersonId = null;
  @tracked model;
  queryParams = ['referencePersonId'];

  reference = {
    getId: () => this.referencePersonId,
    setId: (id) => (this.referencePersonId = id),
  };
}
