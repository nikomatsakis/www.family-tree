import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { createRenderer } from 'family-tree/utils/family-tree-renderers';
import { loadGeneaFixture } from 'family-tree/tests/helpers/genea-fixtures';
import {
  layoutFamily,
  layoutFamilyVertical,
} from 'family-tree/utils/family-layout';
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

  test('SCENARIO: single person with no family - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('single-person');

    const renderer = createRenderer('text');
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Should show just the single person box (same as horizontal)
    const expected = ['┌────────┐', '│John Doe│', '└────────┘'].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Single person should render identically in vertical mode',
    );
  });

  test('SCENARIO: simple marriage (no children) - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('simple-family');

    const renderer = createRenderer('text');
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Partners should be side-by-side with expansion button (children exist but not expanded)
    const expected = [
      '┌────────┐        ┌────────┐',
      '│Dad Test│ ──[+]─ │Mom Test│',
      '└────────┘        └────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Simple marriage should show partners side-by-side in vertical mode',
    );
  });

  test('SCENARIO: childless marriage (no expansion button) - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('childless-marriage');

    const renderer = createRenderer('text');
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Partners with no children should show plain marriage line (no button)
    const expected = [
      '┌────────┐        ┌──────────┐',
      '│Bob Test│ ────── │Alice Test│',
      '└────────┘        └──────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Childless marriage should show no expansion button (hasChildren=false)',
    );
  });

  test('SCENARIO: child with own family (recursive layout) - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('child-with-family');

    const renderer = createRenderer('text', {
      expandedPartnerships: new Set(['0', '1']), // Expand both parent and child partnerships
    });
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Three generations with recursive family layout
    const expected = [
      '┌────────┐        ┌────────┐',
      '│Dad Test│ ──[−]─ │Mom Test│',
      '└────────┘    │   └────────┘',
      '    ┌─────────┘',
      '    │ ┌────────┐        ┌─────────┐',
      '    └─┤Son Test│ ──[−]─ │Wife Test│',
      '      └────────┘    │   └─────────┘',
      '          ┌─────────┘',
      '          │ ┌─────────────┐',
      '          └─┤Grandson Test│',
      '            └─────────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Child with own family should render recursively in vertical mode',
    );
  });

  test('SCENARIO: multiple children (vertical stacking) - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('simple-family');

    const renderer = createRenderer('text', {
      expandedPartnerships: new Set(['0']), // Expand to show all children
    });
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Parents with multiple children stacked vertically
    const expected = [
      '┌────────┐        ┌────────┐',
      '│Dad Test│ ──[−]─ │Mom Test│',
      '└────────┘    │   └────────┘',
      '    ┌─────────┘',
      '    │ ┌─────────┐',
      '    ├─┤Child One│',
      '    │ └─────────┘',
      '    │ ┌─────────┐',
      '    └─┤Child Two│',
      '      └─────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Multiple children should stack vertically with proper junction characters',
    );
  });

  test('SCENARIO: simple family (parents + one child) - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture('single-child');

    const renderer = createRenderer('text', {
      expandedPartnerships: new Set(['0']), // Expand the main partnership to show children
    });
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Parents with one child below, with collapse button at junction (expanded)
    const expected = [
      '┌──────────┐        ┌──────────┐',
      '│Dad Single│ ──[−]─ │Mom Single│',
      '└──────────┘    │   └──────────┘',
      '    ┌───────────┘',
      '    │ ┌──────────┐',
      '    └─┤Only Child│',
      '      └──────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Simple family should show child below parents with expansion button and correct spacing',
    );
  });

  test('SCENARIO: multiple partnerships - VERTICAL', async function (assert) {
    const { startPerson } = await loadGeneaFixture(
      'multiple-partnerships-vertical',
    );

    const renderer = createRenderer('text', {
      expandedPartnerships: new Set(['0', '1', '2']), // Expand all three partnerships
    });
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const textLayoutRenderer = new TextRenderer();
    const family = layoutFamilyVertical(renderTree, 0, textLayoutRenderer);
    const canvas = new TextCanvas();
    textLayoutRenderer.render(canvas, family);
    const output = canvas.render();

    // Expected output: John Smith with 3 partnerships, showing continuity lines
    const expected = [
      '┌──────────┐        ┌────────────┐',
      '│John Smith│ ──[−]─ │Mary Johnson│',
      '└╥─────────┘    │   └────────────┘',
      ' ║  ┌───────────┘',
      ' ║  │ ┌─────────┐',
      ' ║  ├─┤Bob Smith│',
      ' ║  │ └─────────┘',
      ' ║  │ ┌───────────┐',
      ' ║  └─┤Alice Smith│',
      ' ║    └───────────┘',
      ' ║',
      '┌╨─────────┐        ┌──────────────┐',
      '│John Smith│ ──[−]─ │Susan Williams│',
      '└╥─────────┘    │   └──────────────┘',
      ' ║  ┌───────────┘',
      ' ║  │ ┌───────────┐',
      ' ║  └─┤Carol Smith│',
      ' ║    └───────────┘',
      ' ║',
      '┌╨─────────┐        ┌──────────────┐',
      '│John Smith│ ────── │Jennifer Davis│',
      '└──────────┘        └──────────────┘',
    ].join('\n');

    assert.strictEqual(
      output,
      expected,
      'Multiple partnerships should show vertically with continuity lines',
    );
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
