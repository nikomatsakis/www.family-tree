import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';

module('Unit | Service | genea', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:genea');
    assert.ok(service);
  });
});
