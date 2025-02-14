import { A } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';

import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { authorName } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import { useAppContext } from '../../contexts/AppContext';


const NoteRepostHeader: Component<{
  note?: PrimalNote,
  id?: string,
}> = (props) => {
  const intl = useIntl();
  const app = useAppContext();

  const repost = () => props.note?.repost;

  const reposterName = () =>  authorName(repost()?.user);

  const others = () => {
    const reposts = props.note?.post.reposts || 0;

    return reposts > 0 ? reposts - 1 : 0;
  }

  return (
    <div class={styles.repostedBy}>
      <div class={styles.repostIcon}></div>
      <span>
        <A href={app?.actions.profileLink(repost()?.user.npub) || ''} >
          {reposterName()}
          {intl.formatMessage(
            t.repostedOthers,
            {
              number: others(),
            },
          )}
        </A>
        <span>
          {intl.formatMessage(t.reposted)}
        </span>
      </span>
    </div>
  )
}

export default hookForDev(NoteRepostHeader);
