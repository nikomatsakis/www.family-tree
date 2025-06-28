import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { inject as service } from '@ember/service';
import PersonLink from './person-link';

export default class UnifiedSearch extends Component {
  @service genea;
  @tracked searchTerm = '';
  @tracked searchResults = [];
  @tracked randomPersonName = null;

  <template>
    <div class='person-search-container'>
      <label for={{this.inputId}} class='visually-hidden'>Search for a person</label>

      <input
        id={{this.inputId}}
        type='text'
        placeholder={{this.searchPlaceholder}}
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
                  <a
                    href='#'
                    class='search-result-link'
                    {{on 'click' (this.handlePersonClick person)}}
                  >
                    {{person.name}}
                  </a>
                {{else}}
                  <PersonLink @person={{person}} />
                {{/if}}
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
                        }}{{if index ', '}}{{child.firstName}}{{/each}}{{/each}}
                    </div>
                  {{/if}}
                </div>
              </li>
            {{/each}}
          </ul>
        </div>
      {{/if}}
    </div>
  </template>

  constructor() {
    super(...arguments);
    if (!this.args.placeholder) {
      this.loadRandomPersonName();
    }
  }

  get inputId() {
    return this.args.inputId || 'unified-search-box';
  }

  get searchPlaceholder() {
    if (this.args.placeholder) {
      return this.args.placeholder;
    }
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
    }
  }

  @action
  handlePersonClick(person) {
    return (event) => {
      event.preventDefault();
      this.selectPerson(person);
    };
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
  updateSearchTerm(event) {
    this.searchTerm = event.target.value;
    this.performSearch();
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
