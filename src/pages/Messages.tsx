import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import styles from './Messages.module.scss';


const Messages: Component = () => {
    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Messages
          </div>
        </div>
        <div class={styles.comingSoon}>
          Coming soon.
        </div>
      </>
    )
}

export default Messages;
