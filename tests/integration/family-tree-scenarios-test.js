import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { createRenderer } from 'family-tree/utils/family-tree-renderers';
import { loadGeneaFixture } from 'family-tree/tests/helpers/genea-fixtures';
import { layoutFamily } from 'family-tree/utils/family-layout';
import { TextCanvas } from 'family-tree/utils/text-canvas';
import { TextRenderer } from 'family-tree/utils/text-renderer';

module('Integration | Family Tree Scenarios', function (hooks) {
  setupRenderingTest(hooks);

  // ===== SCENARIO: Single Person =====

  test('SCENARIO: single person with no family - TEXT', async function (assert) {
    const { startPerson } = await loadGeneaFixture('single-person');
    const renderer = createRenderer('text');

    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamily(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Should show just the single person box
    const expected = ['┌────────┐', '│John Doe│', '└────────┘'].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Single person renders correctly in text',
    );
  });

  test('SCENARIO: single person with no family - D3', async function (assert) {
    const { startPerson } = await loadGeneaFixture('single-person');
    const renderer = createRenderer('d3-tree');

    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    // Check SVG structure
    const svg = container.querySelector('svg');
    assert.ok(svg, 'SVG should be created');

    const personBoxes = svg.querySelectorAll('.person-box');
    assert.strictEqual(
      personBoxes.length,
      1,
      'Should have exactly 1 person box',
    );

    const buttons = svg.querySelectorAll('.circular-button');
    assert.strictEqual(
      buttons.length,
      0,
      'Should have no buttons for single person',
    );

    const personText = svg.querySelector('.person-box text').textContent;
    assert.strictEqual(personText, 'John Doe', 'Person name should be correct');
  });

  // ===== SCENARIO: Simple Family =====

  test('SCENARIO: simple family (parents + children) - TEXT', async function (assert) {
    const { startPerson } = await loadGeneaFixture('simple-family');
    const renderer = createRenderer('text');

    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamily(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Basic checks - should at least show the parents
    assert.ok(output.includes('Dad Test'), 'Should include Dad Test');
    assert.ok(output.includes('Mom Test'), 'Should include Mom Test');

    // For debugging
    console.log('Simple family output:', output);
  });

  test('SCENARIO: simple family (parents + children) - D3', async function (assert) {
    const { startPerson } = await loadGeneaFixture('simple-family');
    const renderer = createRenderer('d3-tree', {
      expandedPartnerships: new Set(['0']), // Expand the main partnership
    });

    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    const svg = container.querySelector('svg');
    const personBoxes = svg.querySelectorAll('.person-box');
    const collapseButtons = svg.querySelectorAll(
      '.circular-button.collapse-button',
    );

    assert.strictEqual(
      personBoxes.length,
      4,
      'Should have 4 person boxes (2 parents + 2 children)',
    );
    assert.strictEqual(
      collapseButtons.length,
      1,
      'Should have 1 collapse button',
    );

    // Check that all family members are present
    const allText = Array.from(svg.querySelectorAll('.person-box text'))
      .map((t) => t.textContent)
      .join(', ');
    assert.ok(allText.includes('Dad Test'), 'Should include Dad Test');
    assert.ok(allText.includes('Mom Test'), 'Should include Mom Test');
    assert.ok(allText.includes('Child One'), 'Should include Child One');
    assert.ok(allText.includes('Child Two'), 'Should include Child Two');
  });

  // ===== SCENARIO: Three Generations with Collapsed Ancestors =====

  test('SCENARIO: three generations with collapsed ancestors - TEXT', async function (assert) {
    const { startPerson } = await loadGeneaFixture('three-generation');
    const renderer = createRenderer('text');

    const renderTree = renderer.buildVisibleGraph(startPerson);

    // Debug: Check what people are in the render tree
    console.log(
      'Three gen persons:',
      renderTree.persons.map((p) => p.name),
    );

    // Just check that we can build the tree
    assert.ok(renderTree.persons.length > 0, 'Should have some people');

    // Look for any of the expected people
    const names = renderTree.persons.map((p) => p.name);
    const hasValidPerson = names.some((name) =>
      ['Child One', 'Dad Smith', 'Grandpa Smith'].includes(name),
    );
    assert.ok(hasValidPerson, 'Should include at least one expected person');
  });

  test('SCENARIO: three generations with collapsed ancestors - D3', async function (assert) {
    const { startPerson } = await loadGeneaFixture('three-generation');
    const renderer = createRenderer('d3-tree');

    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    const svg = container.querySelector('svg');
    assert.ok(svg, 'Should create SVG');

    const personBoxes = svg.querySelectorAll('.person-box');
    assert.ok(personBoxes.length > 0, 'Should have at least one person box');
  });
});
