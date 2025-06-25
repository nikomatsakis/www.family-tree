import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import PasswordPrompt from './password-prompt';

export default class AppContainerComponent extends Component {
  @service genea;
  @tracked needsPassword = false;
  @tracked isLoading = true;

  constructor() {
    super(...arguments);
    this.checkPasswordRequirement();
  }

  async checkPasswordRequirement() {
    try {
      await this.genea.populate();
      this.isLoading = false;
    } catch (error) {
      if (error.message.includes('Password required')) {
        this.needsPassword = true;
        this.isLoading = false;
      } else {
        // Re-throw other errors
        console.error('Error loading data:', error);
        this.isLoading = false;
        throw error;
      }
    }
  }

  @action
  async handlePasswordSet() {
    this.isLoading = true;
    this.needsPassword = false;
    try {
      // Reset the populate state so we can try again with the new password
      this.genea.resetPopulateState();
      await this.genea.populate();
      this.isLoading = false;
    } catch (error) {
      // Password was wrong
      this.needsPassword = true;
      this.isLoading = false;
      throw error;
    }
  }

  <template>
    {{#if this.needsPassword}}
      <PasswordPrompt @onPasswordSet={{this.handlePasswordSet}} />
    {{else if this.isLoading}}
      <div class='loading-overlay'>
        <div class='loading-message'>Loading family tree...</div>
      </div>
    {{else}}
      {{yield}}
    {{/if}}
  </template>
}
