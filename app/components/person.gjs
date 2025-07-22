import { service } from '@ember/service';
import IndexLink from './index-link';
import MaintainerLink from './maintainer-link';
import UnifiedSearch from './unified-search';
import FamilyTreeVisual from './family-tree-visual';
import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { DEFAULT_RENDERER_TYPE } from '../utils/family-tree-renderers';

export default class Person extends Component {
  @service genea;
  @service router;

  @tracked showEditDialog = false;
  @tracked editedName = '';
  @tracked editedComment = '';
  @tracked editPassword = '';
  @tracked editUserName = '';
  @tracked editUserEmail = '';
  @tracked isSubmittingEdit = false;
  @tracked editError = null;
  @tracked editSuccess = false;

  <template>
    <button
      type='button'
      class='floating-search-button'
      {{on 'click' this.navigateToSearch}}
      title='Search for someone'
    >
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-linecap='round'
        stroke-linejoin='round'
      >
        <circle cx='11' cy='11' r='8'></circle>
        <path d='m21 21-4.35-4.35'></path>
      </svg>
    </button>

    <button
      type='button'
      class='floating-edit-button {{if this.hasPendingEdit "has-pending-edit"}}'
      {{on 'click' this.openEditDialog}}
      title='{{if this.hasPendingEdit "Edit this person (edit pending)" "Edit this person"}}'
    >
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-linecap='round'
        stroke-linejoin='round'
      >
        <path d='m18 2 4 4L8 20l-6 2 2-6L18 2Z'></path>
        <path d='m15 5 4 4'></path>
      </svg>
      {{#if this.hasPendingEdit}}
        <span class='pending-indicator'>⏳</span>
      {{/if}}
    </button>

    <div class='person-detail'>
      <div class='person-header'>
        <h1 class='person-name'>{{@model.name}}</h1>
        {{#if @model.comments}}
          <p class='person-comments'>{{@model.comments}}</p>
        {{/if}}
      </div>

      {{#if this.showSiblings}}
        <div class='family-section'>
          <h2>Parents, partners, and children</h2>

          <div class='relationship-search'>
            <UnifiedSearch
              @placeholder='See how {{@model.name}} is related to...'
              @onSelectPerson={{this.selectPersonForComparison}}
              @excludePerson={{@model}}
              @inputClass='relationship-search-input'
              @inputId='relationship-search'
            />
          </div>

          {{#if this.referencePerson}}
            <div class='relationship-display'>
              {{#if this.selectedRelationships.length}}
                {{#each this.selectedRelationships as |r|}}
                  <div class='relationship-info'>
                    <span>{{this.relationshipSentence r}}</span>
                    <button
                      type='button'
                      class='clear-comparison'
                      {{on 'click' this.clearComparison}}
                    >
                      Clear comparison
                    </button>
                  </div>
                  <FamilyTreeVisual
                    @relationship={{r}}
                    @pagePerson={{@model}}
                    @referencePerson={{this.referencePerson}}
                    @onPersonClick={{this.navigateToPerson}}
                  />
                {{/each}}
              {{else}}
                <div class='no-relation'>
                  No relation found between
                  {{@model.name}}
                  and
                  {{this.referencePerson.name}}!
                </div>
              {{/if}}

            </div>
          {{else}}
            {{#if @model}}
              <FamilyTreeVisual
                @pagePerson={{@model}}
                @onPersonClick={{this.navigateToPerson}}
                @rendererType={{this.rendererType}}
              />
            {{else}}
              <div>Loading person data...</div>
            {{/if}}
          {{/if}}
        </div>
      {{/if}}

      <hr class='section-divider' />

      <div class='navigation-section'>
        <div class='nav-links'>
          <MaintainerLink @person={{@model}} class='edit-link' />
          {{#if this.isNonDefaultRenderer}}
            <button
              type='button'
              class='nav-link renderer-switch'
              {{on 'click' this.returnToDefaultRenderer}}
            >
              Return to default view
            </button>
          {{/if}}
          <IndexLink @referencePerson={{this.referencePerson}} class='nav-link'>
            Return to the root listing
            {{#if this.referencePerson}}for {{this.referencePerson.name}}{{/if}}
          </IndexLink>
        </div>
      </div>
    </div>

    {{#if this.showEditDialog}}
      <div class='edit-dialog-overlay'>
        <div class='edit-dialog'>
          <h3>Edit {{@model.name}}</h3>
          
          {{#if this.editError}}
            <div class='edit-error'>
              {{this.editError}}
            </div>
          {{/if}}
          
          <div class='edit-fields'>
            <label for='edit-name-field'>Name:</label>
            <input
              type='text'
              id='edit-name-field'
              class='edit-field-input'
              value={{this.editedName}}
              {{on 'input' this.updateEditedName}}
              placeholder='Person name'
            />
            
            <label for='edit-comment-field'>Comment:</label>
            <textarea
              id='edit-comment-field'
              class='edit-field-textarea'
              value={{this.editedComment}}
              {{on 'input' this.updateEditedComment}}
              rows='4'
              placeholder='Optional comment about this person'
            />
          </div>
          
          <div class='edit-user-info'>
            <h4>Your Information</h4>
            <label for='edit-username'>Your name:</label>
            <input
              type='text'
              id='edit-username'
              value={{this.editUserName}}
              {{on 'input' this.updateUserName}}
              placeholder='Your name for edit history'
            />
            
            <label for='edit-email'>Your email:</label>
            <input
              type='email'
              id='edit-email'
              value={{this.editUserEmail}}
              {{on 'input' this.updateUserEmail}}
              placeholder='your@email.com'
            />
            
            <label for='edit-password'>Edit password:</label>
            <input
              type='password'
              id='edit-password'
              value={{this.editPassword}}
              {{on 'input' this.updatePassword}}
              placeholder='Edit password'
            />
          </div>
          
          <p class='edit-timing-note'>
            Changes typically appear in 2-4 minutes after submission.
          </p>
          
          <div class='edit-dialog-actions'>
            <button
              type='button'
              class='btn-submit-edit'
              {{on 'click' this.submitEdit}}
              disabled={{this.isSubmittingEdit}}
            >
              {{#if this.isSubmittingEdit}}
                Submitting...
              {{else}}
                Submit Edit
              {{/if}}
            </button>
            <button type='button' class='btn-cancel-edit' {{on 'click' this.closeEditDialog}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    {{/if}}

    {{#if this.editSuccess}}
      <div class='edit-success-message'>
        Edit submitted successfully! Changes will appear in a few minutes.
      </div>
    {{/if}}
  </template>

  relationshipSentence = (r) => r.sentence;

  get showSiblings() {
    return true; // Always show the new search interface
  }

  get selectedRelationships() {
    if (this.referencePerson) {
      return this.args.model.relationshipsTo(this.referencePerson);
    }
    return [];
  }

  @action
  selectPersonForComparison(person) {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: person.id,
        renderer: this.rendererType,
        // Clear expanded partnerships to use relationship-specific defaults
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  @action
  clearComparison() {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: null,
        renderer: this.rendererType,
        // Clear expanded partnerships to return to normal defaults
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  get referencePerson() {
    if (this.args.reference.getId())
      return this.genea.person(this.args.reference.getId());
    else return null;
  }

  get notRelated() {
    return this.relationships.length === 0;
  }

  get relationships() {
    if (this.referencePerson)
      return this.args.model.relationshipsTo(this.referencePerson);
    else return [];
  }

  get ancestors() {
    if (this.referencePerson) {
      const modelAncestors = this.args.model.allAncestors();
      const refPersonAncestors = this.referencePerson.allAncestors();
      return new Set([...modelAncestors, ...refPersonAncestors]);
    } else {
      return null;
    }
  }

  generationsFrom = (person, partnership) =>
    person.generationsFromAncestralPartnership(partnership);

  get rendererType() {
    return this.args.renderer || DEFAULT_RENDERER_TYPE;
  }

  get isNonDefaultRenderer() {
    return this.rendererType !== DEFAULT_RENDERER_TYPE;
  }

  @action
  navigateToSearch() {
    this.router.transitionTo('index');
  }

  @action
  returnToDefaultRenderer() {
    this.router.transitionTo('person', this.args.model.id, {
      queryParams: {
        referencePersonId: this.referencePerson?.id,
        renderer: null, // Clear renderer to use default
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  @action
  navigateToPerson(person) {
    this.router.transitionTo('person', person, {
      queryParams: {
        referencePersonId: null,
        renderer: this.rendererType,
        expandedPartnerships: null,
        expandedPersons: null,
      },
    });
  }

  // Edit-related getters and methods

  get hasPendingEdit() {
    const pending = this.getPendingEdits();
    return !!pending[this.args.model.id];
  }

  getPendingEdits() {
    return JSON.parse(localStorage.getItem('familyTreePendingEdits') || '{}');
  }

  clearOldPendingEdits() {
    const pending = this.getPendingEdits();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    Object.keys(pending).forEach(personId => {
      if (new Date(pending[personId].timestamp) < fiveMinutesAgo) {
        delete pending[personId];
      }
    });
    
    localStorage.setItem('familyTreePendingEdits', JSON.stringify(pending));
  }

  addPendingEdit(personId, field, newValue) {
    const pending = this.getPendingEdits();
    pending[personId] = { field, newValue, timestamp: new Date().toISOString() };
    localStorage.setItem('familyTreePendingEdits', JSON.stringify(pending));
  }

  clearPendingEdit(personId) {
    const pending = this.getPendingEdits();
    delete pending[personId];
    localStorage.setItem('familyTreePendingEdits', JSON.stringify(pending));
  }

  loadSavedEditInfo() {
    this.editPassword = localStorage.getItem('familyTreeEditPassword') || 
                       localStorage.getItem('familyTreePassword') || '';
    this.editUserName = localStorage.getItem('familyTreeEditUserName') || '';
    this.editUserEmail = localStorage.getItem('familyTreeEditUserEmail') || '';
  }

  saveEditInfo() {
    localStorage.setItem('familyTreeEditPassword', this.editPassword);
    localStorage.setItem('familyTreeEditUserName', this.editUserName);
    localStorage.setItem('familyTreeEditUserEmail', this.editUserEmail);
  }

  @action
  openEditDialog() {
    this.clearOldPendingEdits();
    this.editedName = this.args.model.name;
    this.editedComment = this.args.model.comments || '';
    this.loadSavedEditInfo();
    this.editError = null;
    this.showEditDialog = true;
  }

  @action
  closeEditDialog() {
    this.showEditDialog = false;
    this.editError = null;
    this.editedName = '';
    this.editedComment = '';
  }

  @action
  updateEditedName(event) {
    this.editedName = event.target.value;
  }

  @action
  updateEditedComment(event) {
    this.editedComment = event.target.value;
  }

  @action
  updateUserName(event) {
    this.editUserName = event.target.value;
  }

  @action
  updateUserEmail(event) {
    this.editUserEmail = event.target.value;
  }

  @action
  updatePassword(event) {
    this.editPassword = event.target.value;
  }

  @action
  async submitEdit() {
    // Check if anything actually changed
    const nameChanged = this.editedName !== this.args.model.name;
    const commentChanged = this.editedComment !== (this.args.model.comments || '');
    
    if (!nameChanged && !commentChanged) {
      this.editError = 'No changes to save';
      return;
    }

    // Basic validation
    if (!this.editUserName.trim()) {
      this.editError = 'Please enter your name';
      return;
    }
    if (!this.editUserEmail.trim()) {
      this.editError = 'Please enter your email';
      return;
    }
    if (!this.editPassword.trim()) {
      this.editError = 'Please enter the edit password';
      return;
    }

    this.isSubmittingEdit = true;
    this.editError = null;

    try {
      // Build expected and updated states based on what changed
      const expectedState = {};
      const updatedState = {};
      
      if (nameChanged) {
        expectedState.name = this.args.model.name;
        updatedState.name = this.editedName;
      }
      
      if (commentChanged) {
        expectedState.comments = this.args.model.comments || '';
        updatedState.comments = this.editedComment;
      }

      // Make API call to edit-person function
      const response = await fetch('/.netlify/functions/edit-person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId: this.args.model.id,
          updates: {
            expectedState,
            updatedState
          },
          password: this.editPassword,
          userInfo: {
            name: this.editUserName,
            email: this.editUserEmail
          }
        })
      });

      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response Text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        this.editError = `Invalid server response: ${responseText.substring(0, 100)}`;
        return;
      }

      if (result.success) {
        // Save user info for next time
        this.saveEditInfo();
        
        // Add to pending edits (we'll add the most significant change)
        if (nameChanged) {
          this.addPendingEdit(this.args.model.id, 'name', this.editedName);
        } else if (commentChanged) {
          this.addPendingEdit(this.args.model.id, 'comments', this.editedComment);
        }
        
        // Show success and hide dialog
        this.showEditDialog = false;
        this.editSuccess = true;
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          this.editSuccess = false;
        }, 5000);

      } else {
        // Handle various error types
        if (response.status === 401) {
          this.editError = 'Invalid edit password';
          localStorage.removeItem('familyTreeEditPassword'); // Clear bad password
        } else if (response.status === 409) {
          this.editError = `Conflict: ${result.error}`;
        } else if (response.status === 503) {
          this.editError = 'Edit functionality is not enabled on this site';
        } else {
          this.editError = `Error: ${result.message}`;
        }
      }
    } catch (error) {
      this.editError = `Network error: ${error.message}`;
    } finally {
      this.isSubmittingEdit = false;
    }
  }
}
