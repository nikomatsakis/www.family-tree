import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { createMockFamily } from 'family-tree/tests/helpers/mock-genea-data';

module('Integration | Component | landing', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<Landing />`);

    assert.dom('h1').hasText('Family Tree');
    assert.dom('.landing-page').exists();
  });

  test('it displays search box', async function (assert) {
    await render(hbs`<Landing />`);

    assert.dom('input#search-box').exists();
    assert.dom('input#search-box').hasAttribute('type', 'text');
    assert
      .dom('input#search-box')
      .hasAttribute('placeholder', 'Search for a person...');
    assert.dom('label[for="search-box"]').hasText('Search for a person');
  });

  test('it updates search term on input', async function (assert) {
    await render(hbs`<Landing />`);

    await fillIn('#search-box', 'John Doe');
    assert.dom('#search-box').hasValue('John Doe');
  });

  test('it displays root ancestors', async function (assert) {
    const mockFamily = createMockFamily();
    const rootPeople = [mockFamily.grandpa, mockFamily.grandma];

    this.set('rootPeople', rootPeople);
    await render(hbs`<Landing @rootPeople={{this.rootPeople}} />`);

    assert.dom('.root-ancestors h2').hasText('Root Ancestors');
    assert.dom('.ancestor-list').exists();
    assert.dom('.ancestor-list li').exists({ count: rootPeople.length });
  });

  test('it displays link to all people', async function (assert) {
    await render(hbs`<Landing />`);

    assert.dom('.all-link a').exists();
    assert.dom('.all-link a').hasText('View all people');
  });

  test('it renders with empty root people', async function (assert) {
    this.set('rootPeople', []);
    await render(hbs`<Landing @rootPeople={{this.rootPeople}} />`);

    assert.dom('.ancestor-list').exists();
    assert.dom('.ancestor-list li').doesNotExist();
  });
});
