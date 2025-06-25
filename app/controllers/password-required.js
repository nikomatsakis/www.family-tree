import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class PasswordRequiredController extends Controller {
  @service auth;
  @service genea;
  @service router;

  @action
  async handlePasswordSet() {
    // Reset the genea service state so we can try again with the new password
    this.genea.resetPopulateState();

    // Try to populate data with the new password
    await this.genea.populate();

    // Success! Redirect to the application
    this.router.transitionTo('index');
  }
}
