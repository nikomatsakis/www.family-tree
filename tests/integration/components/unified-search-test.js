import { module, test } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render, fillIn, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | unified-search', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    // Create test data with middle names for fuzzy search testing
    const testPeople = [
      {
        id: '1',
        name: 'Elliot Beecher Stowe',
        comments: 'Test person with middle name',
        parents: [],
        parentIn: [],
      },
      {
        id: '2',
        name: 'Jonathan Michael Doe',
        comments: 'Another test person',
        parents: [],
        parentIn: [],
      },
      {
        id: '3',
        name: 'Jane Marie Smith',
        comments: '',
        parents: [],
        parentIn: [],
      },
      {
        id: '4',
        name: 'John William Carter',
        comments: 'Person with W middle initial',
        parents: [],
        parentIn: [],
      },
    ];

    this.mockGeneaService = {
      isPopulated: () => true,
      populate: async () => Promise.resolve(),
      allPeople: () => testPeople,
    };

    this.owner.register('service:genea', this.mockGeneaService, {
      instantiate: false,
    });
  });

  test('it renders', async function (assert) {
    await render(hbs`<UnifiedSearch />`);
    assert.dom('.person-search-container').exists();
    assert.dom('input.search-box').exists();
  });

  module('Fuzzy Search - Middle Name Skipping', function () {
    test('it finds person by partial first and last name, skipping middle name', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "Ell St" should find "Elliot Beecher Stowe"
      await fillIn('.search-box', 'Ell St');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('Elliot Beecher Stowe');
    });

    test('it finds person by first name and partial last name, skipping middle', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "Jon Doe" should find "Jonathan Michael Doe"
      await fillIn('.search-box', 'Jon Doe');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('Jonathan Michael Doe');
    });

    test('it finds person by partial first and middle name parts', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "Jane Mar" should find "Jane Marie Smith"
      await fillIn('.search-box', 'Jane Mar');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('Jane Marie Smith');
    });

    test('it finds person by first initial and last name', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "J Carter" should find "John William Carter"
      await fillIn('.search-box', 'J Carter');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('John William Carter');
    });

    test('it handles multiple word search terms', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "Elliot Stowe" should find "Elliot Beecher Stowe"
      await fillIn('.search-box', 'Elliot Stowe');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('Elliot Beecher Stowe');
    });

    test('it handles typos in search terms', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Search for "Eliot Sto" (typo) should find "Elliot Beecher Stowe"
      await fillIn('.search-box', 'Eliot Sto');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.search-result-item').includesText('Elliot Beecher Stowe');
    });
  });

  module('Search Exclusion', function () {
    test('it excludes specified person from results', async function (assert) {
      this.set('excludePerson', { id: '1' });

      await render(
        hbs`<UnifiedSearch @excludePerson={{this.excludePerson}} />`,
      );

      // Search for "Elliot" should not find "Elliot Beecher Stowe" since it's excluded
      await fillIn('.search-box', 'Elliot');

      // Should not show results since the only match is excluded
      assert.dom('.search-results').doesNotExist();
    });
  });

  module('Minimum Character Requirements', function () {
    test('it requires minimum 2 characters for search', async function (assert) {
      await render(hbs`<UnifiedSearch />`);

      // Single character should not trigger search
      await fillIn('.search-box', 'E');
      assert.dom('.search-results').doesNotExist();

      // Two characters should trigger search
      await fillIn('.search-box', 'El');
      await waitFor('.search-results');
      assert.dom('.search-results').exists();
    });
  });
});
