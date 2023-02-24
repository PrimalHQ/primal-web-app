import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import styles from './Settings.module.scss';


const Settings: Component = () => {
    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
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
