import { Component, Match, Show, Switch } from 'solid-js';

import styles from './Branding.module.scss';
import { useNavigate } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { branding } from '../../translations';
import PageNav from '../PageNav/PageNav';

const Branding: Component<{ small?: boolean, isHome?: boolean, showNav?: boolean }> = (props) => {
  const navigate = useNavigate();
  const intl = useIntl();

  const onClick = () => {
    if (props.isHome) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    navigate('/home');
  }

  return (
    <Show when={!props.showNav} fallback={<PageNav />}>
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
            <span>
              {intl.formatMessage(branding)}
            </span>
          </div>
        </Show>
      </button>
    </Show>
  )
}

export default Branding;
