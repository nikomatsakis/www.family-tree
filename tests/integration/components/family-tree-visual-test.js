import { module, test, skip } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { createMockFamily } from 'family-tree/tests/helpers/mock-genea-data';

module('Integration | Component | family-tree-visual', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    // Create mock person data
    createMockFamily();

    // Create simplified person objects with the expected structure
    this.person = {
      id: 'p1',
      name: 'Test Person',
      gender: 'male',
      comments: 'Test comments',
      childIn: null,
      parentIn: [],
      parents: [],
      partners: [],
    };
  });

  skip('it renders', async function (assert) {
    // TODO: Fix failing test - see issue #13
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    assert.dom('.family-tree-visual-container').exists();
    assert.dom('.tree-container').exists();
  });

  skip('it generates tree data with person data', async function (assert) {
    // TODO: Fix failing test - see issue #13
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    // Check that the component exists and contains rendered content
    assert.dom('.tree-container').exists();
    // The tree container should contain the person's name (either in text or debug view)
    assert.dom('.tree-container').containsText('Test Person');
  });

  skip('it displays person name in rendered tree', async function (assert) {
    // TODO: Fix failing test - see issue #13
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    // The person name should appear in the rendered tree
    assert.dom('.tree-container').containsText('Test Person');
  });

  test('it builds graph structure correctly', async function (assert) {
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    // The component should exist and not show loading text
    assert.dom('.family-tree-visual-container').exists();
    assert.dom('.loading').doesNotExist();
  });

  skip('it supports different renderer types', async function (assert) {
    // TODO: Fix failing test - see issue #13
    // Test with text renderer (default)
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
      @rendererType="text"
    />`);

    assert.dom('.tree-container').exists();
    assert.dom('[data-renderer-type="text"]').exists();

    // Test with debug renderer
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
      @rendererType="debug"
    />`);

    assert.dom('.tree-container').exists();
    assert.dom('[data-renderer-type="debug"]').exists();
    assert.dom('.debug-renderer').exists();
  });
});
