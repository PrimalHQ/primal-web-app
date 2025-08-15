import { Component, Show } from 'solid-js';
import { useSeenNotesFilter } from '../../lib/feedIntegration';
import styles from './SeenNotesSettings.module.scss';

interface SeenNotesSettingsProps {
  show?: boolean;
  onClose?: () => void;
}

/**
 * Debug/settings panel for seen notes filtering
 * Can be added to settings pages or used as a floating panel
 */
const SeenNotesSettings: Component<SeenNotesSettingsProps> = (props) => {
  const {
    isReady,
    isEnabled,
    getStats,
    forceUpdate,
    observedNotesCount
  } = useSeenNotesFilter();

  const stats = () => getStats();

  const handleForceUpdate = async () => {
    try {
      await forceUpdate();
    } catch (error) {
      console.error('Failed to force update seen notes filter:', error);
    }
  };

  return (
    <Show when={props.show !== false}>
      <div class={styles.panel}>
        <div class={styles.header}>
          <h3>Seen Notes Filter</h3>
          <Show when={props.onClose}>
            <button class={styles.closeButton} onClick={props.onClose}>×</button>
          </Show>
        </div>

        <div class={styles.content}>
          <div class={styles.status}>
            <div class={styles.statusItem}>
              <span class={styles.label}>Status:</span>
              <span class={`${styles.value} ${isEnabled() ? styles.enabled : styles.disabled}`}>
                {isEnabled() ? (isReady() ? 'Active' : 'Initializing...') : 'Disabled'}
              </span>
            </div>

            <Show when={isEnabled()}>
              <div class={styles.statusItem}>
                <span class={styles.label}>Currently Observing:</span>
                <span class={styles.value}>{observedNotesCount()} notes</span>
              </div>
            </Show>
          </div>

          <Show when={isEnabled() && isReady() && stats()}>
            <div class={styles.stats}>
              <h4>Filter Statistics</h4>
              <div class={styles.statGrid}>
                <div class={styles.statItem}>
                  <span class={styles.statLabel}>Filter Capacity:</span>
                  <span class={styles.statValue}>
                    {((stats()?.newFilterCapacity || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div class={styles.statItem}>
                  <span class={styles.statLabel}>Has Old Filter:</span>
                  <span class={styles.statValue}>
                    {stats()?.oldFilterExists ? 'Yes' : 'No'}
                  </span>
                </div>
                <div class={styles.statItem}>
                  <span class={styles.statLabel}>Pending Timeouts:</span>
                  <span class={styles.statValue}>{stats()?.totalViewTimeouts || 0}</span>
                </div>
                <div class={styles.statItem}>
                  <span class={styles.statLabel}>Last Sync:</span>
                  <span class={styles.statValue}>
                    {stats()?.lastFetchTime ? 
                      new Date(stats()!.lastFetchTime).toLocaleTimeString() : 
                      'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          </Show>

          <div class={styles.actions}>
            <Show when={isEnabled() && isReady()}>
              <button 
                class={styles.actionButton} 
                onClick={handleForceUpdate}
              >
                Sync Filter Now
              </button>
            </Show>
            
            <Show when={!isEnabled()}>
              <div class={styles.disabledMessage}>
                <p>Seen notes filtering requires an account with a public key.</p>
                <p>Log in to enable this feature.</p>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SeenNotesSettings;
