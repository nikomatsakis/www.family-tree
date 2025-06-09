import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { tracked } from '@glimmer/tracking';
import { createMockFamily } from 'family-tree/tests/helpers/mock-genea-data';

module(
  'Integration | Component | family-tree-visual > Reactivity',
  function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      // Create mock person data
      createMockFamily();

      // Create test context with tracked renderer type
      class TestContext {
        @tracked rendererType = 'text';

        person = {
          id: 'p1',
          name: 'Test Person',
          gender: 'male',
          comments: 'Test comments',
          childIn: null,
          parentIn: [],
          parents: [],
          partners: [],
        };
      }

      this.context = new TestContext();
    });

    test('it reacts to renderer type changes from parent component', async function (assert) {
      // Render with initial text renderer
      await render(hbs`<FamilyTreeVisual 
      @person={{this.context.person}}
      @pagePerson={{this.context.person}}
      @rendererType={{this.context.rendererType}}
    />`);

      // Verify initial render with text
      assert
        .dom('[data-renderer-type="text"]')
        .exists('Initial render uses text');
      assert.dom('.tree-container').exists('Tree container exists');

      // Get initial content
      const initialContent =
        this.element.querySelector('.tree-container').innerHTML;

      // Change renderer type to debug
      this.context.rendererType = 'debug';
      await settled();

      // Verify it changed to debug renderer
      assert
        .dom('[data-renderer-type="debug"]')
        .exists('Changed to debug renderer');
      assert.dom('.debug-renderer').exists('Debug view is rendered');

      // Verify content changed
      const newContent =
        this.element.querySelector('.tree-container').innerHTML;
      assert.notEqual(
        newContent,
        initialContent,
        'Content changed when renderer changed',
      );

      // Change back to text
      this.context.rendererType = 'text';
      await settled();

      // Verify it changed back
      assert.dom('[data-renderer-type="text"]').exists('Changed back to text');
      assert.dom('.debug-renderer').doesNotExist('Debug view is not rendered');
    });

    test('cached getters properly update when renderer type changes', async function (assert) {
      // Instead of mocking the component, we'll verify that the DOM updates correctly
      // which proves the cached getters are working

      await render(hbs`<FamilyTreeVisual 
      @person={{this.context.person}}
      @pagePerson={{this.context.person}}
      @rendererType={{this.context.rendererType}}
    />`);

      // Verify initial text render
      assert.dom('[data-renderer-type="text"]').exists('Initial text render');

      // Get the tree container element to check if it's updated
      const treeContainer = this.element.querySelector('.tree-container');
      const initialHTML = treeContainer.innerHTML;

      // Change renderer type
      this.context.rendererType = 'debug';
      await settled();

      // Verify the renderer type changed
      assert
        .dom('[data-renderer-type="debug"]')
        .exists('Renderer type changed to debug');

      // Verify the tree container was updated with new content
      const updatedHTML = treeContainer.innerHTML;
      assert.notEqual(
        updatedHTML,
        initialHTML,
        'Tree container content was updated',
      );

      // Verify specific debug content exists
      assert
        .dom('.debug-renderer')
        .exists('Debug view exists after renderer change');

      // Change back to verify it updates again
      this.context.rendererType = 'text';
      await settled();

      assert
        .dom('[data-renderer-type="text"]')
        .exists('Renderer type changed back to text');
      assert
        .dom('.debug-renderer')
        .doesNotExist('Debug view removed after changing back');

      // The content should have changed again
      const finalHTML = treeContainer.innerHTML;
      assert.notEqual(
        finalHTML,
        updatedHTML,
        'Tree container updated again when changing back',
      );
    });
  },
);
