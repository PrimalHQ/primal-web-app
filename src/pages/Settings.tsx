import { Component } from 'solid-js';
import styles from './Settings.module.scss';


const Settings: Component = () => {
    return (
      <>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Settings
          </div>
        </div>
        <div class={styles.commingSoon}>
          Comming soon.
        </div>
      </>
    )
}

export default Settings;
