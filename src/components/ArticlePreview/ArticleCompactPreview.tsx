import { A, useNavigate } from '@solidjs/router';
import { batch, Component, createEffect, createSignal, For, JSXElement, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { wordsPerMinute } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useMediaContext } from '../../contexts/MediaContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle, TopZap, ZapOption } from '../../types/primal';
import { urlEncode, uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import defaultAvatarDark from '../../assets/images/reads_image_dark.png';
import defaultAvatarLight from '../../assets/images/reads_image_light.png';

import styles from './ArticlePreview.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import NoteTopZapsTiny from '../Note/NoteTopZapsTiny';
import { nip19 } from 'nostr-tools';

const isDev = localStorage.getItem('devMode') === 'true';

const ArticleCompactPreview: Component<{
  id?: string,
  article: PrimalArticle,
  height?: number,
  onRender?: (article: PrimalArticle, el: HTMLAnchorElement | undefined) => void,
  hideFooter?: boolean,
  hideContext?: boolean,
  bordered?: boolean,
  noLinks?: string,
  onClick?: () => void,
  onRemove?: (id: string) => void,
}> = (props) => {

  const app = useAppContext();
  const account = useAccountContext();
  const thread = useThreadContext();
  const media = useMediaContext();
  const settings = useSettingsContext();
  const navigate = props.noLinks === 'links' ? () => { } : useNavigate();

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
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

  let latestTopZap: string = '';
  let latestTopZapFeed: string = '';
  let articleContextMenu: HTMLDivElement | undefined;

  const onConfirmZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    batch(() => {
      updateReactionsState('zappedAmount', () => zapOption.amount || 0);
      updateReactionsState('satsZapped', (z) => z + (zapOption.amount || 0));
      updateReactionsState('zapped', () => true);
      updateReactionsState('showZapAnim', () => true)
    });

    addTopZap(zapOption);
    addTopZapFeed(zapOption)
  };

  const onSuccessZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    const pubkey = account?.publicKey;

    if (!pubkey) return;

    batch(() => {
      updateReactionsState('zapCount', (z) => z + 1);
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => true);
    });
  };

  const onFailZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => props.article.noteActions.zapped);
    });

    removeTopZap(zapOption);
    removeTopZapFeed(zapOption);
  };

  const onCancelZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      updateReactionsState('zappedAmount', () => -(zapOption.amount || 0));
      updateReactionsState('satsZapped', (z) => z - (zapOption.amount || 0));
      updateReactionsState('isZapping', () => false);
      updateReactionsState('showZapAnim', () => false);
      updateReactionsState('hideZapIcon', () => false);
      updateReactionsState('zapped', () => props.article.noteActions.zapped);
    });

    removeTopZap(zapOption);
    removeTopZapFeed(zapOption);
  };

  const addTopZap = (zapOption: ZapOption) => {
    const pubkey = account?.publicKey;

    if (!pubkey) return;

    const oldZaps = [ ...reactionsState.topZaps ];

    latestTopZap = uuidv4() as string;

    const newZap = {
      amount: zapOption.amount || 0,
      message: zapOption.message || '',
      pubkey,
      eventId: props.article.id,
      id: latestTopZap,
    };

    if (!thread?.users.find((u) => u.pubkey === pubkey)) {
      thread?.actions.fetchUsers([pubkey])
    }

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount);
    updateReactionsState('topZaps', () => [...zaps]);
  };

  const removeTopZap = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZaps.filter(z => z.id !== latestTopZap);
    updateReactionsState('topZaps', () => [...zaps]);
  };


  const addTopZapFeed = (zapOption: ZapOption) => {
    const pubkey = account?.publicKey;

    if (!pubkey) return;

    const oldZaps = [ ...reactionsState.topZapsFeed ];

    latestTopZapFeed = uuidv4() as string;

    const newZap = {
      amount: zapOption.amount || 0,
      message: zapOption.message || '',
      pubkey,
      eventId: props.article.id,
      id: latestTopZapFeed,
    };

    const zaps = [ ...oldZaps, { ...newZap }].sort((a, b) => b.amount - a.amount).slice(0, 4);
    updateReactionsState('topZapsFeed', () => [...zaps]);
  }

  const removeTopZapFeed = (zapOption: ZapOption) => {
    const zaps = reactionsState.topZapsFeed.filter(z => z.id !== latestTopZapFeed);
    updateReactionsState('topZapsFeed', () => [...zaps]);
  };

  const customZapInfo: () => CustomZapInfo = () => ({
    note: props.article,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
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
    app?.actions.openContextMenu(
      props.article,
      articleContextMenu?.getBoundingClientRect(),
      () => {
        app?.actions.openCustomZapModal(customZapInfo());
      },
      openReactionModal,
      () => {
        props.onRemove && props.onRemove(props.article.noteId);
      },
    );
  }

  let articlePreview: HTMLAnchorElement | undefined;

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

  const authorAvatar = () => {
    const url = props.article.user.picture;
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

  const onImageLoaded = () => {
    props.onRender && props.onRender(props.article, articlePreview);
  };

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = authorAvatar();

    if (image.src === src || image.src.endsWith(src)) {
      src = ['sunrise_wave', 'ice_wave'].includes(settings?.theme || '') ? defaultAvatarLight : defaultAvatarDark;
    }

    image.onerror = "";
    image.src = src;
    return true;
  };

  const countLines = (el: Element) => {

    // @ts-ignore
    var divHeight = el.offsetHeight

    // @ts-ignore
    var lineHeight = el.computedStyleMap().get('line-height').value;

    var lines = divHeight / lineHeight;

    return lines;
  }

  const [contentStyle, setContentStyle] = createSignal('T3');

  createEffect(() => {
    const t = props.article.title;
    const s = props.article.summary;

    const tt = articlePreview?.querySelector(`.${styles.title}`);
    const ss = articlePreview?.querySelector(`.${styles.summary}`);

    if (!tt || !ss) return;

    const titleLines = countLines(tt);
    const summaryLines = countLines(ss);

    if (titleLines === 1) setContentStyle('T1');

    if (titleLines === 2) setContentStyle('T2');

    if (titleLines === 3) setContentStyle('T3');
  });

  const conetntStyles = () => {
    if (contentStyle() === 'T1') return styles.t1;
    if (contentStyle() === 'T2') return styles.t2;

    return ''
  }

  const articleUrl = () => {
    const vanityName = app?.verifiedUsers[props.article.pubkey];

    if (!vanityName) return `/a/${props.article.naddr}`;

    const decoded = nip19.decode(props.article.naddr);

    const data = decoded.data as nip19.AddressPointer;

    return `/${vanityName}/${urlEncode(data.identifier)}`;
  }

  const wrapper = (children: JSXElement) => {
    if (props.noLinks === 'links') {
      return (
        <div
          class={styles.articleCompact}
          onClick={() => props.onClick && props.onClick()}
        >
          {children}
        </div>
      );
    }

    return (
      <A
        ref={articlePreview}
        class={styles.articleCompact}
        href={articleUrl()}
      >
        {children}
      </A>
    )
  }

  return wrapper(
    <>
      <div class={styles.image}>
        <Show
          when={props.article.image}
          fallback={
            <Show
              when={authorAvatar()}
              fallback={<div class={styles.placeholderImage}></div>}
            >
              <img src={props.article.user.picture} onload={onImageLoaded} onerror={onImageError} />
            </Show>
          }
        >
          <img
            src={articleImage()}
            onload={onImageLoaded}
            onerror={onImageError}
            class={isDev && missingCacheImage() ? 'redBorder' : ''}
          />
        </Show>
      </div>

      <div class={styles.articleInfo}>
        <div class={styles.header}>
          <div class={styles.userInfo}>
            <Avatar user={props.article.user} size="micro"/>
            <div class={styles.userName}>{userName(props.article.user)}</div>
            <VerificationCheck user={props.article.user} />
            <div class={styles.nip05}>{props.article.user?.nip05 || ''}</div>
          </div>
          <div class={styles.time}>
            {shortDate(props.article.published)}
          </div>
        </div>

        <div class={styles.body}>
          <div class={styles.text}>
            <div class={`${styles.content} ${conetntStyles()}`}>
              <div class={styles.title}>
                {props.article.title}
              </div>
              <div class={styles.summary}>
                {props.article.summary}
              </div>
            </div>
            <div class={styles.footer}>
              <div class={styles.tags}>
                <div class={styles.estimate}>
                  {Math.ceil(props.article.wordCount / wordsPerMinute)} min read
                </div>
                <div class={styles.comments}>
                  <div class={styles.commentIcon}></div>
                  <div class={styles.commentCount}>
                    {props.article.replies} comments
                  </div>
                </div>
              </div>

              <div class={styles.zaps}>
              <div class={styles.zapIcon}></div>
                <NoteTopZapsTiny
                  note={props.article}
                  action={(zap: TopZap) => app && props.noLinks !== 'links' && navigate(app.actions.profileLink(zap.pubkey))}
                  topZaps={props.article.topZaps}
                  topZapLimit={3}
                  hideMessage={true}
                />
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* <Show when={props.article.topZaps?.length > 0}>
        <div class={styles.zaps}>
          <NoteTopZapsCompact
            note={props.article}
            action={() => {}}
            topZaps={props.article.topZaps}
            topZapLimit={4}
          />
        </div>
      </Show>

      <Show when={!props.hideFooter}>
        <div class={styles.footer}>
          <ArticleFooter
            note={props.article}
            state={reactionsState}
            updateState={updateReactionsState}
            customZapInfo={customZapInfo()}
            onZapAnim={addTopZapFeed}
          />
        </div>
      </Show> */}

    </>
  );
}

export default hookForDev(ArticleCompactPreview);
