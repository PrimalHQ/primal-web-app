import { A } from '@solidjs/router';
import { Component, createSignal, Show } from 'solid-js';
import { wordsPerMinute } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { useMediaContext } from '../../contexts/MediaContext';
import { date } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle } from '../../types/primal';
import { urlEncode } from '../../utils';
import Avatar from '../Avatar/Avatar';

import styles from './ArticlePreview.module.scss';
import { nip19 } from 'nostr-tools';

const isDev = localStorage.getItem('devMode') === 'true';

const ArticleShort: Component<{
  id?: string,
  article: PrimalArticle,
  short?: boolean,
  shorter?: boolean,
  noBorder?: boolean,
}> = (props) => {
  const media = useMediaContext();
  const app = useAppContext();

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

  const articleUrl = () => {
    if (!props.article) return '';

    const vanityName = app?.verifiedUsers[props.article.pubkey];

    if (!vanityName) return `/a/${props.article.naddr}`;

    const decoded = nip19.decode(props.article.naddr);

    const data = decoded.data as nip19.AddressPointer;

    return `/${vanityName}/${urlEncode(data.identifier)}`;
  }

  return (
    <A
      class={`${styles.articleShort} ${props.noBorder ? styles.noBorder : ''}`}
      href={articleUrl()}
      data-event={props.article.id}
    >
      <div class={styles.header}>
        <Avatar user={props.article.user} size="micro"/>
        <div class={styles.userName}>{userName(props.article.user)}</div>
        <div class={styles.time}>
          &bull;&nbsp;
          {date(props.article.published).label}
        </div>
      </div>

      <div class={styles.body}>
        <div class={`${styles.text} ${props.short ? styles.short : ''} ${props.shorter ? styles.shorter : ''}`}>
          <div class={styles.title}>
            {props.article.title}
          </div>
          <div class={styles.estimate}>
            {Math.ceil(props.article.wordCount / wordsPerMinute)} minutes
          </div>
        </div>
        <div class={styles.image}>
          <Show
            when={props.article.image}
            fallback={
              <img
                src={authorAvatar()}
                class={isDev && missingCacheImage() ? 'redBorder' : ''}
              />
            }
          >
            <img
              src={articleImage()}
              class={isDev && missingCacheImage() ? 'redBorder' : ''}
            />
          </Show>
        </div>
      </div>
    </A>
  );
}

export default hookForDev(ArticleShort);
