import { setupTest } from 'family-tree/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | root', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('root', {});
    assert.ok(model, 'model exists');
  });
});
