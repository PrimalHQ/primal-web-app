import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import styles from './Downloads.module.scss';


const Downloads: Component = () => {
    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Downloads
          </div>
        </div>
        <div class={styles.commingSoon}>
          Comming soon.
        </div>
      </>
    )
}

export default Downloads;
