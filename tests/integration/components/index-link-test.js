import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | index-link', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<IndexLink />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <IndexLink>
        template block text
      </IndexLink>
    `);

    assert.dom().hasText('template block text');
  });
});
