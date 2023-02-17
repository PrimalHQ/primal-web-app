import { Component } from 'solid-js';
import styles from './Downloads.module.scss';


const Downloads: Component = () => {
    return (
      <>
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
