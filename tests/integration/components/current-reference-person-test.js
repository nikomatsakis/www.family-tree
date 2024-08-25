import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | current-reference-person', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<CurrentReferencePerson />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <CurrentReferencePerson>
        template block text
      </CurrentReferencePerson>
    `);

    assert.dom().hasText('template block text');
  });
});
