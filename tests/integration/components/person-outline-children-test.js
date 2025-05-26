import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | person-outline-children', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set up mock data with proper structure for PersonOutline
    const child1 = { 
      id: 'child1', 
      name: 'Child One',
      parentIn: [] // Required by PersonOutline
    };
    const child2 = { 
      id: 'child2', 
      name: 'Child Two',
      parentIn: [] // Required by PersonOutline  
    };
    
    this.set('partnership', {
      children: [child1, child2]
    });

    await render(hbs`<PersonOutlineChildren @partnership={{this.partnership}} />`);

    assert.dom('ul').exists('Should render a list');
    assert.dom('li').exists({ count: 2 }, 'Should render two children');

    // Test with empty partnership
    this.set('emptyPartnership', { children: [] });
    await render(hbs`<PersonOutlineChildren @partnership={{this.emptyPartnership}} />`);
    
    assert.dom('ul').doesNotExist('Should not render list for empty children');
  });
});
