import { module, test, skip } from 'qunit';
import { setupRenderingTest } from 'family-tree/tests/helpers';
import { render, fillIn, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { createMockFamily } from 'family-tree/tests/helpers/mock-genea-data';

module('Integration | Component | landing', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    // Mock genea service for search tests
    const mockFamily = createMockFamily();

    // Extract people from the mock family structure
    const mockPeople = Object.values(mockFamily.people);

    // Convert mock data to have the expected structure
    const allPeople = mockPeople.map((person) => ({
      id: person.id,
      name: person.attributes.name,
      comments: person.attributes.comments,
      parents: [], // Simplified for testing
      parentIn: [], // Simplified for testing
    }));

    // Update specific people to match test expectations
    const johnSmith = allPeople.find((p) => p.name === 'Grandpa Smith');
    if (johnSmith) {
      johnSmith.name = 'John Smith';
      johnSmith.comments = 'The grandfather';
      johnSmith.parentIn = [
        {
          children: [{ firstName: 'John Doe' }],
        },
      ];
    }

    const janeSm = allPeople.find((p) => p.name === 'Grandma Smith');
    if (janeSm) {
      janeSm.name = 'Jane Smith';
    }

    const johnDoe = allPeople.find((p) => p.name === 'Dad Smith');
    if (johnDoe) {
      johnDoe.name = 'John Doe';
      johnDoe.firstName = 'John';
    }

    const janeDoe = allPeople.find((p) => p.name === 'Mom Jones');
    if (janeDoe) {
      janeDoe.name = 'Jane Doe';
    }

    this.mockGeneaService = {
      isPopulated: () => true,
      populate: async () => Promise.resolve(),
      allPeople: () => allPeople,
      roots: () => ({ rootPeople: [] }),
    };

    this.owner.register('service:genea', this.mockGeneaService, {
      instantiate: false,
    });
  });

  test('it renders', async function (assert) {
    await render(hbs`<Landing />`);

    assert.dom('h1').hasText('Family Tree');
    assert.dom('.landing-page').exists();
  });

  skip('it displays search box', async function (assert) {
    // TODO: Fix failing test - see issue #13
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

  skip('it displays root ancestors', async function (assert) {
    // TODO: Fix failing test - see issue #13
    const rootPeople = [
      { id: 'gp1', name: 'Grandpa Smith' },
      { id: 'gp2', name: 'Grandma Smith' },
    ];

    this.set('rootPeople', rootPeople);
    await render(hbs`<Landing @rootPeople={{this.rootPeople}} />`);

    assert.dom('.root-ancestors h2').hasText('Root Ancestors');
    assert.dom('.ancestor-list').exists();
    assert.dom('.ancestor-list li').exists({ count: rootPeople.length });
  });

  skip('it displays link to all people', async function (assert) {
    // TODO: Fix failing test - see issue #13
    await render(hbs`<Landing />`);

    assert.dom('.all-link a').exists();
    assert.dom('.all-link a').hasText('View all people');
  });

  skip('it renders with empty root people', async function (assert) {
    // TODO: Fix failing test - see issue #13
    this.set('rootPeople', []);
    await render(hbs`<Landing @rootPeople={{this.rootPeople}} />`);

    assert.dom('.ancestor-list').exists();
    assert.dom('.ancestor-list li').doesNotExist();
  });

  module('Search functionality', function () {
    test('it shows search results when typing', async function (assert) {
      await render(hbs`<Landing />`);

      // Search for "John"
      await fillIn('#search-box', 'John');
      await waitFor('.search-results');

      assert.dom('.search-results').exists();
      assert.dom('.search-results-list').exists();
      // Should find John Smith (grandpa) and John Doe (dad)
      assert.dom('.search-result-item').exists({ count: 2 });
    });

    test('it filters results based on search term', async function (assert) {
      await render(hbs`<Landing />`);

      // Search for "Jane"
      await fillIn('#search-box', 'Jane');
      await waitFor('.search-results');

      // Should find Jane Smith (grandma) and Jane Doe (mom)
      assert.dom('.search-result-item').exists({ count: 2 });
      assert.dom('.search-result-item').includesText('Jane');
    });

    test('it requires minimum 2 characters for search', async function (assert) {
      await render(hbs`<Landing />`);

      // Type only one character
      await fillIn('#search-box', 'J');

      // Should not show results
      assert.dom('.search-results').doesNotExist();
    });

    test('it clears search results when search term is cleared', async function (assert) {
      await render(hbs`<Landing />`);

      // First search for something
      await fillIn('#search-box', 'John');
      await waitFor('.search-results');
      assert.dom('.search-results').exists();

      // Clear the search
      await fillIn('#search-box', '');
      assert.dom('.search-results').doesNotExist();
    });

    test('it displays person details in search results', async function (assert) {
      await render(hbs`<Landing />`);

      await fillIn('#search-box', 'John Smith');
      await waitFor('.search-results');

      assert.dom('.search-result-item').exists({ count: 1 });
      assert.dom('.person-details').exists();
      assert.dom('.person-comments').hasText('The grandfather');
      assert.dom('.person-children').includesText('Children:');
      assert.dom('.person-children').includesText('John Doe');
    });

    test('it shows no results when search matches nothing', async function (assert) {
      await render(hbs`<Landing />`);

      await fillIn('#search-box', 'Nobody');

      // Should not show results dropdown
      assert.dom('.search-results').doesNotExist();
    });

    test('search results contain clickable person links', async function (assert) {
      await render(hbs`<Landing />`);

      await fillIn('#search-box', 'John');
      await waitFor('.search-results');

      assert.dom('.search-result-item a').exists();
      assert.dom('.search-result-item a').hasClass('person-link');
    });

    test('it performs case-insensitive search', async function (assert) {
      await render(hbs`<Landing />`);

      // Search with different cases
      await fillIn('#search-box', 'JOHN');
      await waitFor('.search-results');
      assert.dom('.search-result-item').exists({ count: 2 });

      await fillIn('#search-box', 'john');
      await waitFor('.search-results');
      assert.dom('.search-result-item').exists({ count: 2 });
    });
  });
});
