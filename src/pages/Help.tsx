import { Component } from 'solid-js';
import styles from './Help.module.scss';


const Help: Component = () => {
    return (
      <>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Help
          </div>
        </div>
        <div class={styles.commingSoon}>
          Comming soon.
        </div>
      </>
    )
}

export default Help;
