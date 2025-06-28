import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

export default class ConnectionFooter extends Component {
  @tracked isOnline = navigator.onLine;

  constructor() {
    super(...arguments);

    // Listen for online/offline events
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
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
  async refreshData() {
    if (window.FamilyTreePWA && window.FamilyTreePWA.refreshFamilyData) {
      window.FamilyTreePWA.refreshFamilyData();
    } else {
      // Fallback to simple reload
      window.location.reload();
    }
  }

  <template>
    <footer class='connection-footer'>
      <div class='connection-status'>
        <span class='status-indicator {{if this.isOnline "online" "offline"}}'>
          {{if this.isOnline '🟢' '🔴'}}
        </span>
        <span class='status-text'>
          {{if this.isOnline 'Online' 'Offline'}}
        </span>
        <button
          type='button'
          class='refresh-button'
          {{on 'click' this.refreshData}}
          title='Refresh app and data'
        >
          ♻️ Refresh
        </button>
      </div>
    </footer>
  </template>
}
