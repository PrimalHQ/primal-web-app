import type { Component } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';

import styles from './PageNav.module.scss';
import { ariaLabels as tAria } from '../../translations';

const PageNav: Component<{ id?: string }> = (props) => {

  const intl = useIntl();

  const onBack = () => {
    window.history.back();
  }

  const onNext = () => {
    window.history.forward();
  }

  return (
    <div id={props.id}>
      <button
        type="button"
        onClick={onBack}
        class={styles.backIcon}
        aria-label={intl.formatMessage(tAria.pageNav.back)}
        title={intl.formatMessage(tAria.pageNav.back)}
      >
      </button>
      <button
        type="button"
        onClick={onNext}
        class={styles.forwardIcon}
        aria-label={intl.formatMessage(tAria.pageNav.forward)}
        title={intl.formatMessage(tAria.pageNav.forward)}
      >
      </button>
    </div>
  )
}

export default hookForDev(PageNav);
