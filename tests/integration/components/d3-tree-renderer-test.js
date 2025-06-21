import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import {
  createRenderer,
  getRendererDisplayNames,
} from 'family-tree/utils/family-tree-renderers';
import { loadGeneaFixture } from 'family-tree/tests/helpers/genea-fixtures';

module('Integration | Component | d3-tree-renderer', function (hooks) {
  setupRenderingTest(hooks);

  test('d3 tree renderer is available in renderer list', function (assert) {
    const displayNames = getRendererDisplayNames();
    assert.ok(
      'd3-tree' in displayNames,
      'D3 tree renderer is available in renderer list',
    );

    assert.strictEqual(
      displayNames['d3-tree'],
      'D3 Tree',
      'D3 tree renderer has correct display name',
    );
  });

  test('d3 tree renderer can be created and has correct type', function (assert) {
    const renderer = createRenderer('d3-tree');

    assert.ok(renderer, 'D3 tree renderer instance is created');
    assert.strictEqual(
      renderer.getType(),
      'd3-tree',
      'D3 tree renderer returns correct type',
    );
  });

  test('d3 tree renderer implements required methods', function (assert) {
    const renderer = createRenderer('d3-tree');

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

  test('d3 tree renderer prepares data without errors for empty graph', function (assert) {
    const renderer = createRenderer('d3-tree');

    // Create a minimal person with no relationships
    const emptyPerson = {
      id: 'test-person',
      name: 'Test Person',
      parentIn: [], // No partnerships where this person is a parent
      childIn: null, // No partnership where this person is a child
    };

    // Use the proper pipeline: Person → buildVisibleGraph → RenderTree → prepareRenderData
    const renderTree = renderer.buildVisibleGraph(emptyPerson);
    const result = renderer.prepareRenderData(renderTree);

    assert.ok(result, 'PrepareRenderData returns a result');
    assert.strictEqual(result.type, 'd3-tree', 'Result has correct type');
    assert.ok(result.data, 'Result has data');
  });

  test('d3 tree renderer visits all elements in nested family structure', async function (assert) {
    const renderer = createRenderer('d3-tree');

    // Load real genea data from fixture
    const { startPerson } = await loadGeneaFixture('simple-family');

    // Use the proper pipeline: Person → buildVisibleGraph → RenderTree → prepareRenderData
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    // Set up element tracking
    const elementLog = [];
    renderer.trackElement = (type, label, ...coords) => {
      elementLog.push(`${type}: ${label} at (${coords.join(',')})`);
    };

    // Create a mock container and render
    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    // Verify that at least one element was rendered
    const rectangleEntries = elementLog.filter((entry) =>
      entry.startsWith('Rectangle:'),
    );

    assert.ok(
      rectangleEntries.length >= 1,
      `Expected at least 1 rectangle, got ${rectangleEntries.length}`,
    );

    // Check that persons were rendered
    const renderedNames = rectangleEntries
      .map((entry) => entry.split(':')[1].split(' at ')[0].trim())
      .join(', ');

    assert.ok(
      renderedNames.includes('Dad Test'),
      `Dad Test should be rendered. Found: ${renderedNames}`,
    );
  });

  test('d3 tree renderer calculates absolute positions correctly', async function (assert) {
    const renderer = createRenderer('d3-tree');

    // Load real genea data from fixture
    const { startPerson } = await loadGeneaFixture('simple-family');

    // Use the proper pipeline: Person → buildVisibleGraph → RenderTree → prepareRenderData
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    // Set up position tracking
    const positions = [];
    renderer.trackElement = (type, label, x, y) => {
      positions.push({ type, label, x, y });
    };

    // Render to track positions
    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    // Verify positions are numeric (not NaN) and reasonable
    const rectangles = positions.filter((p) => p.type === 'Rectangle');
    assert.ok(
      rectangles.length > 0,
      'At least one rectangle should be rendered',
    );

    rectangles.forEach((rect) => {
      assert.strictEqual(
        typeof rect.x,
        'number',
        `Rectangle ${rect.label} X should be a number`,
      );
      assert.false(
        isNaN(rect.x),
        `Rectangle ${rect.label} X should not be NaN: ${rect.x}`,
      );
      assert.strictEqual(
        typeof rect.y,
        'number',
        `Rectangle ${rect.label} Y should be a number`,
      );
      assert.false(
        isNaN(rect.y),
        `Rectangle ${rect.label} Y should not be NaN: ${rect.y}`,
      );
      assert.ok(
        rect.x >= 0,
        `Rectangle ${rect.label} X coordinate should be non-negative: ${rect.x}`,
      );
      assert.ok(
        rect.y >= 0,
        `Rectangle ${rect.label} Y coordinate should be non-negative: ${rect.y}`,
      );
    });
  });

  test('d3 tree renderer handles all layout element types', async function (assert) {
    const renderer = createRenderer('d3-tree');

    // Load real genea data from fixture that will generate different element types
    const { startPerson } = await loadGeneaFixture('simple-family');

    // Use the proper pipeline: Person → buildVisibleGraph → RenderTree → prepareRenderData
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    // Track element types
    const elementTypes = new Set();
    renderer.trackElement = (type) => {
      elementTypes.add(type);
    };

    // Should not throw errors
    let didThrow = false;
    try {
      const container = document.createElement('div');
      renderer.renderToElement(container, renderData);
    } catch (error) {
      didThrow = true;
      assert.ok(false, `Rendering should not throw errors: ${error.message}`);
    }
    assert.false(didThrow, 'Rendering should not throw errors');

    // Verify we processed both rectangles and lines
    assert.ok(
      elementTypes.has('Rectangle'),
      'Should process Rectangle elements',
    );
    assert.ok(elementTypes.has('Line'), 'Should process Line elements');
  });

  test('d3 tree renderer creates valid SVG structure', async function (assert) {
    const renderer = createRenderer('d3-tree');

    // Load real genea data from fixture
    const { startPerson } = await loadGeneaFixture('simple-family');

    // Use the proper pipeline: Person → buildVisibleGraph → RenderTree → prepareRenderData
    const renderTree = renderer.buildVisibleGraph(startPerson);
    const renderData = renderer.prepareRenderData(renderTree);

    const container = document.createElement('div');
    renderer.renderToElement(container, renderData);

    // Check SVG structure
    const svg = container.querySelector('svg');
    assert.ok(svg, 'SVG element should be created');

    const personBoxes = svg.querySelectorAll('.person-box');
    assert.ok(
      personBoxes.length > 0,
      'At least one person box should be created',
    );

    // Check that person boxes have proper structure
    const firstPersonBox = personBoxes[0];
    const rect = firstPersonBox.querySelector('rect');
    const text = firstPersonBox.querySelector('text');

    assert.ok(rect, 'Person box should contain a rect element');
    assert.ok(text, 'Person box should contain a text element');
    assert.ok(
      text.textContent.trim().length > 0,
      'Text element should have content',
    );
  });

  test('d3 tree renderer supports vertical layout mode', async function (assert) {
    const renderer = createRenderer('d3-tree', {
      expandedPartnerships: new Set(['0']),
    });

    // Load test data
    const { startPerson } = await loadGeneaFixture('simple-family');
    const renderTree = renderer.buildVisibleGraph(startPerson);

    // Test vertical layout mode
    const verticalRenderData = renderer.prepareRenderData(renderTree, {
      layoutMode: 'vertical',
    });

    assert.ok(verticalRenderData, 'Vertical render data should be created');
    assert.strictEqual(
      verticalRenderData.type,
      'd3-tree',
      'Render data should have correct type',
    );
    assert.ok(
      verticalRenderData.data.family,
      'Vertical render data should contain family layout',
    );

    // Test horizontal layout mode
    const horizontalRenderData = renderer.prepareRenderData(renderTree, {
      layoutMode: 'horizontal',
    });

    assert.ok(horizontalRenderData, 'Horizontal render data should be created');

    // Layouts should be different (different positioning)
    const vFamily = verticalRenderData.data.family;
    const hFamily = horizontalRenderData.data.family;

    // Basic sanity check - both should have elements
    assert.ok(vFamily.elements, 'Vertical family should have elements');
    assert.ok(hFamily.elements, 'Horizontal family should have elements');

    // Port positions should be different for vertical vs horizontal
    assert.notEqual(
      vFamily.port,
      hFamily.port,
      'Vertical and horizontal layouts should use different port positions',
    );
  });
});
