import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | person-outline', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set up mock person with required properties
    this.set('person', {
      id: 'test-id',
      name: 'Test Person',
      parentIn: [] // Empty array for no partnerships
    });

    await render(hbs`<PersonOutline @person={{this.person}} />`);

    assert.dom('li').hasText('Test Person');

    // Test with partnerships
    const partner = { id: 'partner-id', name: 'Partner Name' };
    const child = { id: 'child-id', name: 'Child Name' };
    
    this.set('personWithFamily', {
      id: 'parent-id',
      name: 'Parent Name',
      parentIn: [{
        partnerTo(person) { return partner; },
        children: [child],
        parentSet: {
          isSubsetOf() { return true; }
        }
      }]
    });

    await render(hbs`<PersonOutline @person={{this.personWithFamily}} />`);
    
    assert.dom('li').includesText('Parent Name');
    assert.dom('li').includesText('+');
  });
});
