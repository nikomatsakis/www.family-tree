import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class IndexController extends Controller {
  @tracked renderer = DEFAULT_RENDERER_TYPE;
  queryParams = ['renderer'];
}
