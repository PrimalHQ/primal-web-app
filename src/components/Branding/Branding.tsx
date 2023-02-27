import { Component, Match, Show, Switch } from 'solid-js';

import styles from './Branding.module.scss';
import logo from '../../assets/icons/logo.svg';
import { useNavigate } from '@solidjs/router';

const Branding: Component<{ small: boolean, isHome?: boolean }> = (props) => {
  const navigate = useNavigate();

  const onClick = () => {
    if (props.isHome) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    navigate('/home');
  }

  return (
    <button
      class={styles.logoLink}
      onClick={onClick}
    >
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
    </button>
  )
}

export default Branding;
