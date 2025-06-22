import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

export default class PwaGreecePrep extends Component {
  @tracked isPreloading = false;
  @tracked preloadStatus = '';
  @tracked showPrepModal = false;

  @action
  togglePrepModal() {
    this.showPrepModal = !this.showPrepModal;
  }

  @action
  async preloadForGreece() {
    this.isPreloading = true;
    this.preloadStatus = '🇬🇷 Preparing family data for Greece travel...';
    
    const urlsToPreload = [
      '/',
      '/api/v1/people.json',
      '/api/v1/partnerships.json',
      '/assets/vendor.js',
      '/assets/family-tree.js',
      '/assets/vendor.css',
      '/assets/family-tree.css'
    ];
    
    let successCount = 0;
    
    for (const url of urlsToPreload) {
      try {
        this.preloadStatus = `Loading ${url}...`;
        const response = await fetch(url);
        if (response.ok) {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to preload ${url}:`, error);
      }
    }
    
    this.isPreloading = false;
    this.preloadStatus = `✅ Greece prep complete! ${successCount}/${urlsToPreload.length} resources cached. You can now use the app offline!`;
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      this.preloadStatus = '';
    }, 5000);
  }

  <template>
    {{#if this.showPrepModal}}
      <div class='pwa-greece-modal'>
        <div class='modal-content'>
          <h3>🇬🇷 Greece Travel Preparation</h3>
          
          <p>
            Going to Greece? Download all family data for offline access.
            Perfect for when you have no roaming data!
          </p>
          
          <div class='prep-features'>
            <div class='feature'>
              📱 <strong>Works Offline</strong> - No internet needed
            </div>
            <div class='feature'>
              💾 <strong>All Family Data</strong> - Everyone's information cached
            </div>
            <div class='feature'>
              🏨 <strong>Hotel WiFi Prep</strong> - Download once, use everywhere
            </div>
          </div>
          
          {{#if this.isPreloading}}
            <div class='preload-status'>
              {{this.preloadStatus}}
            </div>
          {{else if this.preloadStatus}}
            <div class='preload-success'>
              {{this.preloadStatus}}
            </div>
          {{/if}}
          
          <div class='modal-actions'>
            <button 
              type='button' 
              class='btn-primary' 
              {{on 'click' this.preloadForGreece}}
              disabled={{this.isPreloading}}
            >
              {{#if this.isPreloading}}
                Loading...
              {{else}}
                Download for Offline Use
              {{/if}}
            </button>
            
            <button 
              type='button' 
              class='btn-secondary' 
              {{on 'click' this.togglePrepModal}}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    {{/if}}
    
    <button 
      type='button' 
      class='pwa-greece-button' 
      {{on 'click' this.togglePrepModal}}
      title='Prepare for Greece travel'
    >
      🇬🇷
    </button>
  </template>
}