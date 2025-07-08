import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { loadGeneaFixture } from '../../helpers/genea-fixtures';

// 💡: Using vector-based testing approach instead of complex manual mocks
// This eliminates cognitive overhead of family semantics and makes relationship testing systematic
module('Unit | Service | genea - Relationship Calculations', function (hooks) {
  setupTest(hooks);

  // 💡: Test vectors format: [person1_name, person2_name, expected_sentence]
  // This approach makes it easy to add new relationship tests without debugging henry numbers
  const relationshipVectors = [
    // Basic family relationships
    ['Sponge', 'Book', "Sponge is Book's son"],
    ['Broom', 'Book', "Broom is Book's daughter"],
    ['Book', 'Sponge', "Book is Sponge's father"],
    ['Book', 'Broom', "Book is Broom's father"],
    ['Pen', 'Sponge', "Pen is Sponge's mother"],
    ['Pen', 'Broom', "Pen is Broom's mother"],

    // Sibling relationships
    ['Sponge', 'Broom', "Sponge is Broom's brother"],
    ['Broom', 'Sponge', "Broom is Sponge's sister"],

    // Uncle/Aunt relationships
    ['Table', 'Sponge', "Table is Sponge's uncle"],
    ['Table', 'Broom', "Table is Broom's uncle"],
    ['Sponge', 'Table', "Sponge is Table's nephew"],
    ['Broom', 'Table', "Broom is Table's niece"],

    // Grandparent relationships
    ['Sky', 'Sponge', "Sky is Sponge's grandfather"],
    ['Sky', 'Broom', "Sky is Broom's grandfather"],
    ['Moon', 'Sponge', "Moon is Sponge's grandmother"],
    ['Moon', 'Broom', "Moon is Broom's grandmother"],
    ['Sponge', 'Sky', "Sponge is Sky's grandson"],
    ['Broom', 'Sky', "Broom is Sky's granddaughter"],
    ['Sponge', 'Moon', "Sponge is Moon's grandson"],
    ['Broom', 'Moon', "Broom is Moon's granddaughter"],

    // Granduncle relationships
    ['Sun', 'Sponge', "Sun is Sponge's granduncle"],
    ['Sun', 'Broom', "Sun is Broom's granduncle"],
    ['Sponge', 'Sun', "Sponge is Sun's grandnephew"],
    ['Broom', 'Sun', "Broom is Sun's grandniece"],

    // Great-grandparent relationships
    ['Tree', 'Sponge', "Tree is Sponge's great grandfather"],
    ['Tree', 'Broom', "Tree is Broom's great grandfather"],
    ['River', 'Sponge', "River is Sponge's great grandmother"],
    ['River', 'Broom', "River is Broom's great grandmother"],
    ['Sponge', 'Tree', "Sponge is Tree's great grandson"],
    ['Broom', 'Tree', "Broom is Tree's great granddaughter"],

    // Great-granduncle relationships
    ['Mountain', 'Sponge', "Mountain is Sponge's great granduncle"],
    ['Mountain', 'Broom', "Mountain is Broom's great granduncle"],
    ['Sponge', 'Mountain', "Sponge is Mountain's great grandnephew"],
    ['Broom', 'Mountain', "Broom is Mountain's great grandniece"],

    // 💡: Adding cousin relationships (children of uncle/aunt are cousins)
    // First cousin relationships - system correctly returns "first cousin"
    ['Cup', 'Sponge', "Cup is Sponge's first cousin"],
    ['Cup', 'Broom', "Cup is Broom's first cousin"],
    ['Plate', 'Sponge', "Plate is Sponge's first cousin"],
    ['Plate', 'Broom', "Plate is Broom's first cousin"],
    ['Sponge', 'Cup', "Sponge is Cup's first cousin"],
    ['Sponge', 'Plate', "Sponge is Plate's first cousin"],
    ['Broom', 'Cup', "Broom is Cup's first cousin"],
    ['Broom', 'Plate', "Broom is Plate's first cousin"],

    // Cousin sibling relationships
    ['Cup', 'Plate', "Cup is Plate's brother"],
    ['Plate', 'Cup', "Plate is Cup's sister"],
  ];

  // 💡: Single test that iterates through all vectors instead of separate test functions
  // This approach reduces test maintenance overhead and makes patterns more visible
  test('calculates relationship sentences correctly', async function (assert) {
    const { allPeople } = await loadGeneaFixture('relationship-test-family');

    // 💡: Create lookup map for O(1) person finding instead of repeated array searches
    const personsByName = {};
    allPeople.forEach((person) => {
      personsByName[person.name] = person;
    });

    // Test each relationship vector
    for (const [
      person1Name,
      person2Name,
      expectedSentence,
    ] of relationshipVectors) {
      const person1 = personsByName[person1Name];
      const person2 = personsByName[person2Name];

      assert.ok(person1, `Should find person ${person1Name} in fixture`);
      assert.ok(person2, `Should find person ${person2Name} in fixture`);

      if (person1 && person2) {
        const relationships = person1.relationshipsTo(person2);
        assert.ok(
          relationships.length >= 1,
          `Should find relationship from ${person1Name} to ${person2Name}`,
        );

        if (relationships.length >= 1) {
          const actualSentence = relationships[0].sentence;
          assert.strictEqual(
            actualSentence,
            expectedSentence,
            `${person1Name} → ${person2Name}: expected "${expectedSentence}", got "${actualSentence}"`,
          );
        }
      }
    }
  });

  // 💡: Keeping one simple test for basic service functionality
  test('service loads relationship-test-family fixture correctly', async function (assert) {
    const { allPeople, service } = await loadGeneaFixture(
      'relationship-test-family',
    );

    assert.ok(service, 'Should load genea service');
    assert.ok(allPeople.length > 0, 'Should have people in fixture');

    // Verify key people exist
    const keyPeople = [
      'Sponge',
      'Broom',
      'Book',
      'Table',
      'Sky',
      'Mountain',
      'Cup',
      'Plate',
    ];
    keyPeople.forEach((name) => {
      const person = allPeople.find((p) => p.name === name);
      assert.ok(person, `Should find ${name} in fixture`);
    });
  });
});
