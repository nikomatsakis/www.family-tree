import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | person-outline', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<PersonOutline />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <PersonOutline>
        template block text
      </PersonOutline>
    `);

    assert.dom().hasText('template block text');
  });
});
