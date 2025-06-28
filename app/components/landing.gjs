import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { inject as service } from '@ember/service';
import UnifiedSearch from './unified-search';

export default class Landing extends Component {
  @service genea;
  @tracked showInstallPrompt = false;
  @tracked deferredPrompt = null;
  @tracked isInstalled = false;

  <template>
    <div class='landing-page'>
      <h1>Family Tree</h1>

      <div class='search-container'>
        <UnifiedSearch />
      </div>

      {{! PWA Installation Instructions }}
      {{#unless this.isInstalled}}
        <div class='install-instructions'>
          <div class='install-header'>
            <span class='install-icon'>📱</span>
            <h3>Install as Mobile App</h3>
          </div>
          <p>Get the best experience by installing this family tree on your
            device!</p>

          {{#if this.deferredPrompt}}
            <button
              type='button'
              class='install-button'
              {{on 'click' this.installApp}}
            >
              📱 Install App
            </button>
          {{else}}
            <div class='install-steps'>
              <div class='install-step'>
                <strong>📱 On iPhone:</strong>
                Tap the Share button, then "Add to Home Screen"
              </div>
              <div class='install-step'>
                <strong>🤖 On Android:</strong>
                Tap the menu (⋯), then "Add to Home screen"
              </div>
            </div>
          {{/if}}
        </div>
      {{/unless}}

    </div>
  </template>

  constructor() {
    super(...arguments);
    this.setupPWAInstallation();
  }

  setupPWAInstallation() {
    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone
    ) {
      this.isInstalled = true;
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt = true;
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.showInstallPrompt = false;
    });
  }

  @action
  async installApp() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA: User accepted the install prompt');
    } else {
      console.log('PWA: User dismissed the install prompt');
    }

    this.deferredPrompt = null;
  }
}
