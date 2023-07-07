import { useIntl } from '@cookbook/solid-intl';
import { Component } from 'solid-js';
import MissingPage from '../components/MissingPage/MissingPage';
import { placeholders } from '../translations';

import styles from './NotFound.module.scss';

const NotFound: Component = () => {

  const intl = useIntl();

  return (
    <MissingPage title="404" >
      <p class={styles.message} >
        {intl.formatMessage(placeholders.pageNotFound)}
      </p>
    </MissingPage>
  );
}

export default NotFound;
