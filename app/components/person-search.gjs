import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { inject as service } from '@ember/service';
import PersonLink from './person-link';

export default class PersonSearch extends Component {
  @service genea;
  @tracked searchTerm = '';
  @tracked searchResults = [];

  <template>
    <div class='person-search-container'>
      {{#if @label}}
        <label for={{this.inputId}}>{{@label}}</label>
      {{else}}
        <label for={{this.inputId}} class='visually-hidden'>Search for a person</label>
      {{/if}}

      <input
        id={{this.inputId}}
        type='text'
        placeholder={{this.placeholder}}
        value={{this.searchTerm}}
        {{on 'input' this.updateSearchTerm}}
        class='search-box {{@inputClass}}'
      />

      {{#if this.searchResults.length}}
        <div class='search-results'>
          <ul class='search-results-list'>
            {{#each this.searchResults as |person|}}
              <li class='search-result-item'>
                {{#if @onSelectPerson}}
                  <button
                    type='button'
                    class='search-result-button'
                    {{on 'click' (fn this.selectPerson person)}}
                  >
                    {{person.name}}
                  </button>
                {{else}}
                  <PersonLink @person={{person}} />
                {{/if}}

                {{#if @showDetails}}
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
                  </div>
                {{/if}}
              </li>
            {{/each}}
          </ul>
        </div>
      {{/if}}
    </div>
  </template>

  get inputId() {
    return this.args.inputId || 'person-search-box';
  }

  get placeholder() {
    return this.args.placeholder || 'Search by name...';
  }

  @action
  updateSearchTerm(event) {
    this.searchTerm = event.target.value;
    this.performSearch();
  }

  @action
  selectPerson(person) {
    this.searchTerm = '';
    this.searchResults = [];
    if (this.args.onSelectPerson) {
      this.args.onSelectPerson(person);
    }
  }

  @action
  reset() {
    this.searchTerm = '';
    this.searchResults = [];
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

      // Filter out the excluded person if provided
      const excludeId = this.args.excludePerson?.id;

      this.searchResults = allPeople.filter((person) => {
        if (excludeId && person.id === excludeId) {
          return false;
        }
        return person.name.toLowerCase().includes(searchLower);
      });
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults = [];
    }
  }
}
