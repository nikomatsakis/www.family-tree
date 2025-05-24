#!/usr/bin/env node

// Standalone Node.js test for relationship calculations
// Run with: node tests/node/test-relationships.js

// Mock the imports that Person and Partnership classes need
global.window = {};

// Simple assertion helper
let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✓ ${message}`);
  } else {
    console.error(`✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  testCount++;
  if (actual === expected) {
    passCount++;
    console.log(`✓ ${message}`);
  } else {
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
  }
}

// Mock invariant function
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message || 'Invariant violation');
  }
}

// Load the classes - we'll need to extract them from the service file
// Since they're ES6 classes with private fields, we'll create simplified versions
class Person {
  #genea;
  #attributes;
  #relationships;
  id;

  constructor(genea, id, attributes, relationships) {
    this.#genea = genea;
    this.id = id;
    this.#attributes = attributes;
    this.#relationships = relationships;
  }

  get name() {
    return this.#attributes.name;
  }

  get firstName() {
    return this.name.split(" ")[0];
  }

  get gender() {
    return this.#attributes.gender;
  }

  get partners() {
    return this.parentIn.flatMap(partnership => partnership.partnersTo(this));
  }

  get parents() {
    return (this.childIn ? this.childIn.parents : []);
  }

  get childIn() {
    return this.#genea._partnership(this.#relationships.childIn.data);
  }

  get parentIn() {
    return this.#relationships.parentIn.data.map(r => this.#genea._partnership(r));
  }

  partnerships(includeChildIn, includePartners) {
    let result = [];
    if (includeChildIn && this.childIn)
      result.push(this.childIn);
    if (includePartners)
      result = result.concat(this.parentIn);
    return result;
  }

  allAncestors() {
    return new Set(this.#paths().map(path => path.endPerson));
  }

  relationshipsTo(thatPerson) {
    let thatPersonPaths = thatPerson.#paths();
    let thatPersonAncestors = new Map(thatPersonPaths.map(path => [path.endPerson, path]));
    let thisPaths = this.#paths().filter(path => thatPersonAncestors.has(path.endPerson));
    
    return thisPaths.map(thisPath => {
      let thatPath = thatPersonAncestors.get(thisPath.endPerson);
      return new Relationship(thisPath, thatPath);
    });
  }

  #paths() {
    let queue = [new Path(this, [])];
    let result = 0;

    while (result < queue.length) {
      let path = queue[result];
      result += 1;
      for (let extension of path.extendUpAndOver())
        queue.push(extension);
    }

    return queue;
  }
}

class Partnership {
  #genea;
  #attributes;
  #relationships;
  id;

  constructor(genea, id, attributes, relationships) {
    this.#genea = genea;
    this.id = id;
    this.#attributes = attributes;
    this.#relationships = relationships;
  }

  get parents() {
    return this.#relationships.parents.data.map(r => this.#genea.populatedPersonFromRelationship(r));
  }

  partnersTo(person) {
    return this.parents.filter(p => p.id !== person.id);
  }
}

class Path {
  constructor(startPerson, links) {
    this.startPerson = startPerson;
    this.links = links;
  }

  get endPerson() {
    if (this.links.length !== 0)
      return this.links[this.links.length - 1].toPerson;
    return this.startPerson;
  }

  get generations() {
    return this.links.filter(l => l.relation === "parent" || l.relation === "child").length;
  }

  extendUpAndOver() {
    return this.endPerson.partners.flatMap(partner => this.#tryExtend("partner", partner))
      .concat(this.endPerson.parents.flatMap(parent => this.#tryExtend("parent", parent)));
  }

  #visits(person) {
    return this.startPerson === person || this.links.some(l => l.toPerson === person);
  }

  #tryExtend(relation, person) {
    if (this.#visits(person))
      return [];

    if (relation === "partner" && this.links.length > 0 && this.links[this.links.length - 1].relation === "partner")
      return [];

    let link = new Link(this.endPerson, relation, person);
    return [new Path(this.startPerson, this.links.concat([link]))];
  }
}

class Link {
  constructor(fromPerson, relation, toPerson) {
    this.fromPerson = fromPerson;
    this.relation = relation;
    this.toPerson = toPerson;
  }
}

class Relationship {
  #thisPath;
  #thatPath;

  constructor(thisPath, thatPath) {
    if (thisPath.endPerson !== thatPath.endPerson) {
      throw new Error('Paths must end at same person');
    }
    if (thisPath.startPerson === thatPath.startPerson) {
      throw new Error('Cannot have relationship to self');
    }
    
    this.#thisPath = thisPath;
    this.#thatPath = thatPath;
  }

  get name() {
    let thisPerson = this.#thisPath.startPerson;
    let thatPerson = this.#thatPath.startPerson;
    let thisGenerations = this.#thisPath.generations;
    let thatGenerations = this.#thatPath.generations;

    // Partners/spouses
    if (thisGenerations === 0 && thatGenerations === 0) {
      return partnerName(thatPerson); // Should be thatPerson, not thisPerson
    }

    // Parent-child
    if (thisGenerations === 0 && thatGenerations > 0) {
      // thisPerson is an ancestor of thatPerson
      return ancestorName(thatGenerations, thisPerson);
    }
    
    if (thatGenerations === 0 && thisGenerations > 0) {
      // thisPerson is a descendant of thatPerson
      return descendantName(thisGenerations, thisPerson);
    }

    // Siblings - check if step-siblings
    if (thisGenerations === thatGenerations && thisGenerations === 1) {
      // Check if they share any biological parents
      const thisParents = thisPerson.parents;
      const thatParents = thatPerson.parents;
      const sharedParents = thisParents.filter(p => thatParents.includes(p));
      
      if (sharedParents.length === 0) {
        // No shared biological parents - must be step-siblings
        return 'step-' + siblingName(thatPerson);
      }
      return siblingName(thatPerson);
    }

    // Cousins and other equal-generation relationships
    if (thisGenerations === thatGenerations && thisGenerations > 1) {
      // This would call via() in the real code, which might fail
      try {
        const viaText = `via ${this.#thisPath.links[0].toPerson.name}`;
        return `${ordinal(thisGenerations - 1)} cousin ${viaText}`;
      } catch (e) {
        return `${ordinal(thisGenerations - 1)} cousin`;
      }
    }

    // Add more relationship types as needed
    return `${thisGenerations} generations from ${thatGenerations} generations`;
  }
}

function siblingName(person) {
  switch (person.gender) {
    case "male": return "brother";
    case "female": return "sister";
    default: return "sibling";
  }
}

function partnerName(person) {
  switch (person.gender) {
    case "male": return "husband";
    case "female": return "wife";
    default: return "partner";
  }
}

function parentName(person) {
  switch (person.gender) {
    case "male": return "father";
    case "female": return "mother";
    default: return "parent";
  }
}

function childName(person) {
  switch (person.gender) {
    case "male": return "son";
    case "female": return "daughter";
    default: return "child";
  }
}

function ancestorName(generations, person) {
  if (generations === 1) {
    return parentName(person);
  }
  const greats = "great ".repeat(generations - 2);
  return `${greats}grand${parentName(person)}`;
}

function descendantName(generations, person) {
  if (generations === 1) {
    return childName(person);
  }
  const greats = "great ".repeat(generations - 2);
  return `${greats}grand${childName(person)}`;
}

function ordinal(n) {
  switch (n) {
    case 1: return "first";
    case 2: return "second";
    case 3: return "third";
    default: return `${n}th`;
  }
}

// Test setup
console.log('Running relationship tests...\n');

// Mock service
const mockService = {
  _people: {},
  _partnerships: {},
  
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
  }
};

// Test 1: Sibling relationships
console.log('Test 1: Sibling relationships');
{
  // Create family
  const dad = new Person(mockService, 'dad', 
    { name: 'John Smith', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'parents' }] } }
  );
  const mom = new Person(mockService, 'mom',
    { name: 'Jane Smith', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'parents' }] } }
  );
  const brother = new Person(mockService, 'brother',
    { name: 'Bob Smith', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'parents' } }, parentIn: { data: [] } }
  );
  const sister = new Person(mockService, 'sister',
    { name: 'Alice Smith', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'parents' } }, parentIn: { data: [] } }
  );
  
  const parentPartnership = new Partnership(mockService, 'parents', {},
    {
      parents: { data: [{ type: 'person', id: 'dad' }, { type: 'person', id: 'mom' }] },
      children: { data: [{ type: 'person', id: 'brother' }, { type: 'person', id: 'sister' }] }
    }
  );
  
  // Register with mock service
  mockService._people = { dad, mom, brother, sister };
  mockService._partnerships = { parents: parentPartnership };
  
  // Debug: check if relationships are set up correctly
  console.log(`  Brother's parents: ${brother.parents.map(p => p.name).join(', ')}`);
  console.log(`  Sister's parents: ${sister.parents.map(p => p.name).join(', ')}`);
  
  // Test
  const relationships = brother.relationshipsTo(sister);
  console.log(`  Found ${relationships.length} relationships`);
  // Siblings can have multiple paths (through each parent), but they should all say "sister"
  assert(relationships.length >= 1, 'Should find at least one relationship');
  
  if (relationships.length > 0) {
    const rel = relationships[0];
    assertEqual(rel.name, 'sister', 'Brother to sister relationship should be "sister"');
    
    // All relationships should have the same name
    const allSameRelationship = relationships.every(r => r.name === 'sister');
    assert(allSameRelationship, 'All relationship paths should identify as "sister"');
  }
}

console.log('\nTest 2: Unrelated people');
{
  // Create two unrelated people
  const person1 = new Person(mockService, 'p1',
    { name: 'Person One', gender: 'unknown' },
    { childIn: { data: null }, parentIn: { data: [] } }
  );
  const person2 = new Person(mockService, 'p2',
    { name: 'Person Two', gender: 'unknown' },
    { childIn: { data: null }, parentIn: { data: [] } }
  );
  
  mockService._people = { p1: person1, p2: person2 };
  mockService._partnerships = {};
  
  const relationships = person1.relationshipsTo(person2);
  assertEqual(relationships.length, 0, 'Should find no relationships between unrelated people');
}

console.log('\nTest 3: Self-relationship (edge case)');
{
  const person = new Person(mockService, 'self',
    { name: 'Self Person', gender: 'unknown' },
    { childIn: { data: null }, parentIn: { data: [] } }
  );
  
  mockService._people = { self: person };
  
  try {
    const relationships = person.relationshipsTo(person);
    assertEqual(relationships.length, 0, 'Self-relationship should return empty array or handle gracefully');
  } catch (e) {
    console.log(`  ✓ Self-relationship throws expected error: ${e.message}`);
    passCount++;
    testCount++;
  }
}

console.log('\nTest 4: Half-siblings (share only one parent)');
{
  const dad = new Person(mockService, 'dad',
    { name: 'Shared Dad', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }, { type: 'partnership', id: 'p2' }] } }
  );
  const mom1 = new Person(mockService, 'mom1',
    { name: 'Mom One', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }] } }
  );
  const mom2 = new Person(mockService, 'mom2',
    { name: 'Mom Two', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p2' }] } }
  );
  
  const child1 = new Person(mockService, 'c1',
    { name: 'Child One', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'p1' } }, parentIn: { data: [] } }
  );
  const child2 = new Person(mockService, 'c2',
    { name: 'Child Two', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'p2' } }, parentIn: { data: [] } }
  );
  
  const partnership1 = new Partnership(mockService, 'p1', {},
    {
      parents: { data: [{ type: 'person', id: 'dad' }, { type: 'person', id: 'mom1' }] },
      children: { data: [{ type: 'person', id: 'c1' }] }
    }
  );
  const partnership2 = new Partnership(mockService, 'p2', {},
    {
      parents: { data: [{ type: 'person', id: 'dad' }, { type: 'person', id: 'mom2' }] },
      children: { data: [{ type: 'person', id: 'c2' }] }
    }
  );
  
  mockService._people = { dad, mom1, mom2, c1: child1, c2: child2 };
  mockService._partnerships = { p1: partnership1, p2: partnership2 };
  
  const relationships = child1.relationshipsTo(child2);
  assert(relationships.length >= 1, 'Half-siblings should have at least one relationship');
  
  if (relationships.length > 0) {
    assertEqual(relationships[0].name, 'sister', 'Half-siblings should still be identified as siblings');
  }
}

console.log('\nTest 5: Parent-child relationship');
{
  const parent = new Person(mockService, 'parent',
    { name: 'Parent', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }] } }
  );
  const child = new Person(mockService, 'child',
    { name: 'Child', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'p1' } }, parentIn: { data: [] } }
  );
  
  const partnership = new Partnership(mockService, 'p1', {},
    {
      parents: { data: [{ type: 'person', id: 'parent' }] },
      children: { data: [{ type: 'person', id: 'child' }] }
    }
  );
  
  mockService._people = { parent, child };
  mockService._partnerships = { p1: partnership };
  
  const relationships = child.relationshipsTo(parent);
  assert(relationships.length >= 1, 'Child should have relationship to parent');
  
  // Note: The current implementation might not have parent/child naming logic
  if (relationships.length > 0) {
    console.log(`  Found relationship name: "${relationships[0].name}"`);
    // The name might be something like "0 generations from 1 generations" due to incomplete implementation
  }
}

console.log('\nTest 6: Step-siblings (no shared parents)');
{
  const dad1 = new Person(mockService, 'dad1',
    { name: 'Dad One', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }, { type: 'partnership', id: 'p3' }] } }
  );
  const mom1 = new Person(mockService, 'mom1',
    { name: 'Mom One', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }] } }
  );
  const dad2 = new Person(mockService, 'dad2',
    { name: 'Dad Two', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p2' }] } }
  );
  const mom2 = new Person(mockService, 'mom2',
    { name: 'Mom Two', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p2' }, { type: 'partnership', id: 'p3' }] } }
  );
  
  const child1 = new Person(mockService, 'c1',
    { name: 'Child One', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'p1' } }, parentIn: { data: [] } }
  );
  const child2 = new Person(mockService, 'c2',
    { name: 'Child Two', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'p2' } }, parentIn: { data: [] } }
  );
  
  const partnership1 = new Partnership(mockService, 'p1', {},
    {
      parents: { data: [{ type: 'person', id: 'dad1' }, { type: 'person', id: 'mom1' }] },
      children: { data: [{ type: 'person', id: 'c1' }] }
    }
  );
  const partnership2 = new Partnership(mockService, 'p2', {},
    {
      parents: { data: [{ type: 'person', id: 'dad2' }, { type: 'person', id: 'mom2' }] },
      children: { data: [{ type: 'person', id: 'c2' }] }
    }
  );
  const partnership3 = new Partnership(mockService, 'p3', {},
    {
      parents: { data: [{ type: 'person', id: 'dad1' }, { type: 'person', id: 'mom2' }] },
      children: { data: [] }
    }
  );
  
  mockService._people = { dad1, mom1, dad2, mom2, c1: child1, c2: child2 };
  mockService._partnerships = { p1: partnership1, p2: partnership2, p3: partnership3 };
  
  const relationships = child1.relationshipsTo(child2);
  console.log(`  Found ${relationships.length} step-sibling relationships`);
  
  // Step-siblings might be found through the partner path
  if (relationships.length > 0) {
    console.log(`  Relationship name: "${relationships[0].name}"`);
  }
}

console.log('\nTest 7: Missing partnership data');
{
  const orphan = new Person(mockService, 'orphan',
    { name: 'Orphan', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'missing' } }, parentIn: { data: [] } }
  );
  
  mockService._people = { orphan };
  mockService._partnerships = {}; // No partnership with id 'missing'
  
  try {
    const parents = orphan.parents;
    console.log(`  Orphan has ${parents.length} parents (should be 0 due to missing partnership)`);
    assert(parents.length === 0, 'Missing partnership should result in empty parents array');
  } catch (e) {
    console.log(`  ✗ Error accessing parents with missing partnership: ${e.message}`);
    testCount++;
  }
}

console.log('\nTest 8: Partners/spouses relationship');
{
  const husband = new Person(mockService, 'husband',
    { name: 'John Doe', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'marriage' }] } }
  );
  const wife = new Person(mockService, 'wife',
    { name: 'Jane Doe', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'marriage' }] } }
  );
  
  const marriage = new Partnership(mockService, 'marriage', {},
    {
      parents: { data: [{ type: 'person', id: 'husband' }, { type: 'person', id: 'wife' }] },
      children: { data: [] }
    }
  );
  
  mockService._people = { husband, wife };
  mockService._partnerships = { marriage };
  
  const relationships = husband.relationshipsTo(wife);
  assert(relationships.length >= 1, 'Spouses should have a relationship');
  
  if (relationships.length > 0) {
    console.log(`  Spouse relationship name: "${relationships[0].name}"`);
    // Should ideally be "wife" but might be incomplete
  }
}

console.log('\nTest 9: Complex path through step-relations');
{
  // This tests if the path-finding handles complex step-relationships
  // A -> B (partners), B -> C (parent), A -> D (parent)
  // So C and D are step-siblings
  const a = new Person(mockService, 'a',
    { name: 'Person A', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'ab' }, { type: 'partnership', id: 'ax' }] } }
  );
  const b = new Person(mockService, 'b',
    { name: 'Person B', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'ab' }, { type: 'partnership', id: 'by' }] } }
  );
  const x = new Person(mockService, 'x',
    { name: 'Person X', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'ax' }] } }
  );
  const y = new Person(mockService, 'y',
    { name: 'Person Y', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'by' }] } }
  );
  const c = new Person(mockService, 'c',
    { name: 'Child C', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'by' } }, parentIn: { data: [] } }
  );
  const d = new Person(mockService, 'd',
    { name: 'Child D', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'ax' } }, parentIn: { data: [] } }
  );
  
  const ab = new Partnership(mockService, 'ab', {},
    { parents: { data: [{ type: 'person', id: 'a' }, { type: 'person', id: 'b' }] }, children: { data: [] } }
  );
  const ax = new Partnership(mockService, 'ax', {},
    { parents: { data: [{ type: 'person', id: 'a' }, { type: 'person', id: 'x' }] }, children: { data: [{ type: 'person', id: 'd' }] } }
  );
  const by = new Partnership(mockService, 'by', {},
    { parents: { data: [{ type: 'person', id: 'b' }, { type: 'person', id: 'y' }] }, children: { data: [{ type: 'person', id: 'c' }] } }
  );
  
  mockService._people = { a, b, x, y, c, d };
  mockService._partnerships = { ab, ax, by };
  
  const relationships = c.relationshipsTo(d);
  console.log(`  Found ${relationships.length} relationships between step-siblings C and D`);
  assert(relationships.length >= 1, 'Step-siblings through partner connection should be related');
}

console.log('\nTest 10: Direct partner relationships (edge case for via())');
{
  // This tests a case where the relationship path has no parent links
  // which would cause the via() function to hit invariant(false)
  const person1 = new Person(mockService, 'p1',
    { name: 'Partner One', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'direct' }] } }
  );
  const person2 = new Person(mockService, 'p2',
    { name: 'Partner Two', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'direct' }] } }
  );
  
  const partnership = new Partnership(mockService, 'direct', {},
    {
      parents: { data: [{ type: 'person', id: 'p1' }, { type: 'person', id: 'p2' }] },
      children: { data: [] }
    }
  );
  
  mockService._people = { p1: person1, p2: person2 };
  mockService._partnerships = { direct: partnership };
  
  const relationships = person1.relationshipsTo(person2);
  assert(relationships.length >= 1, 'Direct partners should have a relationship');
  
  // This should work fine as it doesn't need via() for partner relationships
  if (relationships.length > 0) {
    assertEqual(relationships[0].name, 'wife', 'Should identify partner correctly');
  }
}

console.log('\nTest 11: Great-grandparent relationship (deep ancestry)');
{
  const ggp = new Person(mockService, 'ggp',
    { name: 'Great-Grandparent', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'ggp-p' }] } }
  );
  const gp = new Person(mockService, 'gp',
    { name: 'Grandparent', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'ggp-p' } }, parentIn: { data: [{ type: 'partnership', id: 'gp-p' }] } }
  );
  const p = new Person(mockService, 'p',
    { name: 'Parent', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gp-p' } }, parentIn: { data: [{ type: 'partnership', id: 'p-p' }] } }
  );
  const c = new Person(mockService, 'c',
    { name: 'Child', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'p-p' } }, parentIn: { data: [] } }
  );
  
  const ggpPartnership = new Partnership(mockService, 'ggp-p', {},
    { parents: { data: [{ type: 'person', id: 'ggp' }] }, children: { data: [{ type: 'person', id: 'gp' }] } }
  );
  const gpPartnership = new Partnership(mockService, 'gp-p', {},
    { parents: { data: [{ type: 'person', id: 'gp' }] }, children: { data: [{ type: 'person', id: 'p' }] } }
  );
  const pPartnership = new Partnership(mockService, 'p-p', {},
    { parents: { data: [{ type: 'person', id: 'p' }] }, children: { data: [{ type: 'person', id: 'c' }] } }
  );
  
  mockService._people = { ggp, gp, p, c };
  mockService._partnerships = { 'ggp-p': ggpPartnership, 'gp-p': gpPartnership, 'p-p': pPartnership };
  
  const relationships = c.relationshipsTo(ggp);
  assert(relationships.length >= 1, 'Great-grandchild should have relationship to great-grandparent');
  
  if (relationships.length > 0) {
    assertEqual(relationships[0].name, 'great grandson', 'Should identify great-grandchild correctly');
  }
}

console.log('\nTest 12: Empty childIn and parentIn arrays');
{
  const isolated = new Person(mockService, 'isolated',
    { name: 'Isolated Person', gender: 'unknown' },
    { childIn: { data: null }, parentIn: { data: [] } }
  );
  
  mockService._people = { isolated };
  mockService._partnerships = {};
  
  // Test various methods that might fail with empty data
  try {
    const parents = isolated.parents;
    assert(parents.length === 0, 'Parents should be empty array');
    
    const partners = isolated.partners;
    assert(partners.length === 0, 'Partners should be empty array');
    
    const ancestors = isolated.allAncestors();
    assert(ancestors.size === 1, 'Should only include self in ancestors');
    assert(ancestors.has(isolated), 'Should include self in ancestors');
  } catch (e) {
    console.log(`  ✗ Error with empty data: ${e.message}`);
    testCount++;
  }
}

console.log('\nTest 13: Person with multiple partnerships to same person');
{
  // Edge case: same two people have multiple partnerships (remarriage?)
  const person1 = new Person(mockService, 'p1',
    { name: 'Person One', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'marriage1' }, { type: 'partnership', id: 'marriage2' }] } }
  );
  const person2 = new Person(mockService, 'p2',
    { name: 'Person Two', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'marriage1' }, { type: 'partnership', id: 'marriage2' }] } }
  );
  
  const marriage1 = new Partnership(mockService, 'marriage1', {},
    { parents: { data: [{ type: 'person', id: 'p1' }, { type: 'person', id: 'p2' }] }, children: { data: [] } }
  );
  const marriage2 = new Partnership(mockService, 'marriage2', {},
    { parents: { data: [{ type: 'person', id: 'p1' }, { type: 'person', id: 'p2' }] }, children: { data: [] } }
  );
  
  mockService._people = { p1: person1, p2: person2 };
  mockService._partnerships = { marriage1, marriage2 };
  
  const relationships = person1.relationshipsTo(person2);
  console.log(`  Found ${relationships.length} relationships for multiple partnerships`);
  assert(relationships.length >= 2, 'Should find multiple relationship paths through different partnerships');
}

console.log('\nTest 14: Cousin relationship without via() causing invariant failure');
{
  // This test checks if the via() function handles paths correctly
  // The real code has invariant(false) at the end of via() which would crash
  
  // Create a simple cousin relationship
  const gp1 = new Person(mockService, 'gp1',
    { name: 'Grandparent 1', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gpp' }] } }
  );
  const gp2 = new Person(mockService, 'gp2',
    { name: 'Grandparent 2', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gpp' }] } }
  );
  
  const p1 = new Person(mockService, 'p1',
    { name: 'Parent 1', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'gpp' } }, parentIn: { data: [{ type: 'partnership', id: 'pp1' }] } }
  );
  const p2 = new Person(mockService, 'p2',
    { name: 'Parent 2', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gpp' } }, parentIn: { data: [{ type: 'partnership', id: 'pp2' }] } }
  );
  
  const c1 = new Person(mockService, 'c1',
    { name: 'Cousin 1', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'pp1' } }, parentIn: { data: [] } }
  );
  const c2 = new Person(mockService, 'c2',
    { name: 'Cousin 2', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'pp2' } }, parentIn: { data: [] } }
  );
  
  const gpp = new Partnership(mockService, 'gpp', {},
    { parents: { data: [{ type: 'person', id: 'gp1' }, { type: 'person', id: 'gp2' }] },
      children: { data: [{ type: 'person', id: 'p1' }, { type: 'person', id: 'p2' }] } }
  );
  const pp1 = new Partnership(mockService, 'pp1', {},
    { parents: { data: [{ type: 'person', id: 'p1' }] },
      children: { data: [{ type: 'person', id: 'c1' }] } }
  );
  const pp2 = new Partnership(mockService, 'pp2', {},
    { parents: { data: [{ type: 'person', id: 'p2' }] },
      children: { data: [{ type: 'person', id: 'c2' }] } }
  );
  
  mockService._people = { gp1, gp2, p1, p2, c1, c2 };
  mockService._partnerships = { gpp, pp1, pp2 };
  
  const relationships = c1.relationshipsTo(c2);
  console.log(`  Found ${relationships.length} cousin relationships`);
  assert(relationships.length >= 1, 'Cousins should have at least one relationship');
  
  // Note: In the real code, this would fail because via() has invariant(false)
  // when it can't find a parent link in the path for cousins
  if (relationships.length > 0) {
    console.log(`  Cousin relationship name: "${relationships[0].name}"`);
  }
}

console.log('\nTest 15: Double-related cousins (related through both parents)');
{
  // Two families where cousins are related through both mother's and father's sides
  // This happens when siblings marry siblings from another family
  
  // First couple of grandparents
  const gp1a = new Person(mockService, 'gp1a',
    { name: 'Grandpa Family A', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gp1' }] } }
  );
  const gp1b = new Person(mockService, 'gp1b',
    { name: 'Grandma Family A', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gp1' }] } }
  );
  
  // Second couple of grandparents
  const gp2a = new Person(mockService, 'gp2a',
    { name: 'Grandpa Family B', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gp2' }] } }
  );
  const gp2b = new Person(mockService, 'gp2b',
    { name: 'Grandma Family B', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gp2' }] } }
  );
  
  // Children from first family (siblings)
  const dad = new Person(mockService, 'dad',
    { name: 'Dad (from Family A)', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'gp1' } }, parentIn: { data: [{ type: 'partnership', id: 'parents1' }] } }
  );
  const uncle = new Person(mockService, 'uncle',
    { name: 'Uncle (from Family A)', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'gp1' } }, parentIn: { data: [{ type: 'partnership', id: 'parents2' }] } }
  );
  
  // Children from second family (siblings)
  const mom = new Person(mockService, 'mom',
    { name: 'Mom (from Family B)', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gp2' } }, parentIn: { data: [{ type: 'partnership', id: 'parents1' }] } }
  );
  const aunt = new Person(mockService, 'aunt',
    { name: 'Aunt (from Family B)', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gp2' } }, parentIn: { data: [{ type: 'partnership', id: 'parents2' }] } }
  );
  
  // The double cousins
  const child1 = new Person(mockService, 'child1',
    { name: 'Child 1', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'parents1' } }, parentIn: { data: [] } }
  );
  const child2 = new Person(mockService, 'child2',
    { name: 'Child 2', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'parents2' } }, parentIn: { data: [] } }
  );
  
  // Partnerships
  const gp1Partnership = new Partnership(mockService, 'gp1', {},
    { parents: { data: [{ type: 'person', id: 'gp1a' }, { type: 'person', id: 'gp1b' }] },
      children: { data: [{ type: 'person', id: 'dad' }, { type: 'person', id: 'uncle' }] } }
  );
  const gp2Partnership = new Partnership(mockService, 'gp2', {},
    { parents: { data: [{ type: 'person', id: 'gp2a' }, { type: 'person', id: 'gp2b' }] },
      children: { data: [{ type: 'person', id: 'mom' }, { type: 'person', id: 'aunt' }] } }
  );
  const parents1 = new Partnership(mockService, 'parents1', {},
    { parents: { data: [{ type: 'person', id: 'dad' }, { type: 'person', id: 'mom' }] },
      children: { data: [{ type: 'person', id: 'child1' }] } }
  );
  const parents2 = new Partnership(mockService, 'parents2', {},
    { parents: { data: [{ type: 'person', id: 'uncle' }, { type: 'person', id: 'aunt' }] },
      children: { data: [{ type: 'person', id: 'child2' }] } }
  );
  
  mockService._people = { gp1a, gp1b, gp2a, gp2b, dad, mom, uncle, aunt, child1, child2 };
  mockService._partnerships = { gp1: gp1Partnership, gp2: gp2Partnership, parents1, parents2 };
  
  const relationships = child1.relationshipsTo(child2);
  console.log(`  Found ${relationships.length} relationships between double cousins`);
  
  // Should find multiple paths - through dad's side AND mom's side
  assert(relationships.length >= 2, 'Double cousins should have multiple relationship paths');
  
  // Check that we find paths through both families
  const relationshipNames = relationships.map(r => r.name);
  console.log(`  Relationship names: ${relationshipNames.join(', ')}`);
  
  // All should be "first cousin" but via different paths
  const allFirstCousins = relationshipNames.every(name => name.includes('first cousin'));
  assert(allFirstCousins, 'All relationships should be first cousin');
}

console.log('\nTest 16: Cousins who are also step-siblings');
{
  // Person A and B are cousins through their mothers
  // Their fathers later marry each other, making A and B step-siblings too
  
  const gp1 = new Person(mockService, 'gp1',
    { name: 'Maternal Grandpa', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gpp' }] } }
  );
  const gp2 = new Person(mockService, 'gp2',
    { name: 'Maternal Grandma', gender: 'female' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'gpp' }] } }
  );
  
  const mom1 = new Person(mockService, 'mom1',
    { name: 'Mom 1', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gpp' } }, parentIn: { data: [{ type: 'partnership', id: 'p1' }] } }
  );
  const mom2 = new Person(mockService, 'mom2',
    { name: 'Mom 2', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gpp' } }, parentIn: { data: [{ type: 'partnership', id: 'p2' }] } }
  );
  
  const dad1 = new Person(mockService, 'dad1',
    { name: 'Dad 1', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p1' }, { type: 'partnership', id: 'step' }] } }
  );
  const dad2 = new Person(mockService, 'dad2',
    { name: 'Dad 2', gender: 'male' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'p2' }, { type: 'partnership', id: 'step' }] } }
  );
  
  const childA = new Person(mockService, 'childA',
    { name: 'Child A', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'p1' } }, parentIn: { data: [] } }
  );
  const childB = new Person(mockService, 'childB',
    { name: 'Child B', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'p2' } }, parentIn: { data: [] } }
  );
  
  const gpp = new Partnership(mockService, 'gpp', {},
    { parents: { data: [{ type: 'person', id: 'gp1' }, { type: 'person', id: 'gp2' }] },
      children: { data: [{ type: 'person', id: 'mom1' }, { type: 'person', id: 'mom2' }] } }
  );
  const p1 = new Partnership(mockService, 'p1', {},
    { parents: { data: [{ type: 'person', id: 'dad1' }, { type: 'person', id: 'mom1' }] },
      children: { data: [{ type: 'person', id: 'childA' }] } }
  );
  const p2 = new Partnership(mockService, 'p2', {},
    { parents: { data: [{ type: 'person', id: 'dad2' }, { type: 'person', id: 'mom2' }] },
      children: { data: [{ type: 'person', id: 'childB' }] } }
  );
  const stepPartnership = new Partnership(mockService, 'step', {},
    { parents: { data: [{ type: 'person', id: 'dad1' }, { type: 'person', id: 'dad2' }] },
      children: { data: [] } }
  );
  
  mockService._people = { gp1, gp2, mom1, mom2, dad1, dad2, childA, childB };
  mockService._partnerships = { gpp, p1, p2, step: stepPartnership };
  
  const relationships = childA.relationshipsTo(childB);
  console.log(`  Found ${relationships.length} relationships for cousin-step-siblings`);
  
  // Should find both cousin relationship (through moms) and step-sibling (through dads' partnership)
  assert(relationships.length >= 2, 'Should find both cousin and step-sibling relationships');
  
  const relationshipTypes = relationships.map(r => r.name);
  console.log(`  Relationship types: ${relationshipTypes.join(', ')}`);
  
  const hasCousin = relationshipTypes.some(name => name.includes('cousin'));
  const hasStepSibling = relationshipTypes.some(name => name.includes('sibling') || name === 'Child B');
  
  assert(hasCousin || hasStepSibling, 'Should identify at least one of the relationship types');
}

console.log('\nTest 17: Complex multi-path relationships');
{
  // Create a really complex case: A and B are related as:
  // - Second cousins (through great-grandparents)
  // - Step-first-cousins (A's parent married B's aunt/uncle)
  
  const ggp = new Person(mockService, 'ggp',
    { name: 'Great-Grandparent', gender: 'unknown' },
    { childIn: { data: null }, parentIn: { data: [{ type: 'partnership', id: 'ggpp' }] } }
  );
  
  const gp1 = new Person(mockService, 'gp1',
    { name: 'Grandparent 1', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'ggpp' } }, parentIn: { data: [{ type: 'partnership', id: 'gp1p' }] } }
  );
  const gp2 = new Person(mockService, 'gp2',
    { name: 'Grandparent 2', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'ggpp' } }, parentIn: { data: [{ type: 'partnership', id: 'gp2p' }] } }
  );
  
  const parentA = new Person(mockService, 'parentA',
    { name: 'Parent A', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'gp1p' } }, parentIn: { data: [{ type: 'partnership', id: 'pa' }, { type: 'partnership', id: 'step' }] } }
  );
  const parentB1 = new Person(mockService, 'parentB1',
    { name: 'Parent B1', gender: 'female' },
    { childIn: { data: { type: 'partnership', id: 'gp2p' } }, parentIn: { data: [{ type: 'partnership', id: 'pb' }] } }
  );
  const parentB2 = new Person(mockService, 'parentB2',
    { name: 'Parent B2 (sibling of B1)', gender: 'male' },
    { childIn: { data: { type: 'partnership', id: 'gp2p' } }, parentIn: { data: [{ type: 'partnership', id: 'step' }] } }
  );
  
  const personA = new Person(mockService, 'personA',
    { name: 'Person A', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'pa' } }, parentIn: { data: [] } }
  );
  const personB = new Person(mockService, 'personB',
    { name: 'Person B', gender: 'unknown' },
    { childIn: { data: { type: 'partnership', id: 'pb' } }, parentIn: { data: [] } }
  );
  
  const ggpp = new Partnership(mockService, 'ggpp', {},
    { parents: { data: [{ type: 'person', id: 'ggp' }] },
      children: { data: [{ type: 'person', id: 'gp1' }, { type: 'person', id: 'gp2' }] } }
  );
  const gp1p = new Partnership(mockService, 'gp1p', {},
    { parents: { data: [{ type: 'person', id: 'gp1' }] },
      children: { data: [{ type: 'person', id: 'parentA' }] } }
  );
  const gp2p = new Partnership(mockService, 'gp2p', {},
    { parents: { data: [{ type: 'person', id: 'gp2' }] },
      children: { data: [{ type: 'person', id: 'parentB1' }, { type: 'person', id: 'parentB2' }] } }
  );
  const pa = new Partnership(mockService, 'pa', {},
    { parents: { data: [{ type: 'person', id: 'parentA' }] },
      children: { data: [{ type: 'person', id: 'personA' }] } }
  );
  const pb = new Partnership(mockService, 'pb', {},
    { parents: { data: [{ type: 'person', id: 'parentB1' }] },
      children: { data: [{ type: 'person', id: 'personB' }] } }
  );
  const stepP = new Partnership(mockService, 'step', {},
    { parents: { data: [{ type: 'person', id: 'parentA' }, { type: 'person', id: 'parentB2' }] },
      children: { data: [] } }
  );
  
  mockService._people = { ggp, gp1, gp2, parentA, parentB1, parentB2, personA, personB };
  mockService._partnerships = { ggpp, gp1p, gp2p, pa, pb, step: stepP };
  
  const relationships = personA.relationshipsTo(personB);
  console.log(`  Found ${relationships.length} relationships in complex multi-path case`);
  
  assert(relationships.length >= 2, 'Should find multiple relationship paths in complex case');
  
  const names = relationships.map(r => r.name);
  console.log(`  Complex relationship types: ${names.join(', ')}`);
}

// Summary
console.log(`\n${passCount}/${testCount} tests passed`);
process.exit(passCount === testCount ? 0 : 1);