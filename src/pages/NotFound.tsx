import { useIntl } from '@cookbook/solid-intl';
import { Component } from 'solid-js';
import MissingPage from '../components/MissingPage/MissingPage';

import styles from './NotFound.module.scss';

const NotFound: Component = () => {

  const intl = useIntl();

  return (
    <MissingPage title="404" >
      <p class={styles.message} >
        {intl.formatMessage({
          id: 'placeholders.pageNotFound',
          defaultMessage: 'Page not found',
          description: 'Placholder text for missing page',
        })}
      </p>
    </MissingPage>
  );
}

export default NotFound;
