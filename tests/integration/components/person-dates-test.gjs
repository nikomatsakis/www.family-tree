import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import PersonDates from 'family-tree/components/person-dates';

module('Integration | Component | person-dates', function (hooks) {
  setupRenderingTest(hooks);
  test('renders public date labels and explains withheld years', async function (assert) {
    const person = { lifeDates: [
      { kind: 'birth', label: 'Born 20 Mar', yearRedacted: true },
      { kind: 'death', label: 'Died 1 Apr 2020', yearRedacted: false },
    ] };
    await render(<template><PersonDates @person={{person}} /></template>);
    assert.dom('.life-date-birth').hasText('Born 20 Mar');
    assert.dom('.life-date-birth').hasAttribute('title', 'Birth year withheld for the last 75 years');
    assert.dom('.life-date-death').hasText('Died 1 Apr 2020');
  });
  test('people without dates do not get empty badges', async function (assert) {
    const person = { lifeDates: [] };
    await render(<template><PersonDates @person={{person}} /></template>);
    assert.dom('.person-dates').doesNotExist();
  });
});
