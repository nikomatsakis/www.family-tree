import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | make-reference-person', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<MakeReferencePerson />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <MakeReferencePerson>
        template block text
      </MakeReferencePerson>
    `);

    assert.dom().hasText('template block text');
  });
});
