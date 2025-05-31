import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';
import { Person, Partnership } from 'family-tree/services/genea';

module('Unit | Service | genea', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let service = this.owner.lookup('service:genea');
    assert.ok(service);
  });

  test('allPeople throws error when not populated', function (assert) {
    let service = this.owner.lookup('service:genea');

    assert.throws(
      () => service.allPeople(),
      /genea not populated/,
      'Throws error when service is not populated',
    );
  });

  module('Relationship Calculations', function (hooks) {
    hooks.beforeEach(function () {
      // Create a mock service with just the methods Person/Partnership need
      this.mockService = {
        populatedPersonById(id) {
          return this._people[id];
        },
        populatedPersonFromRelationship(r) {
          if (!r || !r.id) return null;
          return this._people[r.id];
        },
        _partnership(r) {
          if (!r || !r.id) return null;
          return this._partnerships[r.id];
        },
        _people: {},
        _partnerships: {},
      };

      // Helper to create a person
      this.createPerson = (id, name, gender = 'unknown') => {
        const person = new Person(
          this.mockService,
          id,
          { name, gender, comments: '', isSpouse: false },
          { childIn: { data: null }, parentIn: { data: [] } },
        );
        this.mockService._people[id] = person;
        return person;
      };

      // Helper to create a partnership
      this.createPartnership = (id, parentIds, childIds) => {
        const partnership = new Partnership(
          this.mockService,
          id,
          {},
          {
            parents: { data: parentIds.map((id) => ({ type: 'person', id })) },
            children: { data: childIds.map((id) => ({ type: 'person', id })) },
          },
        );
        this.mockService._partnerships[id] = partnership;
        return partnership;
      };

      // Helper to recreate a person with updated relationships
      this.updatePersonRelationships = (id, updatedRelationships) => {
        const person = this.mockService._people[id];
        const newPerson = new Person(
          this.mockService,
          id,
          {
            name: person.name,
            gender: person.gender,
            comments: person.comments || '',
            isSpouse: person.isSpouse || false,
          },
          updatedRelationships,
        );
        this.mockService._people[id] = newPerson;
        return newPerson;
      };
    });

    test('calculates sibling relationships correctly', function (assert) {
      // Create parents
      const dad = this.createPerson('dad', 'John Smith', 'male');
      const mom = this.createPerson('mom', 'Jane Smith', 'female');

      // Create children
      const brother = this.createPerson('brother', 'Bob Smith', 'male');
      const sister = this.createPerson('sister', 'Alice Smith', 'female');

      // Create parent partnership
      this.createPartnership('parents', ['dad', 'mom'], ['brother', 'sister']);

      // Update relationships for parents
      this.updatePersonRelationships('dad', {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'parents' }] },
      });
      this.updatePersonRelationships('mom', {
        childIn: { data: null },
        parentIn: { data: [{ type: 'partnership', id: 'parents' }] },
      });

      // Update relationships for children
      const brotherUpdated = this.updatePersonRelationships('brother', {
        childIn: { data: { type: 'partnership', id: 'parents' } },
        parentIn: { data: [] },
      });
      const sisterUpdated = this.updatePersonRelationships('sister', {
        childIn: { data: { type: 'partnership', id: 'parents' } },
        parentIn: { data: [] },
      });

      // Calculate relationships
      const relationships = brotherUpdated.relationshipsTo(sisterUpdated);

      // Basic assertions
      assert.ok(relationships, 'Should return relationships array');
      assert.strictEqual(
        relationships.length,
        1,
        'Should find exactly one relationship path',
      );

      const relationship = relationships[0];
      assert.ok(relationship, 'Should have a relationship object');

      // Check the relationship name
      const relationshipName = relationship.name;
      assert.strictEqual(
        relationshipName,
        'sister',
        'Brother to sister should be "sister"',
      );
    });

    test('detects when people are not related', function (assert) {
      // Create two separate families
      const person1 = this.createPerson('p1', 'Person One');
      const person2 = this.createPerson('p2', 'Person Two');

      // Set up their internal relationships
      person1['#relationships'] = person1.relationships = {
        childIn: { data: null },
        parentIn: { data: [] },
      };
      person2['#relationships'] = person2.relationships = {
        childIn: { data: null },
        parentIn: { data: [] },
      };

      // Calculate relationships
      const relationships = person1.relationshipsTo(person2);

      assert.strictEqual(
        relationships.length,
        0,
        'Should find no relationships between unrelated people',
      );
    });
  });
});
