import { A } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, onMount, Show } from 'solid-js';
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
import ParsedNote from '../ParsedNote/ParsedNote';

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
  getCoAuthors: (highlight: any) => PrimalUser[],
}> = (props) => {
  const account = useAccountContext();

  const comms = () => {
    return props.comments.filter(c => c.replyTo === props.highlight.id);
  }

  const [top, setTop] = createSignal(-1);
  const [height, setHeight] = createSignal(-1);

  let commentRef: HTMLDivElement | undefined;

  createEffect(() => {
    const h = props.highlight;

    if (!h || !commentRef) return;

    const hDiv = document.querySelector(`a[data-highlight="${h.id}"]`);

    if (!hDiv) return;

    const hTop = hDiv.getBoundingClientRect().top;
    const maxH = window.innerHeight - 104;
    const minT = 84;

    const cH = commentRef.offsetHeight || 78;
    const actualH = Math.min(maxH, cH);
    const actualT = cH >= maxH ? minT :
      Math.max(hTop - actualH/2, minT);

    setTop(() => actualT);
    setHeight(() => actualH);
  });

  const [coAuthors, setCoAuthors] = createSignal<PrimalUser[]>([]);

  createEffect(() => {
    const coauth = props.getCoAuthors(props.highlight);

    setCoAuthors(() => [...coauth]);
  })

  const style = () => {
    let ret = '';

    if (top() >= 0) {
      ret += `top: ${top()}px; `
    }

    ret += `max-height: ${window.innerHeight - top()}px;`

    return ret;

  }

  return (
    <Show when={props.highlight !== undefined}>
      <div
        class={styles.articleHighlightComments}
        data-highlight={props.highlight.id}
        style={style()}
        ref={commentRef}
      >
        <div class={styles.header}>
          <div class={styles.author}>
            <div class={styles.iconHighlight}></div>
            <Avatar user={props.author} size="xxs" />
            <For each={coAuthors().slice(0, 5)}>
              {author => (
                <Avatar user={author} size="xxs" />
              )}
            </For>
            <Show when={coAuthors().length > 5}><div class={styles.dots}>...</div></Show>
          </div>

          <div class={styles.caption}>
            <span class={styles.name}>{userName(props.author)}</span>
            <Show when={coAuthors().length === 1}>
              <span class={styles.suffix}>and <span class={styles.name}>{userName(coAuthors()[0])}</span></span>
            </Show>
            <Show when={coAuthors().length > 1}>
              <span class={styles.suffix}>and {coAuthors().length} others</span>
            </Show>
            <span class={styles.suffix}>highlighted</span>
          </div>
        </div>
        <For each={comms()}>
          {comment => (
            <div class={styles.highlightComment}>
              <div class={styles.commentAuthor}>
                <Avatar user={comment.user} size="xxs" />
                <div class={styles.name}>{userName(comment.user)}</div>
                <VerificationCheck user={comment.user} />
                <div class={styles.time}>{date(comment.msg.created_at || 0).label}</div>
              </div>
              <div class={styles.commentContent}>
                <ParsedNote
                  note={comment}
                />
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export default hookForDev(ArticleHighlightComments);
