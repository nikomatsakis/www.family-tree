import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service genea;
  @service auth;
  @service router;

  async model() {
    // Check if we have a stored password first
    this.auth.checkStoredPassword();

    try {
      await this.genea.populate();
      return this.genea.roots();
    } catch (error) {
      if (error.message.includes('Password required')) {
        // Redirect to password route
        this.router.transitionTo('password-required');
        return null;
      }
      if (error.message.includes('Invalid password')) {
        // Redirect to password route with error state
        this.router.transitionTo('password-required');
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }
}
