import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';

module('Unit | Route | person', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:person');
    assert.ok(route);
  });
});
