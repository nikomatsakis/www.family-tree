import Controller from '@ember/controller';

import { tracked } from '@glimmer/tracking';

export default class AllController extends Controller {
  @tracked referencePersonId = null;
  @tracked renderer = 'd3-tree';
  queryParams = ['referencePersonId', 'renderer'];
}
