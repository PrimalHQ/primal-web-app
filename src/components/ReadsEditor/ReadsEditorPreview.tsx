import { A } from "@solidjs/router";
import { Component, createEffect, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { eventAddresRegex } from "../../constants";

import styles from './ReadsEditorPreview.module.scss';
import { FeedPage, PrimalArticle, PrimalNote, PrimalUser, TopZap } from "../../types/primal";
import { nip05Verification, userName } from "../../stores/profile";
import Avatar from "../../components/Avatar/Avatar";
import { shortDate } from "../../lib/dates";

import PrimalMarkdown from "../../components/PrimalMarkdown/PrimalMarkdown";
import { NoteReactionsState } from "../../components/Note/Note";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import NoteImage from "../../components/NoteImage/NoteImage";
import VerificationCheck from "../../components/VerificationCheck/VerificationCheck";
import BookmarkArticle from "../../components/BookmarkNote/BookmarkArticle";
import NoteContextTrigger from "../../components/Note/NoteContextTrigger";
import { CustomZapInfo, useAppContext } from "../../contexts/AppContext";
import ArticleFooter from "../../components/Note/NoteFooter/ArticleFooter";
import { useMediaContext } from "../../contexts/MediaContext";

export type LongFormData = {
  title: string,
  summary: string,
  image: string,
  tags: string[],
  published: number,
  content: string,
  author: string,
  topZaps: TopZap[],
  id: string,
  client: string,
};

export type LongformThreadStore = {
  article: PrimalArticle | undefined,
  page: FeedPage,
  replies: PrimalNote[],
  users: PrimalUser[],
  isFetching: boolean,
  lastReply: PrimalNote | undefined,
  hasTiers: boolean,
  highlights: any[],
  selectedHighlight: any,
  heightlightReplies: PrimalNote[],
  heighlightsPage: FeedPage,
  replyToHighlight: any,
  noContent: boolean,
}

const ReadsEditorPreview: Component< {
  article: PrimalArticle | undefined,
  isPhoneView?: boolean,
} > = (props) => {
  const app = useAppContext();
  const media = useMediaContext();

  const [naddr, setNaddr] = createSignal<string>();

  createEffect(() => {
    setNaddr(() => props.article?.naddr || '');
  })

  let articleContextMenu: HTMLDivElement | undefined;

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: props.article?.likes || 0,
    liked: false,
    reposts: props.article?.reposts || 0,
    reposted: false,
    replies: props.article?.replies || 0,
    replied: false,
    zapCount: props.article?.zaps || 0,
    satsZapped: props.article?.satszapped || 0,
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

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#read_${naddr()}`,
    children: `a.hero_image_${naddr()}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    thumbSelector: `a.hero_image_${naddr()}`,
    pswpModule: () => import('photoswipe')
  });

  createEffect(() => {
    if (props.article) {
      lightbox.init();
    }
  })

  createEffect(() => {
    updateReactionsState('topZaps', () =>  [ ...(props.article?.topZaps || []) ]);
  });

  const articleMediaImage = () => {
    if (!props.article?.image) return undefined

    return media?.actions.getMedia(props.article?.image, 'o') || props.article?.image;
  }

  const articleMediaThumb = () => {
    if (!props.article?.image) return undefined

    return media?.actions.getMedia(props.article?.image, 'm') ||
      media?.actions.getMedia(props.article?.image, 'o') ||
      props.article?.image;
  }

  const onContextMenuTrigger = () => {
  }

  const isProperArticleOrigin = (origin: string | undefined) => {
    // TODO DECODE EVENT ADDRESS TO GET TO THE CLIENT NAME
    return origin && !eventAddresRegex.test(origin.trim());
  }


  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.article,
    onConfirm: () => {},
    onSuccess: () => {},
    onFail: () => {},
    onCancel: () => {},
  });

  return (
    <>
      <div class={props.isPhoneView ? styles.phoneView : ''}>
        <div class={styles.header}>
          <Show when={props.article?.user}>
            <A href={app?.actions.profileLink(props.article?.user.npub) || ''}>
              <div class={styles.author}>
                <Avatar user={props.article?.user} size="sm" />

                <div class={styles.userInfo}>
                  <div class={styles.userName}>
                    {userName(props.article?.user)}
                    <VerificationCheck user={props.article?.user} />
                  </div>
                  <Show when={props.article?.user.nip05}>
                    <div class={styles.nip05}>
                      {nip05Verification(props.article?.user)}
                    </div>
                  </Show>
                </div>
              </div>
            </A>
          </Show>
        </div>

        <div class={`${styles.topBar} animated`}>
          <div class={styles.left}>
            <div class={styles.time}>
              {shortDate(props.article?.published)}
            </div>
            <Show when={isProperArticleOrigin(props.article?.client)}>
              <div class={styles.client}>
                via {props.article?.client}
              </div>
            </Show>
          </div>

          <div class={styles.right}>
            <BookmarkArticle note={props.article} />
            <NoteContextTrigger
              ref={articleContextMenu}
              onClick={onContextMenuTrigger}
            />
          </div>
        </div>

        <div id={`read_${naddr()}`} class={`${styles.longform} animated`}>
          <Show
            when={props.article}
          >
            <div class={styles.title}>
              {props.article?.title}
            </div>

            <Show when={(props.article?.image || '').length > 0}>
              <NoteImage
                class={`${styles.image} hero_image_${naddr()}`}
                src={props.article?.image}
                altSc={props.article?.image}
                mediaThumb={articleMediaThumb()}
                width={640}
                authorPk={props.article?.pubkey}
                ignoreRatio={true}
              />
            </Show>

            <div class={styles.summary}>
              <div class={styles.border}></div>
              <div class={styles.text}>
                {props.article?.summary}
              </div>
            </div>

            <PrimalMarkdown
              noteId={naddr() || ''}
              content={props.article?.content || ''}
              readonly={true}
              article={props.article}
              ignoreHighlights={true}
            />

            <div class={styles.tags}>
              <For each={props.article?.tags}>
                {tag => (
                  <A href={`/reads/${tag}`} class={styles.tag}>
                    {tag}
                  </A>
                )}
              </For>
            </div>

            <div class={styles.footer}>
              <ArticleFooter
                note={props.article}
                state={reactionsState}
                updateState={updateReactionsState}
                customZapInfo={customZapInfo()}
                size="xwide"
                isPhoneView={true}
              />
            </div>
          </Show>
        </div>
      </div>
    </>
  );
}

export default ReadsEditorPreview;
