import { module, test } from 'qunit';
import { nameVariants } from 'family-tree/utils/name-search';
import { searchPeople } from 'family-tree/utils/search-people';

module('Unit | Utils | name variants', function () {
  test('suffix rules work in both directions without stripping short words', function (assert) {
    assert.deepEqual(nameVariants('Exampleou'), ['exampleou', 'exampleos']);
    assert.deepEqual(nameVariants('Exampleos'), ['exampleos', 'exampleou']);
    assert.true(nameVariants('Exampleaki').includes('exampleakis'));
    assert.true(nameVariants('Exampleidis').includes('exampleidi'));
    assert.deepEqual(nameVariants('you'), ['you']);
    assert.deepEqual(nameVariants('os'), ['os']);
    assert.false(nameVariants('Exampleous').includes('exampleos'));
    assert.true(nameVariants('KONSTANTÍNOS').includes('constantinos'));
  });

  test('site search matches variants and ranks recorded names first', function (assert) {
    const people = [
      { id: '1', name: 'Ada Exampleos' },
      { id: '2', name: 'Ada Exampleou' },
      { id: '3', name: 'Beatrice Elsewhere' },
    ];
    assert.deepEqual(
      searchPeople(people, 'Ada Exampleou').map((p) => p.id),
      ['2', '1'],
    );
    assert.deepEqual(
      searchPeople(people, 'Ada Exampleos').map((p) => p.id),
      ['1', '2'],
    );
    assert.deepEqual(searchPeople(people, 'Ada Elsewhere'), []);
    assert.deepEqual(searchPeople(people, '  --- '), []);
  });

  test('known spelling equivalents work without fuzzy matching and retain the model', function (assert) {
    const person = { id: '1', name: 'Konstantinos Exampleos' };
    assert.strictEqual(
      searchPeople([person], 'Constantinos Exampleou')[0],
      person,
    );
  });
});
