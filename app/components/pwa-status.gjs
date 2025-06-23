import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

export default class PwaStatus extends Component {
  @tracked isOnline = navigator.onLine;
  @tracked lastUpdate = null;
  @tracked showRefreshPrompt = false;
  @tracked isCached = false;

  constructor() {
    super(...arguments);
    
    // Listen for online/offline events
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
    
    // Check if we have cached data
    this.checkCacheStatus();
    
    // Check for service worker updates
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.showRefreshPrompt = true;
      });
    }
  }

  willDestroy() {
    super.willDestroy();
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
  }

  @action
  updateOnlineStatus() {
    this.isOnline = navigator.onLine;
  }

  @action
  async checkCacheStatus() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const hasCache = cacheNames.some(name => name.includes('family-tree'));
        
        if (hasCache) {
          const cache = await caches.open(cacheNames.find(name => name.includes('family-tree')));
          const keys = await cache.keys();
          this.isCached = keys.some(req => req.url.includes('/api/v1/'));
        }
      } catch (error) {
        console.error('Error checking cache status:', error);
      }
    }
  }

  @action
  async refreshData() {
    // Check if we're offline first
    if (!navigator.onLine) {
      // Show offline message in the UI
      this.showRefreshPrompt = true;
      this.preloadStatus = '📱 You are offline - cannot refresh from server. Using cached data.';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.showRefreshPrompt = false;
        this.preloadStatus = '';
      }, 3000);
      return;
    }
    
    // Online - proceed with refresh
    if (window.FamilyTreePWA && window.FamilyTreePWA.refreshFamilyData) {
      window.FamilyTreePWA.refreshFamilyData();
    } else {
      // Fallback to simple reload
      window.location.reload();
    }
  }

  @action
  dismissRefreshPrompt() {
    this.showRefreshPrompt = false;
  }

  <template>
    {{! Only show update prompt when new data is available }}
    {{#if this.showRefreshPrompt}}
      <div class='pwa-update-notification'>
        <div class='update-content'>
          <span class='update-icon'>🔄</span>
          <span class='update-text'>New family data available</span>
          <button type='button' class='update-button' {{on 'click' this.refreshData}}>
            Update
          </button>
          <button type='button' class='dismiss-button' {{on 'click' this.dismissRefreshPrompt}}>
            ×
          </button>
        </div>
      </div>
    {{/if}}
  </template>
}