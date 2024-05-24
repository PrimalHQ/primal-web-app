import { A } from '@solidjs/router';
import { Component, createEffect, For, JSXElement, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle } from '../../types/primal';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticlePreview.module.scss';

const ArticlePreview: Component<{
  id?: string,
  article: PrimalArticle,
}> = (props) => {


  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: 0,
    liked: false,
    reposts: 0,
    reposted: false,
    replies: 0,
    replied: false,
    zapCount: 0,
    satsZapped: 0,
    zapped: false,
    zappedAmount: 0,
    zappedNow: false,
    isZapping: false,
    showZapAnim: false,
    hideZapIcon: false,
    moreZapsAvailable: false,
    isRepostMenuVisible: false,
    topZaps: [],
    topZapsFeed: [],
    quoteCount: 0,
  });

  return (
    <A class={styles.article} href={`/e/${props.article.naddr}`}>
      <div class={styles.header}>
        <div class={styles.userInfo}>
          <Avatar user={props.article.author} size="micro"/>
          <div class={styles.userName}>{userName(props.article.author)}</div>
          <VerificationCheck  user={props.article.author} />
          <div class={styles.nip05}>{props.article.author.nip05 || ''}</div>
        </div>
        <div class={styles.time}>
          {shortDate(props.article.published)}
        </div>
      </div>
      <div class={styles.body}>
        <div class={styles.text}>
          <div class={styles.content}>
            <div class={styles.title}>
              {props.article.title}
            </div>
            <div class={styles.summary}>
              {props.article.summary}
            </div>
          </div>
          <div class={styles.tags}>
            <For each={props.article.tags}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
            <div class={styles.estimate}>
              {Math.ceil(props.article.wordCount / 238)} minute read
            </div>
          </div>
        </div>
        <div class={styles.image}>
          <img src={props.article.image} />
        </div>
      </div>

      <Show when={props.article.topZaps.length > 0}>
        <div class={styles.zaps}>
          <NoteTopZapsCompact
            note={props.article}
            action={() => {}}
            topZaps={props.article.topZaps}
            topZapLimit={4}
          />
        </div>
      </Show>

      <div class={styles.footer}>
        <ArticleFooter
          note={props.article}
          state={reactionsState}
          updateState={updateReactionsState}
          customZapInfo={{
            note: props.article,
            onConfirm: () => {},
            onSuccess: () => {},
            onFail: () => {},
            onCancel: () => {},
          }}
        />
      </div>

    </A>
  );
}

export default hookForDev(ArticlePreview);
