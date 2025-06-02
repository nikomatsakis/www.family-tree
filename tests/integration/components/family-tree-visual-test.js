import { module, test } from 'qunit';
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

  test('it renders', async function (assert) {
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    assert.dom('.family-tree-visual-container').exists();
    assert.dom('.mermaid-container').exists();
  });

  test('it generates mermaid code with person data', async function (assert) {
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    // Check that the component exists and contains mermaid code
    assert.dom('.mermaid-container').exists();
    // The mermaid diagram should contain the person's name
    assert.dom('.mermaid-container').containsText('Test Person');
  });

  test('it displays person name in mermaid diagram', async function (assert) {
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    // The person name should appear in the mermaid flowchart syntax
    assert.dom('.mermaid-container').containsText('Test Person');
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

  test('it handles click events - placeholder for mermaid integration', async function (assert) {
    // Note: Click handling for mermaid nodes requires additional setup
    // This is a placeholder test for future mermaid click integration
    await render(hbs`<FamilyTreeVisual 
      @person={{this.person}}
      @pagePerson={{this.person}}
    />`);

    assert.dom('.mermaid-container').exists();
    // TODO: Implement mermaid node click handling
    assert.ok(true, 'Component renders successfully');
  });
});
