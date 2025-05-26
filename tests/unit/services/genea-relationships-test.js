import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Service from '@ember/service';
import { Person, Partnership, Relationship } from 'family-tree/services/genea';
import {
  createMockPerson,
  createMockPartnership,
  createMockFamily,
  createComplexMockFamily,
} from '../../helpers/mock-genea-data';

// Mock GeneaService that provides test data
class MockGeneaService extends Service {
  constructor(mockData) {
    super(...arguments);
    this.mockData = mockData;
    this._setupData();
  }

  _setupData() {
    // Create Person instances from mock data
    this.people = {};
    this.partnerships = {};

    // First pass: create all instances
    for (const [id, data] of Object.entries(this.mockData.people)) {
      this.people[id] = new Person(
        this,
        id,
        data.attributes,
        data.relationships,
      );
    }

    for (const [id, data] of Object.entries(this.mockData.partnerships)) {
      this.partnerships[id] = new Partnership(
        this,
        id,
        data.attributes,
        data.relationships,
      );
    }
  }

  populatedPersonById(id) {
    return this.people[id];
  }

  populatedPersonFromRelationship(r) {
    if (!r || !r.id) return null;
    return this.people[r.id];
  }

  _partnership(r) {
    if (!r || !r.id) return null;
    return this.partnerships[r.id];
  }
}

module('Unit | Service | genea - Relationship Calculations', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // We'll set up mock data for each test
    this.createService = (mockData) => {
      return new MockGeneaService(mockData);
    };
  });

  test('calculates sibling relationships correctly', function (assert) {
    // Create a family with siblings
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    // Get the two siblings
    const child1 = service.people['c1'];
    const child2 = service.people['c2'];

    // Calculate relationships
    const relationships = child1.relationshipsTo(child2);

    // Assertions
    assert.strictEqual(
      relationships.length,
      1,
      'Should find exactly one relationship path',
    );

    const relationship = relationships[0];
    assert.ok(
      relationship instanceof Relationship,
      'Should return a Relationship instance',
    );

    // The common ancestor for siblings should be their parent partnership
    assert.ok(relationship.commonAncestor, 'Should have a common ancestor');

    // The relationship name should be "sister" since c1 is male and c2 is female
    const relationshipName = relationship.name;
    assert.strictEqual(
      relationshipName,
      'sister',
      'Should be sister relationship',
    );

    // Test reverse relationship
    const reverseRelationships = child2.relationshipsTo(child1);
    assert.strictEqual(
      reverseRelationships.length,
      1,
      'Should find exactly one reverse relationship path',
    );
    assert.strictEqual(
      reverseRelationships[0].name,
      'brother',
      'Reverse relationship should be brother',
    );
  });

  test('calculates cousin relationships through shared grandparents', function (assert) {
    // Create a family with cousins
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    // Get a child and their cousin
    const child1 = service.people['c1'];
    const cousin1 = service.people['cousin1'];

    // Calculate relationships
    const relationships = child1.relationshipsTo(cousin1);

    // Assertions
    assert.ok(
      relationships.length >= 1,
      'Should find at least one relationship path',
    );

    const relationship = relationships[0];
    assert.ok(
      relationship instanceof Relationship,
      'Should return a Relationship instance',
    );

    // The relationship name should indicate cousinhood
    const relationshipName = relationship.name;
    assert.ok(
      relationshipName.includes('cousin'),
      `Relationship name should indicate cousin: got "${relationshipName}"`,
    );

    // For first cousins, should specifically be "first cousin"
    assert.ok(
      relationshipName.includes('first cousin'),
      `Should be first cousin: got "${relationshipName}"`,
    );
  });

  test('handles complex multi-generation relationships', function (assert) {
    // Create a complex family
    const mockData = createComplexMockFamily();
    const service = this.createService(mockData);

    // Test great-grandparent to great-grandchild
    const greatGrandparent = service.people['ggp1'];
    const child = service.people['c1'];

    const relationships = child.relationshipsTo(greatGrandparent);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship from child to great-grandparent',
    );

    const relationshipName = relationships[0].name;
    assert.ok(
      relationshipName.includes('great'),
      `Should contain 'great' in great-grandparent relationship: got "${relationshipName}"`,
    );
    assert.ok(
      relationshipName.includes('grand'),
      `Should contain 'grand' in great-grandparent relationship: got "${relationshipName}"`,
    );
  });

  test('detects when people are not related', function (assert) {
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    // Create an unrelated person
    mockData.people['unrelated'] = {
      id: 'unrelated',
      type: 'person',
      attributes: { name: 'Unrelated Person', gender: 'unknown' },
      relationships: { childIn: { data: null }, parentIn: { data: [] } },
    };
    service._setupData(); // Refresh the service data

    const child = service.people['c1'];
    const unrelated = service.people['unrelated'];

    const relationships = child.relationshipsTo(unrelated);
    assert.strictEqual(
      relationships.length,
      0,
      'Should find no relationships between unrelated people',
    );
  });

  test('handles self-relationships appropriately', function (assert) {
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    const person = service.people['c1'];

    // Note: The current implementation has a bug where it checks startPerson !== thatPerson
    // in the Relationship constructor, which would fail for self-relationships
    // This test documents the expected behavior

    try {
      const relationships = person.relationshipsTo(person);
      assert.strictEqual(
        relationships.length,
        0,
        'Should handle self-relationship gracefully',
      );
    } catch (e) {
      assert.ok(false, 'Should not throw error for self-relationship');
    }
  });

  test('calculates uncle/aunt and nephew/niece relationships', function (assert) {
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    // Get child and their aunt
    const child = service.people['c1'];
    const aunt = service.people['p2'];

    const relationships = child.relationshipsTo(aunt);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship between child and aunt',
    );

    // p2 is female and is c1's parent's sibling, so should be "aunt"
    const relationshipName = relationships[0].name;
    assert.strictEqual(relationshipName, 'aunt', 'Should be aunt relationship');
  });

  test('calculates second cousin relationships', function (assert) {
    const mockData = createComplexMockFamily();
    const service = this.createService(mockData);

    // Get two second cousins
    const child = service.people['c1'];
    const secondCousin = service.people['cousin2'];

    const relationships = child.relationshipsTo(secondCousin);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship between second cousins',
    );

    const relationshipName = relationships[0].name;
    assert.ok(
      relationshipName.includes('second cousin'),
      `Should identify second cousin relationship: got "${relationshipName}"`,
    );
  });

  test('identifies step-siblings correctly', function (assert) {
    // Create a family where two people are step-siblings
    // They share no biological parents but their parents are married
    const mockData = {
      people: {},
      partnerships: {},
    };

    // Create the four parents
    mockData.people['dad1'] = createMockPerson(
      null,
      'dad1',
      { name: 'Dad One', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: {
          data: [
            { type: 'partnership', id: 'p1' },
            { type: 'partnership', id: 'step-marriage' },
          ],
        },
      },
    );
    mockData.people['mom1'] = createMockPerson(
      null,
      'mom1',
      { name: 'Mom One', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'p1' }] },
      },
    );
    mockData.people['dad2'] = createMockPerson(
      null,
      'dad2',
      { name: 'Dad Two', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'p2' }] },
      },
    );
    mockData.people['mom2'] = createMockPerson(
      null,
      'mom2',
      { name: 'Mom Two', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: {
          data: [
            { type: 'partnership', id: 'p2' },
            { type: 'partnership', id: 'step-marriage' },
          ],
        },
      },
    );

    // Create the step-siblings
    mockData.people['child1'] = createMockPerson(
      null,
      'child1',
      { name: 'Child One', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'p1' } },
        parentIn: { data: [] },
      },
    );
    mockData.people['child2'] = createMockPerson(
      null,
      'child2',
      { name: 'Child Two', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'p2' } },
        parentIn: { data: [] },
      },
    );

    // Create the partnerships
    mockData.partnerships['p1'] = createMockPartnership(
      null,
      'p1',
      ['dad1', 'mom1'],
      ['child1'],
    );
    mockData.partnerships['p2'] = createMockPartnership(
      null,
      'p2',
      ['dad2', 'mom2'],
      ['child2'],
    );
    mockData.partnerships['step-marriage'] = createMockPartnership(
      null,
      'step-marriage',
      ['dad1', 'mom2'],
      [],
    );

    const service = this.createService(mockData);
    const child1 = service.people['child1'];
    const child2 = service.people['child2'];

    const relationships = child1.relationshipsTo(child2);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship between step-siblings',
    );

    const relationshipName = relationships[0].name;
    assert.strictEqual(
      relationshipName,
      'step-sister',
      'Should identify as step-sister',
    );
  });

  test('identifies half-siblings correctly', function (assert) {
    // Create a family where two people share one parent
    const mockData = {
      people: {},
      partnerships: {},
    };

    mockData.people['sharedDad'] = createMockPerson(
      null,
      'sharedDad',
      { name: 'Shared Dad', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: {
          data: [
            { type: 'partnership', id: 'p1' },
            { type: 'partnership', id: 'p2' },
          ],
        },
      },
    );
    mockData.people['mom1'] = createMockPerson(
      null,
      'mom1',
      { name: 'Mom One', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'p1' }] },
      },
    );
    mockData.people['mom2'] = createMockPerson(
      null,
      'mom2',
      { name: 'Mom Two', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'p2' }] },
      },
    );

    mockData.people['child1'] = createMockPerson(
      null,
      'child1',
      { name: 'Child One', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'p1' } },
        parentIn: { data: [] },
      },
    );
    mockData.people['child2'] = createMockPerson(
      null,
      'child2',
      { name: 'Child Two', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'p2' } },
        parentIn: { data: [] },
      },
    );

    mockData.partnerships['p1'] = createMockPartnership(
      null,
      'p1',
      ['sharedDad', 'mom1'],
      ['child1'],
    );
    mockData.partnerships['p2'] = createMockPartnership(
      null,
      'p2',
      ['sharedDad', 'mom2'],
      ['child2'],
    );

    const service = this.createService(mockData);
    const child1 = service.people['child1'];
    const child2 = service.people['child2'];

    const relationships = child1.relationshipsTo(child2);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship between half-siblings',
    );

    // Half-siblings share one parent, so they should still be identified as siblings
    const relationshipName = relationships[0].name;
    assert.strictEqual(
      relationshipName,
      'sister',
      'Half-siblings should still be identified as siblings',
    );
  });

  test('handles partner/spouse relationships', function (assert) {
    const mockData = {
      people: {},
      partnerships: {},
    };

    mockData.people['husband'] = createMockPerson(
      null,
      'husband',
      { name: 'John Doe', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'marriage' }] },
      },
    );
    mockData.people['wife'] = createMockPerson(
      null,
      'wife',
      { name: 'Jane Doe', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'marriage' }] },
      },
    );

    mockData.partnerships['marriage'] = createMockPartnership(
      null,
      'marriage',
      ['husband', 'wife'],
      [],
    );

    const service = this.createService(mockData);
    const husband = service.people['husband'];
    const wife = service.people['wife'];

    const relationships = husband.relationshipsTo(wife);
    assert.strictEqual(
      relationships.length,
      1,
      'Should find exactly one relationship between spouses',
    );

    assert.strictEqual(
      relationships[0].name,
      'wife',
      'Should identify spouse relationship correctly',
    );

    // Test reverse
    const reverseRelationships = wife.relationshipsTo(husband);
    assert.strictEqual(
      reverseRelationships[0].name,
      'husband',
      'Reverse spouse relationship should be correct',
    );
  });

  test('handles great-grandparent relationships', function (assert) {
    const mockData = {
      people: {},
      partnerships: {},
    };

    // Create a 4-generation family
    mockData.people['ggp'] = createMockPerson(
      null,
      'ggp',
      { name: 'Great-Grandparent', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'ggp-p' }] },
      },
    );
    mockData.people['gp'] = createMockPerson(
      null,
      'gp',
      { name: 'Grandparent', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'ggp-p' } },
        parentIn: { data: [{ type: 'partnership', id: 'gp-p' }] },
      },
    );
    mockData.people['p'] = createMockPerson(
      null,
      'p',
      { name: 'Parent', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'gp-p' } },
        parentIn: { data: [{ type: 'partnership', id: 'p-p' }] },
      },
    );
    mockData.people['c'] = createMockPerson(
      null,
      'c',
      { name: 'Child', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'p-p' } },
        parentIn: { data: [] },
      },
    );

    mockData.partnerships['ggp-p'] = createMockPartnership(
      null,
      'ggp-p',
      ['ggp'],
      ['gp'],
    );
    mockData.partnerships['gp-p'] = createMockPartnership(
      null,
      'gp-p',
      ['gp'],
      ['p'],
    );
    mockData.partnerships['p-p'] = createMockPartnership(
      null,
      'p-p',
      ['p'],
      ['c'],
    );

    const service = this.createService(mockData);
    const child = service.people['c'];
    const greatGrandparent = service.people['ggp'];

    const relationships = child.relationshipsTo(greatGrandparent);
    assert.ok(
      relationships.length >= 1,
      'Should find relationship to great-grandparent',
    );

    const relationshipName = relationships[0].name;
    assert.strictEqual(
      relationshipName,
      'great grandson',
      'Should identify great-grandchild relationship correctly',
    );
  });

  test('handles missing partnership data gracefully', function (assert) {
    const mockData = {
      people: {},
      partnerships: {},
    };

    // Create a person with a reference to a non-existent partnership
    mockData.people['orphan'] = createMockPerson(
      null,
      'orphan',
      { name: 'Orphan', gender: 'unknown' },
      {
        childIn: { data: { type: 'partnership', id: 'missing' } },
        parentIn: { data: [] },
      },
    );

    const service = this.createService(mockData);
    const orphan = service.people['orphan'];

    // Should handle missing partnership gracefully
    assert.strictEqual(
      orphan.childIn,
      null,
      'Missing partnership should result in null childIn',
    );
    assert.deepEqual(
      orphan.parents,
      [],
      'Missing partnership should result in empty parents array',
    );
  });

  test('handles multiple partnerships to same person', function (assert) {
    // Edge case: same two people have multiple partnerships (remarriage?)
    const mockData = {
      people: {},
      partnerships: {},
    };

    mockData.people['p1'] = createMockPerson(
      null,
      'p1',
      { name: 'Person One', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: {
          data: [
            { type: 'partnership', id: 'marriage1' },
            { type: 'partnership', id: 'marriage2' },
          ],
        },
      },
    );
    mockData.people['p2'] = createMockPerson(
      null,
      'p2',
      { name: 'Person Two', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: {
          data: [
            { type: 'partnership', id: 'marriage1' },
            { type: 'partnership', id: 'marriage2' },
          ],
        },
      },
    );

    mockData.partnerships['marriage1'] = createMockPartnership(
      null,
      'marriage1',
      ['p1', 'p2'],
      [],
    );
    mockData.partnerships['marriage2'] = createMockPartnership(
      null,
      'marriage2',
      ['p1', 'p2'],
      [],
    );

    const service = this.createService(mockData);
    const person1 = service.people['p1'];
    const person2 = service.people['p2'];

    const relationships = person1.relationshipsTo(person2);
    assert.strictEqual(
      relationships.length,
      1,
      'Should deduplicate multiple partnerships to same person',
    );

    assert.strictEqual(
      relationships[0].name,
      'wife',
      'Should identify as wife/partner regardless of multiple partnerships',
    );
  });

  test('handles double cousins (related through both parents)', function (assert) {
    // Two families where siblings marry siblings, making their children double cousins
    const mockData = {
      people: {},
      partnerships: {},
    };

    // Family A grandparents
    mockData.people['gp1a'] = createMockPerson(
      null,
      'gp1a',
      { name: 'Grandpa Family A', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'gp1' }] },
      },
    );
    mockData.people['gp1b'] = createMockPerson(
      null,
      'gp1b',
      { name: 'Grandma Family A', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'gp1' }] },
      },
    );

    // Family B grandparents
    mockData.people['gp2a'] = createMockPerson(
      null,
      'gp2a',
      { name: 'Grandpa Family B', gender: 'male' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'gp2' }] },
      },
    );
    mockData.people['gp2b'] = createMockPerson(
      null,
      'gp2b',
      { name: 'Grandma Family B', gender: 'female' },
      {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'gp2' }] },
      },
    );

    // Siblings from Family A
    mockData.people['dad'] = createMockPerson(
      null,
      'dad',
      { name: 'Dad (from Family A)', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'gp1' } },
        parentIn: { data: [{ type: 'partnership', id: 'parents1' }] },
      },
    );
    mockData.people['uncle'] = createMockPerson(
      null,
      'uncle',
      { name: 'Uncle (from Family A)', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'gp1' } },
        parentIn: { data: [{ type: 'partnership', id: 'parents2' }] },
      },
    );

    // Siblings from Family B
    mockData.people['mom'] = createMockPerson(
      null,
      'mom',
      { name: 'Mom (from Family B)', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'gp2' } },
        parentIn: { data: [{ type: 'partnership', id: 'parents1' }] },
      },
    );
    mockData.people['aunt'] = createMockPerson(
      null,
      'aunt',
      { name: 'Aunt (from Family B)', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'gp2' } },
        parentIn: { data: [{ type: 'partnership', id: 'parents2' }] },
      },
    );

    // The double cousins
    mockData.people['child1'] = createMockPerson(
      null,
      'child1',
      { name: 'Child 1', gender: 'male' },
      {
        childIn: { data: { type: 'partnership', id: 'parents1' } },
        parentIn: { data: [] },
      },
    );
    mockData.people['child2'] = createMockPerson(
      null,
      'child2',
      { name: 'Child 2', gender: 'female' },
      {
        childIn: { data: { type: 'partnership', id: 'parents2' } },
        parentIn: { data: [] },
      },
    );

    // Partnerships
    mockData.partnerships['gp1'] = createMockPartnership(
      null,
      'gp1',
      ['gp1a', 'gp1b'],
      ['dad', 'uncle'],
    );
    mockData.partnerships['gp2'] = createMockPartnership(
      null,
      'gp2',
      ['gp2a', 'gp2b'],
      ['mom', 'aunt'],
    );
    mockData.partnerships['parents1'] = createMockPartnership(
      null,
      'parents1',
      ['dad', 'mom'],
      ['child1'],
    );
    mockData.partnerships['parents2'] = createMockPartnership(
      null,
      'parents2',
      ['uncle', 'aunt'],
      ['child2'],
    );

    const service = this.createService(mockData);
    const child1 = service.people['child1'];
    const child2 = service.people['child2'];

    const relationships = child1.relationshipsTo(child2);
    assert.ok(
      relationships.length >= 2,
      'Double cousins should have multiple relationship paths',
    );

    // All relationships should be "first cousin" but via different paths
    const relationshipNames = relationships.map((r) => r.name);
    const allFirstCousins = relationshipNames.every((name) =>
      name.includes('first cousin'),
    );
    assert.ok(allFirstCousins, 'All relationships should be first cousin');
  });

  test('handles complex relationship deduplication', function (assert) {
    // Test that duplicate relationships through identical paths are properly deduplicated
    const mockData = createMockFamily();
    const service = this.createService(mockData);

    // Get two siblings - they might have multiple paths through parents
    const child1 = service.people['c1'];
    const child2 = service.people['c2'];

    const relationships = child1.relationshipsTo(child2);

    // Check for exact duplicates
    const relationshipNames = relationships.map((r) => r.name);

    assert.strictEqual(
      relationships.length,
      1,
      'Should deduplicate to single sibling relationship',
    );

    assert.strictEqual(
      relationshipNames[0],
      'sister',
      'Should identify as sister',
    );
  });
});
