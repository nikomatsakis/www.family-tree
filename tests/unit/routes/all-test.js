import { module, test, skip } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';

module('Unit | Route | all', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:all');
    assert.ok(route);
  });

  skip('model hook populates genea and returns roots', async function (assert) {
    // TODO: Fix failing test - see issue #13
    let route = this.owner.lookup('route:all');
    let geneaService = this.owner.lookup('service:genea');

    // Mock the genea service methods
    let populateCalled = false;
    let mockRoots = { rootPeople: [] };

    geneaService.populate = async function () {
      populateCalled = true;
    };

    geneaService.roots = function () {
      return mockRoots;
    };

    let result = await route.model();

    assert.true(populateCalled, 'populate was called on genea service');
    assert.strictEqual(
      result,
      mockRoots,
      'model returns roots from genea service',
    );
  });
});
