import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import styles from './Help.module.scss';


const Help: Component = () => {
    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Help
          </div>
        </div>
        <div class={styles.comingSoon}>
          Coming soon.
        </div>
      </>
    )
}

export default Help;
