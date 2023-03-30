import { useIntl } from '@cookbook/solid-intl';
import { Component } from 'solid-js';
import Branding from '../Branding/Branding';
import Wormhole from '../Wormhole/Wormhole';
import styles from './MissingPage.module.scss';


const MissingPage: Component<{ title: string }> = (props) => {

  const intl = useIntl();

  return (
    <>
      <Wormhole to="branding_holder" >
        <Branding small={false} />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(
            {
              id: 'pages.wip.title',
              defaultMessage: '{title}',
              description: 'Title of page under construction',
            },
            { title: props.title },
          )}
        </div>
      </div>

      <div class={styles.comingSoon}>
        {intl.formatMessage({
          id: 'placeholders.comingSoon',
          defaultMessage: 'Coming soon',
          description: 'Placholder text for missing content',
        })}
      </div>
    </>
  )
}

export default MissingPage;
