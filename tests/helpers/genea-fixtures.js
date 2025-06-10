// Helper to load genea test fixtures and populate the genea service
import { Person, Partnership, Roots } from 'family-tree/services/genea';

/**
 * Load a test fixture and populate a genea service with real data
 * @param {string} fixtureName - Name of the fixture (e.g., 'simple-family')
 * @returns {Promise<Object>} Object with { service, startPersonId }
 */
export async function loadGeneaFixture(fixtureName) {
  // Load the fixture JSON file
  const response = await fetch(
    `/tests/fixtures/json/${fixtureName}/roots.json`,
  );
  const { data, included } = await response.json();

  // Create a mock service that mimics the real genea service structure
  const mockService = {
    _people: {},
    _partnerships: {},
    _roots: null,

    populatedPersonById(id) {
      const person = this._people[id];
      if (!person) {
        throw new Error(`no person defined with id ${id}`);
      }
      return person;
    },

    populatedPersonFromRelationship(r) {
      if (!r || !r.id) return null;
      return this._people[r.id];
    },

    _partnership(r) {
      if (!r || !r.id) return null;
      return this._partnerships[r.id];
    },

    allPeople() {
      return Object.values(this._people);
    },

    roots() {
      return this._roots;
    },

    isPopulated() {
      return this._roots !== null;
    },
  };

  // Populate the service with real data from the fixture
  mockService._roots = new Roots(
    mockService,
    data.attributes,
    data.relationships,
  );

  for (let object of included) {
    switch (object.type) {
      case 'person':
        mockService._people[object.id] = new Person(
          mockService,
          object.id,
          object.attributes,
          object.relationships,
        );
        break;

      case 'partnership':
        mockService._partnerships[object.id] = new Partnership(
          mockService,
          object.id,
          object.attributes,
          object.relationships,
        );
        break;

      default:
        throw new Error(`unexpected type of object ${object.type}`);
    }
  }

  // Find the first person to use as a starting point
  const startPersonId =
    data.relationships.rootPeople.data[0]?.id ||
    Object.keys(mockService._people)[0];
  const startPerson = mockService._people[startPersonId];

  return {
    service: mockService,
    startPerson,
    startPersonId,
    allPeople: Object.values(mockService._people),
  };
}
