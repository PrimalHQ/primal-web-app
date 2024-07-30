import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date, shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { removeHighlight, sendHighlight } from '../../lib/highlights';
import { userName } from '../../stores/profile';
import { NostrRelaySignedEvent, PrimalArticle, PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticleHighlight.module.scss';

const topOffset = 64 + 8;

type Coord = {
  x: number;
  y: number;
};

const ArticleHighlightComments: Component<{
  id?: string,
  highlight: any,
  comments: PrimalNote[],
  author: PrimalUser,
}> = (props) => {
  const account = useAccountContext();

  const comms = () => {
    console.log('COMMS: ', props.comments.map(c => c.noteId));
    return props.comments.filter(c => c.replyTo === props.highlight.id);}

  return (
    <Show when={props.highlight !== undefined}>
      <div
        class={styles.articleHighlightComments}
        data-highlight={props.highlight.id}
      >
        <div class={styles.header}>
          <div class={styles.author}>
            <div class={styles.iconHighlight}></div>
            <Avatar user={props.author} size="xxs" />
          </div>

          <div class={styles.caption}>
            <span class={styles.name}>{userName(props.author)}</span> highlighted
          </div>
        </div>
        <For each={comms()}>
          {comment => (
            <div class={styles.highlightComment}>
              <div class={styles.commentAuthor}>
                <Avatar user={comment.user} size="xxs" />
                <div class={styles.name}>{userName(comment.user)}</div>
                <VerificationCheck user={comment.user} />
                <div>commented:</div>
                <div class={styles.time}>{date(comment.msg.created_at || 0).label}</div>
              </div>
              <div class={styles.commentContent}>
                {comment.content}
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export default hookForDev(ArticleHighlightComments);
