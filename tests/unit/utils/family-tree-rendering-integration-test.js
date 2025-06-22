import { module, test } from 'qunit';
import { TextRenderer } from 'family-tree/utils/text-renderer';
import { TextCanvas } from 'family-tree/utils/text-canvas';
import { Family, Rectangle, Line } from 'family-tree/utils/layout-elements';
import {
  RenderTree,
  RenderPerson,
  RenderFamily,
} from 'family-tree/utils/render-tree';
import { layoutFamily } from 'family-tree/utils/family-layout';

module('Unit | Utils | family-tree-rendering-integration', function () {
  module('Manual Layout Tests', function () {
    test('integration: family layout to text output', function (assert) {
      // Create a simple family layout manually
      const family = new Family();

      // Add a person box
      const person = new Rectangle('John', 'primary-person', 6, 3);
      person.x = 0;
      person.y = 0;
      family.addElement(person);

      // Add marriage line
      const marriageLine = new Line(5, 'marriage-line');
      marriageLine.x = 6;
      marriageLine.y = 1;
      family.addElement(marriageLine);

      // Add partner
      const partner = new Rectangle('Jane', 'partner-person', 6, 3);
      partner.x = 11;
      partner.y = 0;
      family.addElement(partner);

      // Render to text
      const renderer = new TextRenderer();
      const canvas = new TextCanvas();
      renderer.render(canvas, family);
      const output = canvas.render();

      assert.strictEqual(
        output,
        ['┌────┐     ┌────┐', '│John│─────│Jane│', '└────┘     └────┘'].join(
          '\n',
        ),
        'Family layout renders correctly to text',
      );
    });

    test('integration: nested families render correctly', function (assert) {
      // Create parent family
      const parentFamily = new Family();

      // Add parent
      const parent = new Rectangle('Parent', 'primary-person', 8, 3);
      parent.x = 0;
      parent.y = 0;
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
      child.x = 0;
      child.y = 0;
      childFamily.addElement(child);

      // Add child family to parent
      parentFamily.addElement(childFamily);

      // Render to text
      const renderer = new TextRenderer();
      const canvas = new TextCanvas();
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
        'Nested families render correctly',
      );
    });

    test('integration: continuity lines use double style', function (assert) {
      const family = new Family();

      // Add continuity line
      const continuityLine = new Line(4, 'continuity-line');
      continuityLine.x = 2;
      continuityLine.y = 0;
      family.addElement(continuityLine);

      // Render to text
      const renderer = new TextRenderer();
      const canvas = new TextCanvas();
      renderer.render(canvas, family);
      const output = canvas.render();

      assert.strictEqual(
        output,
        ['  ║', '  ║', '  ║', '  ║'].join('\n'),
        'Continuity lines render with double style',
      );
    });
  });

  module('RenderTree to Layout Tests', function () {
    test('simple marriage with no children', function (assert) {
      // Create RenderTree
      const renderTree = new RenderTree(0);

      // Add two people
      const john = new RenderPerson('john-id', 'John');
      const johnIndex = renderTree.addPerson(john);

      const jane = new RenderPerson('jane-id', 'Jane');
      const janeIndex = renderTree.addPerson(jane);

      // Create marriage partnership
      const marriage = new RenderFamily(
        'marriage-1',
        [johnIndex, janeIndex],
        [], // empty array = expanded with no children
      );
      const marriageIndex = renderTree.addFamily(marriage);

      // Update parentIn references
      john.rightFamilyRIndices = [marriageIndex];
      jane.rightFamilyRIndices = [marriageIndex];

      // Layout and render
      const renderer = new TextRenderer();
      const family = layoutFamily(renderTree, johnIndex, renderer);
      const canvas = new TextCanvas();
      renderer.render(canvas, family);
      const output = canvas.render();

      assert.strictEqual(
        output,
        [
          '┌────┐        ┌────┐',
          '│John│ ────── │Jane│',
          '└────┘        └────┘',
        ].join('\n'),
        'Simple marriage renders correctly',
      );
    });

    test('person with unexpanded ancestors shows expansion button', function (assert) {
      // Create RenderTree with a single person who has unexpanded ancestors
      const renderTree = new RenderTree(0);

      // Add focus person
      const child = new RenderPerson('child-id', 'Child');
      // Simulate that this person has unexpanded ancestors by setting unexpandedChildIn
      child.unexpandedChildIn = 'parent-partnership-id';
      const childIndex = renderTree.addPerson(child);

      // Layout and render
      const renderer = new TextRenderer();
      const family = layoutFamily(renderTree, childIndex, renderer);
      const canvas = new TextCanvas();
      renderer.render(canvas, family);
      const output = canvas.render();

      // Expected output with ancestor expansion button above the person
      const expected = ['┌─[+]─┐', '│Child│', '└─────┘'].join('\n');

      assert.strictEqual(
        output,
        expected,
        'Person with unexpanded ancestors shows [+] button above',
      );
    });

    test('person with single-letter name and unexpanded ancestors', function (assert) {
      // Create RenderTree with a person with minimal name length
      const renderTree = new RenderTree(0);

      // Add focus person with single letter name
      const person = new RenderPerson('x-id', 'X');
      // Simulate that this person has unexpanded ancestors
      person.unexpandedChildIn = 'parent-partnership-id';
      const personIndex = renderTree.addPerson(person);

      // Layout and render
      const renderer = new TextRenderer();
      const family = layoutFamily(renderTree, personIndex, renderer);
      const canvas = new TextCanvas();
      renderer.render(canvas, family);
      const output = canvas.render();

      // Expected output - button should fit exactly in minimal box
      const expected = ['┌[+]┐', '│ X │', '└───┘'].join('\n');

      assert.strictEqual(
        output,
        expected,
        'Single-letter name with ancestor button renders correctly',
      );
    });
  });
});
