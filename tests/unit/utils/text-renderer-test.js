import { module, test } from 'qunit';
import { TextRenderer } from 'family-tree/utils/text-renderer';
import { TextCanvas } from 'family-tree/utils/text-canvas';
import { Family, Rectangle, Line } from 'family-tree/utils/layout-elements';

module('Unit | Utility | text-renderer', function () {
  test('renders a single person', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const family = new Family();

    // Add a single person rectangle
    const person = new Rectangle('John', 'primary-person', 6, 3);
    family.addElement(person);

    renderer.render(canvas, family);
    const output = canvas.render();

    assert.strictEqual(
      output,
      ['┌────┐', '│John│', '└────┘'].join('\n'),
      'Single person rendered correctly',
    );
  });

  test('renders person with partner', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const family = new Family();

    // Add primary person
    const person = new Rectangle('John', 'primary-person', 6, 3);
    person.x = 0;
    person.y = 0;
    family.addElement(person);

    // Add marriage line
    const marriageLine = new Line(7, 'marriage-line');
    marriageLine.x = 6;
    marriageLine.y = 1;
    family.addElement(marriageLine);

    // Add partner
    const partner = new Rectangle('Jane', 'partner-person', 6, 3);
    partner.x = 13;
    partner.y = 0;
    family.addElement(partner);

    renderer.render(canvas, family);
    const output = canvas.render();

    assert.strictEqual(
      output,
      [
        '┌────┐       ┌────┐',
        '│John│───────│Jane│',
        '└────┘       └────┘',
      ].join('\n'),
      'Person with partner rendered correctly',
    );
  });

  test('renders continuity line with double style', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const family = new Family();

    // Add continuity line (double vertical)
    const continuityLine = new Line(5, 'continuity-line');
    continuityLine.x = 2;
    continuityLine.y = 0;
    family.addElement(continuityLine);

    renderer.render(canvas, family);
    const output = canvas.render();

    assert.strictEqual(
      output,
      ['  ║', '  ║', '  ║', '  ║', '  ║'].join('\n'),
      'Continuity line uses double style',
    );
  });

  test('renders nested family', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const parentFamily = new Family();

    // Add parent
    const parent = new Rectangle('Parent', 'primary-person', 8, 3);
    parentFamily.addElement(parent);

    // Add parent-child line
    const parentChildLine = new Line(3, 'parent-child-line');
    parentChildLine.x = 4;
    parentChildLine.y = 3;
    parentFamily.addElement(parentChildLine);

    // Create child family
    const childFamily = new Family();
    childFamily.x = 0;
    childFamily.y = 6;

    const child = new Rectangle('Child', 'person', 7, 3);
    childFamily.addElement(child);

    // Add child family to parent
    parentFamily.addElement(childFamily);

    renderer.render(canvas, parentFamily);
    const output = canvas.render();

    assert.strictEqual(
      output,
      [
        '┌──────┐',
        '│Parent│',
        '└──────┘',
        '    │',
        '    │',
        '    │',
        '┌─────┐',
        '│Child│',
        '└─────┘',
      ].join('\n'),
      'Nested family rendered correctly',
    );
  });

  test('renders T-junction with parent-child and sibling lines', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const family = new Family();

    // Add parent-child line
    const parentChildLine = new Line(3, 'parent-child-line');
    parentChildLine.x = 5;
    parentChildLine.y = 0;
    family.addElement(parentChildLine);

    // Add sibling line (horizontal)
    const siblingLine = new Line(11, 'sibling-line');
    siblingLine.x = 0;
    siblingLine.y = 1; // Middle of parent-child line
    family.addElement(siblingLine);

    renderer.render(canvas, family);
    const output = canvas.render();

    assert.strictEqual(
      output,
      ['     │', '─────┼─────', '     │'].join('\n'),
      'T-junction rendered correctly',
    );
  });

  test('renders expansion placeholder', function (assert) {
    const renderer = new TextRenderer();
    const canvas = new TextCanvas();
    const family = new Family();

    // Add expansion placeholder (now renders as [+] instead of boxed)
    const placeholder = new Rectangle('+', 'expansion-placeholder', 3, 1);
    family.addElement(placeholder);

    renderer.render(canvas, family);
    const output = canvas.render();

    assert.strictEqual(output, '[+]', 'Expansion placeholder rendered as [+]');
  });

  test('respects text padding in boxes', function (assert) {
    const renderer = new TextRenderer();

    // Test that padding is correctly applied
    assert.strictEqual(renderer.personPadding, 1, 'Padding is 1');

    // Test box measurement
    const box = renderer.measureBox('Test');
    assert.strictEqual(box.width, 6, 'Box width = text(4) + 2*padding(1)');
    assert.strictEqual(box.height, 3, 'Box height = 1 + 2*padding(1)');
  });
});
