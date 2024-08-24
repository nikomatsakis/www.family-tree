import { setupTest } from 'family-tree/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | partnership', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('partnership', {});
    assert.ok(model, 'model exists');
  });
});
