import { useIntl } from '@cookbook/solid-intl';
import { Component, JSXElement, Show } from 'solid-js';
import Branding from '../Branding/Branding';
import Wormhole from '../Wormhole/Wormhole';
import styles from './MissingPage.module.scss';


const MissingPage: Component<{ title: string, children?: JSXElement }> = (props) => {

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

      <Show
        when={props.children}
        fallback={
          <div class={styles.comingSoon}>
            {intl.formatMessage({
              id: 'placeholders.comingSoon',
              defaultMessage: 'Coming soon',
              description: 'Placholder text for missing content',
            })}
          </div>
        }
      >
        <div class={styles.comingSoon}>
          {props.children}
        </div>
      </Show>
    </>
  )
}

export default MissingPage;
