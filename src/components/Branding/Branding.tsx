import { Component, Show } from 'solid-js';

import styles from './Branding.module.scss';
import { useNavigate } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';

const Branding: Component<{ small: boolean, isHome?: boolean }> = (props) => {
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
            {intl.formatMessage(
              {
                id: 'branding',
                defaultMessage: 'Primal',
                description: 'Brand name',
              }
            )}
          </span>
        </div>
      </Show>
    </button>
  )
}

export default Branding;
