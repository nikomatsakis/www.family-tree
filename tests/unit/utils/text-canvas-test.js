import { module, test } from 'qunit';
import { TextCanvas } from 'family-tree/utils/text-canvas';

module('Unit | Utils | text-canvas', function () {
  test('empty canvas renders as empty string', function (assert) {
    const canvas = new TextCanvas();
    assert.strictEqual(canvas.render(), '');
  });

  test('addText places text at position', function (assert) {
    const canvas = new TextCanvas();
    canvas.addText(0, 0, 'Hello');
    assert.strictEqual(canvas.render(), 'Hello');
  });

  test('addText at offset position', function (assert) {
    const canvas = new TextCanvas();
    canvas.addText(3, 2, 'Hi');

    const expected = '\n' + '\n' + '   Hi';

    assert.strictEqual(canvas.render(), expected);
  });

  test('drawHorizontalLine single style', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 0, 5);
    assert.strictEqual(canvas.render(), '─────');
  });

  test('drawHorizontalLine double style', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 0, 5, 'double');
    assert.strictEqual(canvas.render(), '═════');
  });

  test('drawVerticalLine single style', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawVerticalLine(0, 0, 3);

    const expected = '│\n' + '│\n' + '│';

    assert.strictEqual(canvas.render(), expected);
  });

  test('drawVerticalLine double style', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawVerticalLine(0, 0, 3, 'double');

    const expected = '║\n' + '║\n' + '║';

    assert.strictEqual(canvas.render(), expected);
  });

  test('drawBox creates rectangle', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawBox(0, 0, 4, 3);

    const expected = '┌──┐\n' + '│  │\n' + '└──┘';

    assert.strictEqual(canvas.render(), expected);
  });

  test('box with text inside', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawBox(0, 0, 6, 3);
    canvas.addText(1, 1, 'Test');

    const expected = '┌────┐\n' + '│Test│\n' + '└────┘';

    assert.strictEqual(canvas.render(), expected);
  });

  test('horizontal line length 1', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 0, 1);
    assert.strictEqual(canvas.render(), '─');
  });

  test('vertical line length 1', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawVerticalLine(0, 0, 1);
    assert.strictEqual(canvas.render(), '│');
  });

  test('T-junction: horizontal then vertical creates ┬', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 0, 5);
    canvas.drawVerticalLine(2, 0, 3);

    const expected = '──┬──\n' + '  │\n' + '  │';

    assert.strictEqual(canvas.render(), expected);
  });

  test('T-junction: vertical then horizontal creates ├', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawVerticalLine(0, 0, 3);
    canvas.drawHorizontalLine(0, 1, 3);

    const expected = '│\n' + '├──\n' + '│';

    assert.strictEqual(canvas.render(), expected);
  });

  test('T-junction: double vertical with horizontal creates ╟', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawVerticalLine(0, 0, 3, 'double');
    canvas.drawHorizontalLine(0, 1, 3);

    const expected = '║\n' + '╟──\n' + '║';

    assert.strictEqual(canvas.render(), expected);
  });

  test('T-junction: horizontal with double vertical creates ╥', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 0, 5);
    canvas.drawVerticalLine(2, 0, 3, 'double');

    const expected = '──╥──\n' + '  ║\n' + '  ║';

    assert.strictEqual(canvas.render(), expected);
  });

  test('cross intersection: creates ┼', function (assert) {
    const canvas = new TextCanvas();
    canvas.drawHorizontalLine(0, 1, 5);
    canvas.drawVerticalLine(2, 0, 3);

    const expected = '  │\n' + '──┼──\n' + '  │';

    assert.strictEqual(canvas.render(), expected);
  });

  test('complex family tree pattern', function (assert) {
    const canvas = new TextCanvas();

    // Draw two parent boxes
    canvas.drawBox(0, 0, 7, 3);
    canvas.addText(1, 1, 'Dad');

    canvas.drawBox(12, 0, 7, 3);
    canvas.addText(13, 1, 'Mom');

    // Marriage line
    canvas.drawHorizontalLine(7, 1, 5);

    // Parent-child line
    canvas.drawVerticalLine(9, 1, 4);

    // Child box
    canvas.drawBox(6, 5, 7, 3);
    canvas.addText(7, 6, 'Child');

    const expected =
      '┌─────┐     ┌─────┐\n' +
      '│Dad  │──┬──│Mom  │\n' +
      '└─────┘  │  └─────┘\n' +
      '         │\n' +
      '         │\n' +
      '      ┌─────┐\n' +
      '      │Child│\n' +
      '      └─────┘';

    assert.strictEqual(canvas.render(), expected);
  });

  test('sibling connection pattern', function (assert) {
    const canvas = new TextCanvas();

    // Parent-child lines for three children (extend past sibling line)
    canvas.drawVerticalLine(2, 0, 4);
    canvas.drawVerticalLine(6, 0, 4);
    canvas.drawVerticalLine(10, 0, 4);

    // Sibling line connecting them
    canvas.drawHorizontalLine(2, 2, 9);

    const expected =
      '  │   │   │\n' + '  │   │   │\n' + '  ├───┼───┤\n' + '  │   │   │';

    assert.strictEqual(canvas.render(), expected);
  });

  test('continuation line pattern', function (assert) {
    const canvas = new TextCanvas();

    // Person box (wider to fit text with padding)
    canvas.drawBox(0, 0, 8, 3);
    canvas.addText(1, 1, 'Person');

    // Marriage line
    canvas.drawHorizontalLine(8, 1, 5);

    // Double vertical continuation line
    canvas.drawVerticalLine(2, 3, 3, 'double');

    const expected =
      '┌──────┐\n' +
      '│Person│─────\n' +
      '└──────┘\n' +
      '  ║\n' +
      '  ║\n' +
      '  ║';

    assert.strictEqual(canvas.render(), expected);
  });

  test('error: cannot place text on existing text', function (assert) {
    const canvas = new TextCanvas();
    canvas.addText(0, 0, 'Hello');

    assert.throws(
      () => canvas.addText(2, 0, 'XX'),
      /Cannot place text at \(2,0\) - cell already occupied/,
      'Should throw when placing text on existing text',
    );
  });

  test('error: cannot draw line through text', function (assert) {
    const canvas = new TextCanvas();
    canvas.addText(2, 0, 'X');

    assert.throws(
      () => canvas.drawHorizontalLine(0, 0, 5),
      /Cannot draw line at \(2,0\) - text already present/,
      'Should throw when drawing line through text',
    );
  });

  test('canvas auto-grows to fit content', function (assert) {
    const canvas = new TextCanvas();

    // Draw something far from origin
    canvas.drawBox(10, 5, 3, 2);

    const result = canvas.render();
    const lines = result.split('\n');

    assert.strictEqual(lines.length, 7, 'Canvas grew to 7 lines');
    assert.strictEqual(lines[5].length, 13, 'Line 5 is 13 chars wide');
    assert.strictEqual(
      lines[5].substring(10),
      '┌─┐',
      'Box top at correct position',
    );
    assert.strictEqual(
      lines[6].substring(10),
      '└─┘',
      'Box bottom at correct position',
    );
  });

  test('mixed single and double lines', function (assert) {
    const canvas = new TextCanvas();

    // Draw single horizontal line
    canvas.drawHorizontalLine(0, 0, 7);

    // Draw double vertical line intersecting it
    canvas.drawVerticalLine(3, 0, 3, 'double');

    const expected = '───╥───\n' + '   ║\n' + '   ║';

    assert.strictEqual(canvas.render(), expected);
  });
});
