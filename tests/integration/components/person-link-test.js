import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | person-link', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set required person argument
    this.set('person', {
      id: 'test-id',
      name: 'Test Person'
    });

    await render(hbs`<PersonLink @person={{this.person}} />`);

    assert.dom().hasText('Test Person');
    assert.dom('a').exists('Should render a link');

    // Test with pagePerson to show bold text
    this.set('pagePerson', this.person);
    await render(hbs`<PersonLink @person={{this.person}} @pagePerson={{this.pagePerson}} />`);
    
    assert.dom('b').hasText('Test Person');
    assert.dom('a').doesNotExist('Should not render a link when person is pagePerson');
  });
});
