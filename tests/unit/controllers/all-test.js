import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';

module('Unit | Controller | all', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let controller = this.owner.lookup('controller:all');
    assert.ok(controller);
  });

  test('it has referencePersonId query param', function (assert) {
    let controller = this.owner.lookup('controller:all');
    assert.deepEqual(controller.queryParams, ['referencePersonId']);
  });
});
