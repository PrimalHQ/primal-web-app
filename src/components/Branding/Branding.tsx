import { Component, Match, Show, Switch } from 'solid-js';

import styles from './Branding.module.scss';
import { useNavigate } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { branding } from '../../translations';
import PageNav from '../PageNav/PageNav';

const Branding: Component<{ small?: boolean, isHome?: boolean }> = (props) => {
  const navigate = useNavigate();
  const intl = useIntl();

  const toHomeOrScrollToTop = () => {
    if (props.isHome) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    navigate('/home');
  }

  return (
    <button
      class={styles.logoLink}
      onClick={toHomeOrScrollToTop}
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
          <div class={styles.logoBig} />
        </div>
      </Show>
    </button>
  )
}

export default Branding;
