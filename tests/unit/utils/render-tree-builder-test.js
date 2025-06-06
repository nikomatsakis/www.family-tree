import { module, test } from 'qunit';
import { setupTest } from 'family-tree/tests/helpers';
import { Person, Partnership } from 'family-tree/services/genea';
import { RenderTreeBuilder, createDefaultRenderTree } from 'family-tree/utils/render-tree-builder';
import { createMockFamily } from 'family-tree/tests/helpers/mock-genea-data';

module('Unit | Utils | render-tree-builder', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // Create mock genea service
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

    // Create family structure and populate service
    const { people, partnerships } = createMockFamily();
    
    // Convert mock data to actual Person/Partnership objects
    for (const [id, personData] of Object.entries(people)) {
      this.mockService._people[id] = new Person(
        this.mockService,
        personData.id,
        personData.attributes,
        personData.relationships
      );
    }
    
    for (const [id, partnershipData] of Object.entries(partnerships)) {
      this.mockService._partnerships[id] = new Partnership(
        this.mockService,
        partnershipData.id,
        partnershipData.attributes,
        partnershipData.relationships
      );
    }

    // Get some key people for testing
    this.child1 = this.mockService._people['c1']; // Child One
    this.dad = this.mockService._people['p1'];    // Dad Smith  
    this.mom = this.mockService._people['p3'];    // Mom Jones
    this.grandpa = this.mockService._people['gp1']; // Grandpa Smith
  });

  test('RenderTreeBuilder exists and can be constructed', function (assert) {
    const builder = new RenderTreeBuilder(this.mockService);
    assert.ok(builder, 'Builder can be constructed');
    assert.strictEqual(builder.renderTree.persons.length, 0, 'Starts with empty persons');
    assert.strictEqual(builder.renderTree.partnerships.length, 0, 'Starts with empty partnerships');
  });

  test('addPrimaryPerson adds person and their marriages', function (assert) {
    const builder = new RenderTreeBuilder(this.mockService);
    
    // Add Dad as primary person
    const dadIndex = builder.addPrimaryPerson(this.dad);
    
    assert.strictEqual(dadIndex, 0, 'Returns correct index');
    assert.strictEqual(builder.renderTree.persons.length, 2, 'Added Dad and Mom');
    assert.strictEqual(builder.renderTree.partnerships.length, 1, 'Added their partnership');
    
    // Check person details
    const dadPerson = builder.renderTree.getPerson(dadIndex);
    assert.strictEqual(dadPerson.name, 'Dad Smith', 'Dad name correct');
    assert.strictEqual(dadPerson.id, 'p1', 'Dad ID correct');
    assert.strictEqual(dadPerson.parentIn.length, 1, 'Dad has one marriage');
    
    // Check Mom was added as partner
    const momIndex = builder.personMap.get(this.mom);
    assert.ok(momIndex !== undefined, 'Mom was added');
    const momPerson = builder.renderTree.getPerson(momIndex);
    assert.strictEqual(momPerson.name, 'Mom Jones', 'Mom name correct');
    
    // Check partnership
    const partnership = builder.renderTree.getPartnership(0);
    assert.strictEqual(partnership.type, 'regular', 'Partnership is regular type');
    assert.deepEqual(partnership.parents, [dadIndex, momIndex], 'Partnership has correct parents');
    assert.strictEqual(partnership.children, null, 'Partnership starts unexpanded');
  });

  test('expandPartnership adds children', function (assert) {
    const builder = new RenderTreeBuilder(this.mockService);
    
    // Add Dad and expand his marriage
    builder.addPrimaryPerson(this.dad);
    const dadMomPartnership = this.dad.parentIn[0];
    builder.expandPartnership(dadMomPartnership);
    
    assert.strictEqual(builder.renderTree.persons.length, 4, 'Added Dad, Mom, and 2 children');
    
    // Check children were added
    const partnership = builder.renderTree.getPartnership(0);
    assert.strictEqual(partnership.children.length, 2, 'Partnership has 2 children');
    
    // Check child details
    const child1Index = builder.personMap.get(this.child1);
    const child1Person = builder.renderTree.getPerson(child1Index);
    assert.strictEqual(child1Person.name, 'Child One', 'Child name correct');
    assert.strictEqual(child1Person.childIn, 0, 'Child linked to parent partnership');
  });

  test('createDefaultRenderTree builds minimal family view', function (assert) {
    // Test with Child One as focus - should show Dad+Mom -> Child One -> no children
    const renderTree = createDefaultRenderTree(this.mockService, this.child1);
    
    // Validate structure
    assert.ok(renderTree, 'Render tree created');
    assert.strictEqual(renderTree.focusPersonIndex, 0, 'Focus person set correctly');
    
    const focusPerson = renderTree.getFocusPerson();
    assert.strictEqual(focusPerson.name, 'Child One', 'Focus person is Child One');
    
    // Should have: Child One, Dad (primary parent), Mom (partner), and Child Two (sibling)
    assert.strictEqual(renderTree.persons.length, 4, 'Has 4 people: focus + parents + siblings');
    
    // Should have: Dad+Mom partnership (expanded to show Child One)
    assert.strictEqual(renderTree.partnerships.length, 1, 'Has 1 partnership');
    
    const partnership = renderTree.getPartnership(0);
    assert.strictEqual(partnership.type, 'regular', 'Partnership is regular');
    assert.strictEqual(partnership.children.length, 2, 'Partnership expanded to show children');
    
    // Find Dad and Mom
    const dadIndex = renderTree.findPersonByOriginalId('p1');
    const momIndex = renderTree.findPersonByOriginalId('p3');
    assert.ok(dadIndex !== -1, 'Dad found in tree');
    assert.ok(momIndex !== -1, 'Mom found in tree');
    
    const dadPerson = renderTree.getPerson(dadIndex);
    const momPerson = renderTree.getPerson(momIndex);
    assert.strictEqual(dadPerson.name, 'Dad Smith', 'Dad in tree');
    assert.strictEqual(momPerson.name, 'Mom Jones', 'Mom in tree');
  });

  test('createDefaultRenderTree with person who has parents shows 3 generations', function (assert) {
    // Test with Dad as focus - should show Grandpa+Grandma -> Dad+Mom -> children
    const renderTree = createDefaultRenderTree(this.mockService, this.dad);
    
    assert.ok(renderTree, 'Render tree created');
    
    const focusPerson = renderTree.getFocusPerson();
    assert.strictEqual(focusPerson.name, 'Dad Smith', 'Focus person is Dad');
    
    // Should have more people since we go up one generation
    assert.ok(renderTree.persons.length >= 4, 'Has at least 4 people including grandparents');
    
    // Check that Grandpa was added as primary lineage
    const grandpaIndex = renderTree.findPersonByOriginalId('gp1');
    assert.ok(grandpaIndex !== -1, 'Grandpa found in tree');
    
    const grandpaPerson = renderTree.getPerson(grandpaIndex);
    assert.strictEqual(grandpaPerson.name, 'Grandpa Smith', 'Grandpa in tree');
  });

  test('debug output is readable', function (assert) {
    const renderTree = createDefaultRenderTree(this.mockService, this.child1);
    const debug = renderTree.toDebugObject();
    
    assert.ok(debug.focusPersonName, 'Debug shows focus person name');
    assert.strictEqual(debug.focusPersonName, 'Child One', 'Focus person name correct');
    assert.ok(debug.stats, 'Debug includes stats');
    assert.ok(debug.stats.personCount > 0, 'Stats show person count');
    assert.ok(debug.stats.partnershipCount > 0, 'Stats show partnership count');
    
    // Log for manual inspection during development
    console.log('Render Tree Debug Output:', JSON.stringify(debug, null, 2));
  });
});