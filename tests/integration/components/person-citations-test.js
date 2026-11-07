import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { loadGeneaFixture } from 'family-tree/tests/helpers/genea-fixtures';
import D3TreeRenderer from 'family-tree/utils/family-tree-renderers/d3-tree-renderer';

module('Integration | Component | person citations', function (hooks) {
  setupRenderingTest(hooks);

  test('source links survive parsing, rendering, and SVG layout', async function (assert) {
    const { startPerson } = await loadGeneaFixture('citations');
    this.set('person', startPerson);
    await render(hbs`<PersonLink @person={{this.person}} />`);
    assert.dom('.person-citation').exists({ count: 2 });
    const link = this.element.querySelector('.person-citation');
    assert.strictEqual(link.target, '_blank');
    const params = new URLSearchParams(new URL(link.href).hash.slice(1));
    assert.strictEqual(params.get('page'), '1');
    assert.strictEqual(params.get('name'), 'Example Person');
    assert.dom().doesNotIncludeText('private detail');

    const renderer = new D3TreeRenderer();
    const tree = renderer.buildVisibleGraph(startPerson);
    const data = renderer.prepareRenderData(tree);
    const container = document.createElement('div');
    this.element.append(container);
    let navigated = false;
    renderer.renderToElement(container, data, {
      navigateToPerson() {
        navigated = true;
      },
    });
    assert.dom('svg a.person-citation').exists({ count: 2 });
    // Prevent opening a browser tab during the test while checking event isolation.
    const svgLink = container.querySelector('a.person-citation');
    svgLink.addEventListener('click', (event) => event.preventDefault());
    svgLink.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    assert.false(
      navigated,
      'Citation click does not navigate away from the tree',
    );
    renderer.destroy?.();
  });
});
