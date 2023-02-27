import { Component, Match, Show, Switch } from 'solid-js';

import styles from './Branding.module.scss';
import logo from '../../assets/icons/logo.svg';
import { A } from '@solidjs/router';

const Branding: Component<{ small: boolean }> = (props) => {

    return (
      <A href="/home" class={styles.logoLink}>
        <Show
          when={!props.small}
          fallback={
            <div class={styles.brandingSmall}>
              <div class={styles.logo} />
            </div>
          }
        >
          <div class={styles.branding}>
            <div class={styles.logo} />
            <span>primal</span>
          </div>
        </Show>
      </A>
    )
}

export default Branding;
