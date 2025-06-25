import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AuthService extends Service {
  @tracked isAuthenticated = false;
  @tracked needsPassword = false;

  get hasStoredPassword() {
    return !!localStorage.getItem('familyTreePassword');
  }

  @action
  setPassword(password) {
    localStorage.setItem('familyTreePassword', password);
    this.isAuthenticated = true;
    this.needsPassword = false;
  }

  @action
  clearPassword() {
    localStorage.removeItem('familyTreePassword');
    this.isAuthenticated = false;
    this.needsPassword = false;
  }

  @action
  requirePassword() {
    this.needsPassword = true;
    this.isAuthenticated = false;
  }

  @action
  checkStoredPassword() {
    if (this.hasStoredPassword) {
      this.isAuthenticated = true;
      this.needsPassword = false;
    }
  }
}
