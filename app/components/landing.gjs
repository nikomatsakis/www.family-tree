import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { inject as service } from '@ember/service';
import PersonLink from './person-link';

export default class Landing extends Component {
  @service genea;
  @tracked searchTerm = '';
  @tracked searchResults = [];
  @tracked randomPersonName = null;

  <template>
    <div class='landing-page'>
      <h1>Family Tree</h1>

      <div class='search-container'>
        <label for='search-box' class='visually-hidden'>Search for a person</label>
        <input
          id='search-box'
          type='text'
          placeholder={{this.searchPlaceholder}}
          value={{this.searchTerm}}
          {{on 'input' this.updateSearchTerm}}
          class='search-box'
        />
        {{#if this.searchResults.length}}
          <div class='search-results'>
            <ul class='search-results-list'>
              {{#each this.searchResults as |person|}}
                <li class='search-result-item'>
                  <PersonLink @person={{person}} />
                  <div class='person-details'>
                    {{#if person.comments}}
                      <div class='person-comments'>{{person.comments}}</div>
                    {{/if}}
                    {{#if person.parents.length}}
                      <div class='person-parents'>
                        Parents:
                        {{#each person.parents as |parent index|}}{{if
                            index
                            ', '
                          }}{{parent.firstName}}{{/each}}
                      </div>
                    {{/if}}
                    {{#if person.parentIn.length}}
                      <div class='person-children'>
                        Children:
                        {{#each person.parentIn as |partnership|}}{{#each
                            partnership.children
                            as |child index|
                          }}{{if
                              index
                              ', '
                            }}{{child.firstName}}{{/each}}{{/each}}
                      </div>
                    {{/if}}
                  </div>
                </li>
              {{/each}}
            </ul>
          </div>
        {{/if}}
      </div>

    </div>
  </template>

  constructor() {
    super(...arguments);
    this.loadRandomPersonName();
  }

  get searchPlaceholder() {
    return this.randomPersonName
      ? `Search by name (e.g., ${this.randomPersonName})`
      : 'Search by name...';
  }

  async loadRandomPersonName() {
    try {
      await this.genea.populate();
      const allPeople = this.genea.allPeople();
      if (allPeople.length > 0) {
        const randomIndex = Math.floor(Math.random() * allPeople.length);
        this.randomPersonName = allPeople[randomIndex].name;
      }
    } catch (error) {
      console.log('Could not load random person name:', error);
      // randomPersonName stays null, will use fallback placeholder
    }
  }

  @action
  updateSearchTerm(event) {
    this.searchTerm = event.target.value;
    this.performSearch();
  }

  @action
  async performSearch() {
    if (!this.searchTerm || this.searchTerm.length < 2) {
      this.searchResults = [];
      return;
    }

    try {
      await this.genea.populate();
      const searchLower = this.searchTerm.toLowerCase();
      const allPeople = this.genea.allPeople();

      this.searchResults = allPeople.filter((person) =>
        person.name.toLowerCase().includes(searchLower),
      );
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults = [];
    }
  }
}
