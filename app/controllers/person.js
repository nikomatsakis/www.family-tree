import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class PersonController extends Controller {
  @tracked referencePersonId = null;
  @tracked renderer = DEFAULT_RENDERER_TYPE;
  @tracked model;
  queryParams = ['referencePersonId', 'renderer'];

  reference = {
    getId: () => this.referencePersonId,
    setId: (id) => (this.referencePersonId = id),
  };
}
