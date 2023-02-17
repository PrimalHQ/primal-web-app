import { Component } from 'solid-js';
import styles from './Notifications.module.scss';


const Notifications: Component = () => {
    return (
      <>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Notifications
          </div>
        </div>
        <div class={styles.commingSoon}>
          Comming soon.
        </div>
      </>
    )
}

export default Notifications;
