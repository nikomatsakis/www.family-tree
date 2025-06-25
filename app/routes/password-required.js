import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class PasswordRequiredRoute extends Route {
  @service auth;
  @service router;

  beforeModel() {
    // If already authenticated, redirect to application
    if (this.auth.isAuthenticated) {
      this.router.transitionTo('index');
    }
  }

  model() {
    return {
      needsPassword: this.auth.needsPassword,
      hasStoredPassword: this.auth.hasStoredPassword,
    };
  }
}
