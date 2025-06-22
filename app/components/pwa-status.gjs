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
    <div class='pwa-status-container'>
      {{! Offline/Online indicator }}
      <div class='pwa-status {{if this.isOnline "online" "offline"}}'>
        {{#if this.isOnline}}
          <span class='status-icon'>🌐</span>
          <span class='status-text'>Online</span>
        {{else}}
          <span class='status-icon'>📱</span>
          <span class='status-text'>Offline Mode</span>
        {{/if}}
        
        {{#if this.isCached}}
          <span class='cache-indicator' title='Family data is cached for offline use'>
            💾
          </span>
        {{/if}}
      </div>

      {{! Refresh button }}
      <button 
        type='button' 
        class='pwa-refresh-button' 
        {{on 'click' this.refreshData}}
        title='Refresh family data'
      >
        🔄
      </button>

      {{! Update prompt }}
      {{#if this.showRefreshPrompt}}
        <div class='pwa-update-prompt'>
          <span>New family data available!</span>
          <button type='button' {{on 'click' this.refreshData}}>
            Update Now
          </button>
          <button type='button' {{on 'click' this.dismissRefreshPrompt}}>
            Later
          </button>
        </div>
      {{/if}}
    </div>
  </template>
}