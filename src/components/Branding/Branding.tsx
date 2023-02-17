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
              <img src={logo} alt="logo" />
            </div>
          }
        >
          <div class={styles.branding}>
            <img src={logo} alt="logo" />
            <span>primal</span>
          </div>
        </Show>
      </A>
    )
}

export default Branding;
