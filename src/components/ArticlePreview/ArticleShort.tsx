import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, JSXElement, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { date, shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
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

  return (
    <A class={styles.articleShort} href={`/e/${props.article.noteId}`}>
      <div class={styles.header}>
        <div class={styles.userInfo}>
          <Avatar user={props.article.user} size="micro"/>
          <div class={styles.userName}>{userName(props.article.user)}</div>
        </div>
        <div class={styles.time}>
          {date(props.article.published).label}
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.text}>
          <div class={styles.content}>
            <div class={styles.title}>
              {props.article.title}
            </div>
            <div class={styles.estimate}>
              {Math.ceil(props.article.wordCount / 238)} minutes
            </div>
          </div>
        </div>
        <div class={styles.image}>
          <Show
            when={props.article.image}
            fallback={<div class={styles.placeholderImage}></div>}
          >
            <img src={props.article.image} />
          </Show>
        </div>
      </div>
    </A>
  );
}

export default hookForDev(ArticlePreview);
