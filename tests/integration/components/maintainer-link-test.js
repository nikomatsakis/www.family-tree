import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | maintainer-link', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Mock the genea service
    const mockGenea = {
      roots() {
        return {
          maintainerLink: 'https://example.com/edit?id=$ID&name=$NAME',
        };
      },
    };
    this.owner.register('service:genea', mockGenea, { instantiate: false });

    // Set required person argument
    this.set('person', {
      id: 'test-id',
      name: 'Test Person',
    });

    await render(hbs`<MaintainerLink @person={{this.person}} />`);

    assert.dom('a').hasText('See a mistake? Suggest an edit!');
    assert
      .dom('a')
      .hasAttribute(
        'href',
        'https://example.com/edit?id=test-id&name=Test%20Person',
      );
    assert.dom('a').hasAttribute('target', '_blank');
  });
});
