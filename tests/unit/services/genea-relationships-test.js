import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Service from '@ember/service';
import { Person, Partnership, Relationship } from 'family-tree/services/genea';
import {
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

    // The relationship name should indicate siblinghood
    const relationshipName = relationship.name;
    const isSibling =
      relationshipName.includes('sister') ||
      relationshipName.includes('sibling');
    assert.ok(
      isSibling,
      `Relationship name should indicate sibling: got "${relationshipName}"`,
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

    const relationshipName = relationships[0].name;
    assert.ok(
      relationshipName.includes('aunt'),
      `Should identify aunt relationship: got "${relationshipName}"`,
    );
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
});
