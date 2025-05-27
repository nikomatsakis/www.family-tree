import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | make-reference-person', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set required person argument
    this.set('person', {
      id: 'test-id',
      name: 'John Smith',
    });

    await render(hbs`<MakeReferencePerson @person={{this.person}} />`);

    assert.dom().hasText('(make John Smith the reference person)');
    assert.dom('a').exists('Should render a link');
  });
});
