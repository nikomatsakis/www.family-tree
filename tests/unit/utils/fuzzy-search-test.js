import { module, test } from 'qunit';
import Fuse from 'fuse.js';

module('Unit | Utils | fuzzy-search', function () {
  // Historical figures test data for fun and pizzazz! 🎭
  const historicalFigures = [
    {
      id: '1',
      name: 'Leonardo Wilhelm da Vinci',
      comments: 'Renaissance polymath, inventor, and artist',
    },
    {
      id: '2',
      name: 'Marie Skłodowska Curie',
      comments: 'First woman to win a Nobel Prize',
    },
    {
      id: '3',
      name: 'Benjamin Franklin Roosevelt',
      comments: 'American polymath and Founding Father',
    },
    {
      id: '4',
      name: 'Cleopatra VII Philopator',
      comments: 'Last active pharaoh of Ancient Egypt',
    },
    {
      id: '5',
      name: 'Wolfgang Amadeus Mozart',
      comments: 'Prolific and influential composer',
    },
    {
      id: '6',
      name: 'Joan of Arc',
      comments: 'French peasant who became a military leader',
    },
    {
      id: '7',
      name: 'Albert Einstein',
      comments: 'Theoretical physicist who developed relativity theory',
    },
    {
      id: '8',
      name: 'Mahatma Mohandas Gandhi',
      comments: 'Leader of Indian independence movement',
    },
    {
      id: '9',
      name: 'Elizabeth Alexandra Windsor',
      comments: 'Queen Elizabeth II of the United Kingdom',
    },
    {
      id: '10',
      name: 'Martin Luther King Jr.',
      comments: 'American civil rights leader',
    }
  ];

  function performFuzzySearch(searchTerm, people = historicalFigures) {
    // Split search term into individual words for better matching
    const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);

    if (searchWords.length === 1) {
      // Single word search - use standard Fuse.js
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 0.8 },
          { name: 'comments', weight: 0.2 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
        findAllMatches: true,
      };

      const fuse = new Fuse(people, fuseOptions);
      const fuseResults = fuse.search(searchWords[0]);
      return fuseResults.map((result) => result.item);
    } else {
      // Multi-word search - use Fuse extended search with $and operator
      const fuseOptions = {
        keys: ['name', 'comments'],
        threshold: 0.3, // Slightly more strict for multi-word
        includeScore: true,
        ignoreLocation: true,
        findAllMatches: true,
        useExtendedSearch: true,
      };

      const fuse = new Fuse(people, fuseOptions);
      
      // Create $and query where each word must match somewhere in the name or comments
      const andQuery = {
        $and: searchWords.map(word => ({
          $or: [
            { name: word },
            { comments: word }
          ]
        }))
      };

      const fuseResults = fuse.search(andQuery);
      return fuseResults.map((result) => result.item);
    }
  }

  module('Middle Name Skipping', function () {
    test('finds Leonardo da Vinci by partial first and last name', function (assert) {
      const results = performFuzzySearch('Leo Vinci');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Leonardo Wilhelm da Vinci', 'Should find Leonardo da Vinci');
    });

    test('finds Marie Curie by skipping middle name', function (assert) {
      const results = performFuzzySearch('Marie Curie');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Marie Skłodowska Curie', 'Should find Marie Curie despite middle name');
    });

    test('finds Benjamin Roosevelt by partial names', function (assert) {
      const results = performFuzzySearch('Ben Roosevelt');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Benjamin Franklin Roosevelt', 'Should find Benjamin Roosevelt');
    });

    test('finds Mozart by partial first and middle name', function (assert) {
      const results = performFuzzySearch('Wolf Amadeus');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Wolfgang Amadeus Mozart', 'Should find Mozart by partial names');
    });

    test('finds Queen Elizabeth by first and last name', function (assert) {
      const results = performFuzzySearch('Elizabeth Windsor');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Elizabeth Alexandra Windsor', 'Should find Queen Elizabeth');
    });
  });

  module('Partial First and Last Name Matching', function () {
    test('finds Cleopatra with partial names', function (assert) {
      const results = performFuzzySearch('Cleo Phil');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Cleopatra VII Philopator', 'Should find Cleopatra');
    });

    test('finds Gandhi with partial names', function (assert) {
      const results = performFuzzySearch('Maha Gan');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Mahatma Mohandas Gandhi', 'Should find Gandhi');
    });

    test('finds Martin Luther King with initials and last name', function (assert) {
      const results = performFuzzySearch('M King');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Martin Luther King Jr.', 'Should find MLK');
    });
  });

  module('Single Word Search', function () {
    test('finds Einstein with single name', function (assert) {
      const results = performFuzzySearch('Einstein');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Albert Einstein', 'Should find Einstein');
    });

    test('finds Joan with partial first name', function (assert) {
      const results = performFuzzySearch('Joan');
      
      assert.strictEqual(results.length, 1, 'Should find exactly one result');
      assert.strictEqual(results[0].name, 'Joan of Arc', 'Should find Joan of Arc');
    });
  });

  module('Typo Tolerance', function () {
    test('finds Leonardo with typo in name', function (assert) {
      const results = performFuzzySearch('Leonrdo Vinci');
      
      assert.strictEqual(results.length, 1, 'Should find result despite typo');
      assert.strictEqual(results[0].name, 'Leonardo Wilhelm da Vinci', 'Should find Leonardo despite typo');
    });

    test('finds Mozart with typo in middle name', function (assert) {
      const results = performFuzzySearch('Wolfgang Amadues');
      
      assert.strictEqual(results.length, 1, 'Should find result despite typo');
      assert.strictEqual(results[0].name, 'Wolfgang Amadeus Mozart', 'Should find Mozart despite typo');
    });
  });

  module('Word Order Independence', function () {
    test('finds results regardless of word order', function (assert) {
      const forwardResults = performFuzzySearch('Marie Curie');
      const reverseResults = performFuzzySearch('Curie Marie');
      
      assert.strictEqual(forwardResults.length, 1, 'Forward order should find result');
      assert.strictEqual(reverseResults.length, 1, 'Reverse order should find result');
      assert.strictEqual(
        forwardResults[0].name, 
        reverseResults[0].name, 
        'Both orders should find the same person'
      );
    });

    test('finds Leonardo with words in different order', function (assert) {
      const results = performFuzzySearch('Vinci Leo');
      
      assert.strictEqual(results.length, 1, 'Should find result with reversed words');
      assert.strictEqual(results[0].name, 'Leonardo Wilhelm da Vinci', 'Should find Leonardo');
    });
  });

  module('Comments Field Search', function () {
    test('finds person by searching comments field', function (assert) {
      const results = performFuzzySearch('relativity');
      
      assert.strictEqual(results.length, 1, 'Should find result in comments');
      assert.strictEqual(results[0].name, 'Albert Einstein', 'Should find Einstein by comment content');
    });

    test('finds person by name and comment combination', function (assert) {
      const results = performFuzzySearch('Marie Nobel');
      
      assert.strictEqual(results.length, 1, 'Should find result combining name and comment');
      assert.strictEqual(results[0].name, 'Marie Skłodowska Curie', 'Should find Marie Curie');
    });
  });

  module('Edge Cases', function () {
    test('handles empty search gracefully', function (assert) {
      const results = performFuzzySearch('');
      
      assert.strictEqual(results.length, 0, 'Empty search should return no results');
    });

    test('handles single character search', function (assert) {
      const results = performFuzzySearch('A');
      
      // Should find people with 'A' in their name (Albert, Arc, Alexandra, etc.)
      assert.ok(results.length > 0, 'Single character should find some results');
      assert.ok(
        results.some(r => r.name.includes('A')), 
        'Results should contain people with A in their name'
      );
    });

    test('handles non-existent names gracefully', function (assert) {
      const results = performFuzzySearch('Nonexistent Person');
      
      assert.strictEqual(results.length, 0, 'Non-existent search should return no results');
    });

    test('handles special characters in search', function (assert) {
      const results = performFuzzySearch('Skłodowska');
      
      assert.strictEqual(results.length, 1, 'Should handle special characters');
      assert.strictEqual(results[0].name, 'Marie Skłodowska Curie', 'Should find Marie Curie');
    });
  });
});