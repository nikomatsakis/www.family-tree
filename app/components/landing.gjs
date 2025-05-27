import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LinkTo } from '@ember/routing';
import { on } from '@ember/modifier';
import PersonLink from './person-link';
import awaitEach from './await-each';

export default class Landing extends Component {
  @tracked searchTerm = '';

  <template>
    <div class='landing-page'>
      <h1>Family Tree</h1>

      <div class='search-container'>
        <label for='search-box' class='visually-hidden'>Search for a person</label>
        <input
          id='search-box'
          type='text'
          placeholder='Search for a person...'
          value={{this.searchTerm}}
          {{on 'input' this.updateSearchTerm}}
          class='search-box'
        />
      </div>

      <div class='root-ancestors'>
        <h2>Root Ancestors</h2>
        <ul class='ancestor-list'>
          {{#awaitEach @rootPeople as |person|}}
            <li>
              <PersonLink @person={{person}} />
            </li>
          {{/awaitEach}}
        </ul>
      </div>

      <div class='all-link'>
        <LinkTo @route='all'>View all people</LinkTo>
      </div>
    </div>
  </template>

  @action
  updateSearchTerm(event) {
    this.searchTerm = event.target.value;
  }
}
