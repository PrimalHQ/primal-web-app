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
    clearAllFilters,
    rotateFilters,
    observedNotesCount
  } = useSeenNotesFilter();

  const stats = () => getStats();

  const handleClearFilters = () => {
    try {
      clearAllFilters();
    } catch (error) {
      console.error('Failed to clear seen notes filters:', error);
    }
  };

  const handleRotateFilters = () => {
    try {
      rotateFilters();
    } catch (error) {
      console.error('Failed to rotate seen notes filters:', error);
    }
  };

  const formatFilterAge = (ageMs: number): string => {
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
                {isEnabled() ? (isReady() ? 'Active (Local Storage)' : 'Initializing...') : 'Disabled'}
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
                  <span class={styles.statLabel}>New Filter Capacity:</span>
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
                  <span class={styles.statLabel}>Filter Age:</span>
                  <span class={styles.statValue}>
                    {stats()?.filterAge ? formatFilterAge(stats()!.filterAge) : 'Unknown'}
                  </span>
                </div>
                <div class={styles.statItem}>
                  <span class={styles.statLabel}>Filter Age (Days):</span>
                  <span class={styles.statValue}>
                    {stats()?.filterAgeDays || 0} / 7 days
                  </span>
                </div>
              </div>
            </div>
          </Show>

          <div class={styles.actions}>
            <Show when={isEnabled() && isReady()}>
              <button 
                class={styles.actionButton} 
                onClick={handleRotateFilters}
              >
                Rotate Filters Now
              </button>
              <button 
                class={styles.actionButton} 
                onClick={handleClearFilters}
              >
                Clear All Filters
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
