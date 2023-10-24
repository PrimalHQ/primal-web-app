import { A } from '@solidjs/router';
import { Component, createSignal, Show } from 'solid-js';
import { PrimalNote, PrimalRepost, PrimalUser } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import NoteReplyHeader from './NoteHeader/NoteReplyHeader';
import Avatar from '../Avatar/Avatar';
import { date } from '../../lib/dates';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

const NoteRepostHeader: Component<{
  repost?: PrimalRepost,
  id?: string,
}> = (props) => {
  const intl = useIntl();

  const reposterName = () => {
    if (!props.repost) {
      return '';
    }

    return authorName(props.repost.user);
  }

  return (
    <div class={styles.repostedBy}>
      <div class={styles.repostIcon}></div>
      <span>
        <A href={`/p/${props.repost?.user.npub}`} >
          {reposterName()}
        </A>
        <span>
          {intl.formatMessage(t.reposted)}
        </span>
      </span>
    </div>
  )
}

export default hookForDev(NoteRepostHeader);
