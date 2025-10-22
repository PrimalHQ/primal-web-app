import { Component, createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useAppContext } from '../../contexts/AppContext';
import { useMediaContext } from '../../contexts/MediaContext';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { PrimalArticle } from '../../types/primal';
import { urlEncode } from '../../utils';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';

import styles from './ArticlePreview.module.scss';
import { nip19 } from 'nostr-tools';
import { useNavigate } from '@solidjs/router';
import { accountStore } from '../../stores/accountStore';

const isDev = localStorage.getItem('devMode') === 'true';

export type ArticleProps = {
  id?: string,
  article: PrimalArticle,
  onClick?: (article: PrimalArticle) => void,
  hideStats?: boolean,
  isDraft?: boolean,
  onRemove?: (id: string) => void,
};


const ArticleOverview: Component<ArticleProps> = (props) => {
  const app = useAppContext();
  const media = useMediaContext();
  const navigate = useNavigate();

  let articleContextMenu: HTMLDivElement | undefined;


  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    bookmarks: props.article.bookmarks || 0,
    likes: props.article.likes || 0,
    liked: props.article.noteActions?.liked || false,
    reposts: props.article.reposts || 0,
    reposted: props.article.noteActions?.reposted || false,
    replies: props.article.replies || 0,
    replied: props.article.noteActions?.replied || false,
    zapCount: props.article.zaps || 0,
    satsZapped: props.article.satszapped || 0,
    zapped: props.article.noteActions?.zapped || false,
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

  const openReactionModal = (openOn = 'likes') =>  {
    app?.actions.openReactionModal(props.article.naddr, {
      likes: reactionsState.likes,
      zaps: reactionsState.zapCount,
      reposts: reactionsState.reposts,
      quotes: reactionsState.quoteCount,
      openOn,
    });
  };

  const onContextMenuTrigger = () => {
    if (props.isDraft) {
      app?.actions.openArticleDraftContextMenu(
        props.article,
        articleContextMenu?.getBoundingClientRect(),
        () => {},
        openReactionModal,
        () => {
          props.onRemove && props.onRemove(props.article.noteId);
        },
      );

      return;
    }

    app?.actions.openArticleOverviewContextMenu(
      props.article,
      articleContextMenu?.getBoundingClientRect(),
      () => {},
      openReactionModal,
      () => {
        props.onRemove && props.onRemove(props.article.noteId);
      },
    );
  }

  const [missingCacheImage, setMissingChacheImage] = createSignal(false);

  const articleImage = () => {
    const url = props.article.image;
    setMissingChacheImage(() => false);

    let m = media?.actions.getMediaUrl(url, 's');

    if (!m) {
      m = media?.actions.getMediaUrl(url, 'm');
    }

    if (!m) {
      m = media?.actions.getMediaUrl(url, 'o');
    }

    if (!m) {
      m = url;
      setMissingChacheImage(() => true);
    }

    return m;
  }

  const onImageLoaded = () => {};

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = accountStore.activeUser?.picture || '';

    image.onerror = "";
    image.src = src;
    return true;
  };


  const articleUrl = () => {
    const vanityName = app?.verifiedUsers[props.article.pubkey];

    if (!vanityName) return `/a/${props.article.naddr}`;

    const decoded = nip19.decode(props.article.naddr);

    const data = decoded.data as nip19.AddressPointer;

    return `/${vanityName}/${urlEncode(data.identifier)}`;
  }

  return (
    <div
      class={styles.articleOverview}
      onClick={() => {
        if (props.isDraft) {
          navigate(`/reads/edit/${props.article.naddr}`);
          return
        };

        navigate(articleUrl())
      }}
    >
      <div class={styles.upRightFloater}>
        <NoteContextTrigger
          ref={articleContextMenu}
          onClick={onContextMenuTrigger}
        />
      </div>

      <div class={styles.leftColumn}>
        <img
          src={articleImage()}
          onload={onImageLoaded}
          onerror={onImageError}
          class={isDev && missingCacheImage() ? 'redBorder' : ''}
        />
      </div>
      <div class={styles.rightColumn}>
        <div class={styles.header}>
          <Show when={props.article.published}>
            <div class={styles.published}>
              Published: {shortDate(props.article.published)}
            </div>
          </Show>

          <Show when={props.article.published && props.article.msg.created_at }>
            <div class={styles.separator}></div>
          </Show>

          <Show when={props.article.msg.created_at }>
            <div class={styles.updated}>
              Updated: {shortDate(props.article.msg.created_at)}
            </div>
          </Show>

          <Show when={props.article.published || props.article.msg.created_at }>
            <div class={styles.separator}></div>
          </Show>

          <a href={`/reads/edit/${props.article.naddr}`}>
            Edit
          </a>
        </div>

        <div class={styles.title}>
          {props.article.title}
        </div>

        <Show when={!props.hideStats}>
          <div class={styles.stats}>
            <div class={styles.stat}>
              <div class={styles.value}>
                {reactionsState.bookmarks}
              </div>
              <div class={styles.label}>
                Bookmarks
              </div>
            </div>

            <div class={styles.stat}>
              <div class={styles.value}>
                {reactionsState.replies}
              </div>
              <div class={styles.label}>
                Comments
              </div>
            </div>

            <div class={styles.stat}>
              <div class={styles.value}>
                {reactionsState.replies}
              </div>
              <div class={styles.label}>
                Reactions
              </div>
            </div>

            <div class={styles.stat}>
              <div class={styles.value}>
                {reactionsState.reposts}
              </div>
              <div class={styles.label}>
                Reposts
              </div>
            </div>

            <div class={styles.stat}>
              <div class={styles.value}>
                {reactionsState.zapCount}
              </div>
              <div class={styles.label}>
                Zaps
              </div>
            </div>

          </div>
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(ArticleOverview);
