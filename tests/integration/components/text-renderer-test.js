import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import {
  getAvailableRenderers,
  getRendererDisplayNames,
  createRenderer,
} from 'family-tree/utils/family-tree-renderers';

module('Integration | Component | text-renderer', function (hooks) {
  setupRenderingTest(hooks);

  test('text renderer is available in renderer list', function (assert) {
    const availableRenderers = getAvailableRenderers();

    assert.ok(
      availableRenderers.includes('text'),
      'Text renderer is in available renderers list',
    );

    const displayNames = getRendererDisplayNames();
    assert.strictEqual(
      displayNames.text,
      'ASCII Text',
      'Text renderer has correct display name',
    );
  });

  test('text renderer can be created and has correct type', function (assert) {
    const renderer = createRenderer('text');

    assert.ok(renderer, 'Text renderer instance is created');
    assert.strictEqual(
      renderer.getType(),
      'text',
      'Text renderer returns correct type',
    );
  });

  test('text renderer implements required methods', function (assert) {
    const renderer = createRenderer('text');

    assert.strictEqual(
      typeof renderer.prepareRenderData,
      'function',
      'Has prepareRenderData method',
    );
    assert.strictEqual(
      typeof renderer.getType,
      'function',
      'Has getType method',
    );
    assert.strictEqual(
      typeof renderer.renderToElement,
      'function',
      'Has renderToElement method',
    );
    assert.strictEqual(
      typeof renderer.buildVisibleGraph,
      'function',
      'Has buildVisibleGraph method',
    );
  });

  test('text renderer renders without errors for empty graph', function (assert) {
    const renderer = createRenderer('text');
    const emptyGraph = { persons: [], partnerships: [] };

    const result = renderer.prepareRenderData(emptyGraph);

    assert.ok(result, 'Render returns a result');
    assert.strictEqual(result.type, 'text', 'Result has correct type');
    assert.ok(result.data, 'Result has data');
    assert.strictEqual(
      typeof result.data.ascii,
      'string',
      'Result contains ASCII string',
    );
  });
});
