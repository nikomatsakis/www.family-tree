import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { on } from '@ember/modifier';

export default class PasswordPromptComponent extends Component {
  @service auth;

  @tracked password = '';
  @tracked isLoading = false;
  @tracked errorMessage = '';

  @action
  handleInputChange(event) {
    this.password = event.target.value;
    this.errorMessage = ''; // Clear error when user types
  }

  @action
  async handleSubmit(event) {
    event.preventDefault();

    if (!this.password.trim()) {
      this.errorMessage = 'Please enter a password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Set password in auth service (which stores in localStorage)
      this.auth.setPassword(this.password);

      // Call the onPasswordSet callback from the controller
      await this.args.onPasswordSet();
    } catch (error) {
      console.error('Password validation error:', error);
      this.errorMessage = 'Invalid password. Please try again.';
      this.auth.clearPassword(); // Clear invalid password
    } finally {
      this.isLoading = false;
    }
  }

  <template>
    <div class='password-prompt-overlay'>
      <div class='password-prompt-dialog'>
        <h2>Family Tree Access</h2>
        <p>This family tree is password protected. Please enter the password to
          continue.</p>

        <form {{on 'submit' this.handleSubmit}}>
          <div class='password-input-group'>
            <label for='family-password'>Password:</label>
            <input
              type='password'
              id='family-password'
              value={{this.password}}
              {{on 'input' this.handleInputChange}}
              disabled={{this.isLoading}}
              placeholder='Enter password'
              autocomplete='current-password'
            />
          </div>

          {{#if this.errorMessage}}
            <div class='error-message'>{{this.errorMessage}}</div>
          {{/if}}

          <div class='password-actions'>
            <button
              type='submit'
              disabled={{this.isLoading}}
              class='submit-button'
            >
              {{#if this.isLoading}}
                Loading...
              {{else}}
                Access Family Tree
              {{/if}}
            </button>
          </div>
        </form>
      </div>
    </div>
  </template>
}
