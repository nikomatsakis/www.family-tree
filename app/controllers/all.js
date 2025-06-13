import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class AllController extends Controller {
  @tracked referencePersonId = null;
  @tracked renderer = DEFAULT_RENDERER_TYPE;
  queryParams = ['referencePersonId', 'renderer'];
}
