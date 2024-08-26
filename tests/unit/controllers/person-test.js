import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';

module('Unit | Controller | person', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let controller = this.owner.lookup('controller:person');
    assert.ok(controller);
  });
});
