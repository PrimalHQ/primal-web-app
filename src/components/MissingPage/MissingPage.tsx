import { useIntl } from '@cookbook/solid-intl';
import { Component, JSXElement, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { placeholders as t } from '../../translations';
import Branding from '../Branding/Branding';
import PageTitle from '../PageTitle/PageTitle';
import Search from '../Search/Search';
import Wormhole from '../Wormhole/Wormhole';
import styles from './MissingPage.module.scss';


const MissingPage: Component<{ title: string, children?: JSXElement, id?: string }> = (props) => {

  const intl = useIntl();

  return (
    <div id={props.id}>
      <PageTitle title={intl.formatMessage(
          t.pageWIPTitle,
          { title: props.title },
        )}
      />

      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(
            t.pageWIPTitle,
            { title: props.title },
          )}
        </div>
      </div>

      <Show
        when={props.children}
        fallback={
          <div class={styles.comingSoon}>
            {intl.formatMessage(t.comingSoon)}
          </div>
        }
      >
        <div class={styles.comingSoon}>
          {props.children}
        </div>
      </Show>
    </div>
  )
}

export default hookForDev(MissingPage);
