import { Component, For, JSXElement, onMount, Show, } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './ChatMessage.module.scss';
import { nip19 } from '../../lib/nTools';
import { truncateNpub, userName } from '../../stores/profile';
import { PrimalArticle, PrimalUser } from '../../types/primal';
import { useDMContext } from '../../contexts/DMContext';
import { A } from '@solidjs/router';
import { useAppContext } from '../../contexts/AppContext';
import { decodeIdentifier, hexToNpub } from '../../lib/keys';
import { isDev, urlEncode } from '../../utils';
import { hashtagCharsRegex, Kind, linebreakRegex, lnUnifiedRegex, noteRegex, specialCharsRegex, urlExtractRegex } from '../../constants';
import { createStore } from 'solid-js/store';
import { NoteContent } from '../ParsedNote/ParsedNote';
import { isInterpunction, isUrl, isImage, isMp4Video, isOggVideo, isWebmVideo, isYouTube, isSpotify, isTwitch, isMixCloud, isSoundCloud, isAppleMusic, isWavelake, getLinkPreview, isNoteMention, isUserMention, isAddrMention, isTagMention, isHashtag, isCustomEmoji, isUnitifedLnAddress, isLnbc, is3gppVideo } from '../../lib/notes';
import { generatePrivateKey } from '../../lib/nTools';
import { useMediaContext } from '../../contexts/MediaContext';
import NoteImage from '../NoteImage/NoteImage';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteVideo from '../ParsedNote/NoteVideo';


const groupGridLimit = 7;

const ChatMessage: Component<{
  id?: string,
  content: string,
  sender: string,
  ignoreMedia?: boolean,
  noLinks?: string,
  noPreviews?: boolean,
  mentionedUsers: PrimalUser[],
  event: any,
}> = (props) => {
  const app = useAppContext();
  const media = useMediaContext();
  const dms = useDMContext();

  // const [tokens, setTokens] = createStore<string[]>([]);
  const [content, setContent] = createStore<NoteContent[]>([]);

  let lastSignificantContent = 'text';
  let isAfterEmbed = false;
  let totalLinks = 0;

  onMount(() => {
    generateContent();
  });

  const noteWidth = () => 514;

  const updateContent = (contentArray: NoteContent[], type: string, token: string, meta?: Record<string, any>) => {
    const len = contentArray.length;
    const index = contentArray.length -1

    if (len > 0 && contentArray[len -1].type === type) {

      setContent(index, 'tokens' , (els) => [...els, token]);

      meta && setContent(index, 'meta' , () => ({ ...meta }));

      return;
    }

    setContent(len, () => ({ type, tokens: [token], meta }));
  }

  const generateContent = () => {

    const tokens = parseContent();

    for (let i=0; i<tokens.length; i++) {
      const token = tokens[i];

      parseToken(token);
    }

    // Check if the last media is the last meaningfull content in the note
    // And if so, make it the actual last content
    // @ts-ignore
    const lastMediaIndex = content.findLastIndex(c => c.type !== 'text');

    const lastContent = content[content.length - 1];

    if (lastMediaIndex === content.length - 2 && lastContent.type === 'text' && lastContent.tokens.every(t => [' ', ''].includes(t))) {
      setContent((cont) => cont.slice(0, cont.length - 1));
    }
  };

  const parseContent = () => {
    const content = props.content.replace(linebreakRegex, ' __LB__ ').replace(/\s+/g, ' __SP__ ');

    const tks = content.split(/[\s]+/);

    return tks;
  }

  const parseToken = (token: string) => {
    if (token === '__LB__') {
      if (isAfterEmbed) {
        return;
      }

      updateContent(content, 'linebreak', token);
      lastSignificantContent = 'LB';
      return;
    }

    if (token === '__SP__') {
      if (!['image', 'video', 'LB'].includes(lastSignificantContent)) {
        updateContent(content, 'text', ' ');
      }
      return;
    }

    isAfterEmbed = false;

    if (isInterpunction(token)) {
      lastSignificantContent = 'text';
      updateContent(content, 'text', token);
      return;
    }

    if (isUrl(token)) {
      const index = token.indexOf('http');

      if (index > 0) {
        const prefix = token.slice(0, index);

        const matched = (token.match(urlExtractRegex) || [])[0];

        if (matched) {
          const suffix = token.substring(matched.length + index, token.length);

          parseToken(prefix);
          parseToken(matched);
          parseToken(suffix);
          return;
        } else {
          parseToken(prefix);
          parseToken(token.slice(index));
          return;
        }
      }

      if (!props.ignoreMedia) {
        if (isImage(token)) {
          removeLinebreaks('image');
          isAfterEmbed = true;
          lastSignificantContent = 'image';
          updateContent(content, 'image', token);
          return;
        }

        if (isMp4Video(token)) {
          removeLinebreaks('video');
          isAfterEmbed = true;
          lastSignificantContent = 'video';
          updateContent(content, 'video', token, { videoType: 'video/mp4'});
          return;
        }

        if (isOggVideo(token)) {
          removeLinebreaks('video');
          isAfterEmbed = true;
          lastSignificantContent = 'video';
          updateContent(content, 'video', token, { videoType: 'video/ogg'});
          return;
        }

        if (isWebmVideo(token)) {
          removeLinebreaks('video');
          isAfterEmbed = true;
          lastSignificantContent = 'video';
          updateContent(content, 'video', token, { videoType: 'video/webm'});
          return;
        }

        if (is3gppVideo(token)) {
          removeLinebreaks('video');
          isAfterEmbed = true;
          lastSignificantContent = 'video';
          updateContent(content, 'video', token, { videoType: 'video/3gpp'});
          return;
        }

        if (isYouTube(token)) {
          removeLinebreaks('youtube');
          isAfterEmbed = true;
          lastSignificantContent = 'youtube';
          updateContent(content, 'youtube', token);
          return;
        }

        if (isSpotify(token)) {
          removeLinebreaks('spotify');
          isAfterEmbed = true;
          lastSignificantContent = 'spotify';
          updateContent(content, 'spotify', token);
          return;
        }

        if (isTwitch(token)) {
          removeLinebreaks('twitch');
          isAfterEmbed = true;
          lastSignificantContent = 'twitch';
          updateContent(content, 'twitch', token);
          return;
        }

        if (isMixCloud(token)) {
          removeLinebreaks('mixcloud');
          isAfterEmbed = true;
          lastSignificantContent = 'mixcloud';
          updateContent(content, 'mixcloud', token);
          return;
        }

        if (isSoundCloud(token)) {
          removeLinebreaks('soundcloud');
          isAfterEmbed = true;
          lastSignificantContent = 'soundcloud';
          updateContent(content, 'soundcloud', token);
          return;
        }

        if (isAppleMusic(token)) {
          removeLinebreaks('applemusic');
          isAfterEmbed = true;
          lastSignificantContent = 'applemusic';
          updateContent(content, 'applemusic', token);
          return;
        }

        if (isWavelake(token)) {
          removeLinebreaks('wavelake');
          isAfterEmbed = true;
          lastSignificantContent = 'wavelake';
          updateContent(content, 'wavelake', token);
          return;
        }
      }

      if (props.noLinks === 'text') {
        lastSignificantContent = 'text';
        updateContent(content, 'text', token);
        return;
      }

      const preview = getLinkPreview(token);

      const hasMinimalPreviewData = !props.noPreviews &&
        preview &&
        preview.url &&
        ((!!preview.description && preview.description.length > 0) ||
          !preview.images?.some((x:any) => x === '') ||
          !!preview.title
        );

      if (hasMinimalPreviewData) {
        removeLinebreaks('link');
        updateContent(content, 'link', token, { preview });
      } else {
        updateContent(content, 'link', token);
      }

      lastSignificantContent = 'link';
      isAfterEmbed = false;
      totalLinks++;
      return;
    }

    if (isNoteMention(token)) {
      removeLinebreaks('notemention');
      lastSignificantContent = 'notemention';
      isAfterEmbed = true;
      updateContent(content, 'notemention', token);
      return;
    }

    if (isUserMention(token)) {
      lastSignificantContent = 'usermention';
      updateContent(content, 'usermention', token);
      return;
    }

    if (isAddrMention(token)) {
      lastSignificantContent = 'comunity';
      updateContent(content, 'comunity', token);
      return;
    }

    if (isTagMention(token)) {
      lastSignificantContent = 'tagmention';
      updateContent(content, 'tagmention', token);
      return;
    }

    if (isHashtag(token)) {
      lastSignificantContent = 'hashtag';
      updateContent(content, 'hashtag', token);
      return;
    }

    if (isCustomEmoji(token)) {
      lastSignificantContent = 'emoji';
      updateContent(content, 'emoji', token);
      return;
    }

    if (isUnitifedLnAddress(token)) {
      lastSignificantContent = 'lnbc';

      const match = token.match(lnUnifiedRegex);

      let lnbcToken = match?.find(m => m.startsWith('lnbc'));

      if (lnbcToken) {
        removeLinebreaks('lnbc');
        updateContent(content, 'lnbc', lnbcToken);
      }
      else {
        updateContent(content, 'text', token);
      }

      return;
    }

    if (isLnbc(token)) {
      lastSignificantContent = 'lnbc';

      removeLinebreaks('lnbc');
      updateContent(content, 'lnbc', token);
      return;
    }

    lastSignificantContent = 'text';
    updateContent(content, 'text', token);
    return;
  };


  const removeLinebreaks = (type: string) => {
    if (lastSignificantContent === 'LB') {
      const lastIndex = content.length - 1;
      const lastGroup = content[lastIndex];

      setContent(lastIndex, () => ({
        type: lastGroup.type,
        tokens: [],
        meta: {
          ...lastGroup.meta,
          removedBy: type,
          removedTokens: [...lastGroup.tokens],
        },
      }));
    }
  };

  const renderLinebreak = (item: NoteContent) => {

    let tokens = item.meta?.removedBy === 'link' && totalLinks > 1 ?
      (item.meta?.removedTokens || []) :
      item.tokens;

    // Allow max consecutive linebreak
    const len = Math.min(2, tokens.length);

    const lineBreaks = Array(len).fill(<br/>)

    return <For each={lineBreaks}>{_ => <br/>}</For>
  };

  const renderText = (item: NoteContent) => {
    let tokens = [];

    for (let i=0;i<item.tokens.length;i++) {
      const token = item.tokens[i];
      tokens.push(token)
    }

    const text = tokens.join(' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>');

    return <>{text}</>;
  };

  const renderImage = (item: NoteContent, index?: number) => {

    const groupCount = item.tokens.length;
    const imageGroup = generatePrivateKey();

    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    if (groupCount === 1) {

      const token = item.tokens[0];
      let image = media?.actions.getMedia(token, 'o');
      const url = image?.media_url || getMediaUrlDefault(token) || token;

      let imageThumb =
        media?.actions.getMedia(token, 'm') ||
        media?.actions.getMedia(token, 'o') ||
        token;

      return <NoteImage
        class={`noteimage ${lastClass}`}
        src={url}
        isDev={isDev()}
        media={image}
        mediaThumb={imageThumb}
        width={514}
        imageGroup={`${imageGroup}`}
        authorPk={props.sender}
      />
    }

    const gridClass = groupCount < groupGridLimit ? `grid-${groupCount}` : 'grid-large';

    return <div class={`imageGrid ${gridClass}`}>
      <For each={item.tokens}>
        {(token, index) => {

          let image = media?.actions.getMedia(token, 'o');
          const url = image?.media_url || getMediaUrlDefault(token) || token;

          let imageThumb =
            media?.actions.getMedia(token, 'm') ||
            media?.actions.getMedia(token, 'o') ||
            token;

          return <NoteImage
            class={`noteimage_gallery cell_${index()+1}`}
            src={url}
            isDev={isDev()}
            media={image}
            width={514}
            mediaThumb={imageThumb}
            imageGroup={`${imageGroup}`}
            plainBorder={true}
            forceHeight={500}
            authorPk={props.sender}
          />
        }}
      </For>
    </div>
  }

  const renderVideo = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>{
      (token) => {

        let mVideo = media?.actions.getMedia(token, 'o');

        let h: number | undefined = undefined;
        let w: number | undefined = undefined;

        if (mVideo) {
          const margins = 20;
          const ratio = mVideo.w / mVideo.h;
          h = ((noteWidth() - 2*margins) / ratio);
          w = h > 680 ? 680 * ratio : noteWidth() - 2*margins;
          h = h > 680 ? 680 : h;
        }

        let klass = mVideo ? 'w-cen' : 'w-max';

        if (isDev() && !mVideo) {
          klass += ' redBorder';
        }

        klass += ' embeddedContent';
        klass += ` ${lastClass}`;

        const video = <NoteVideo
          class={klass}
          width={w}
          height={h}
          src={token}
          type={item.meta?.videoType}
        />;

        media?.actions.addVideo(video as HTMLVideoElement);

        return video;
      }
    }</For>;
  }

  const renderYouTube = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {
        const youtubeId = isYouTube(token) && RegExp.$1;

        return <iframe
          class={`w-max embeddedContent ${lastClass}`}
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          // @ts-ignore no property
          key={youtubeId}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>;
      }}
    </For>
  };

  const renderSpotify = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        const convertedUrl = token.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

        return <iframe
          class={`embeddedContent ${lastClass}`}
          style="borderRadius: 12"
          src={convertedUrl}
          width="100%"
          height="352"
          // @ts-ignore no property
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        ></iframe>;
      }}
    </For>
  };

  const renderTwitch = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        const channel = token.split("/").slice(-1);

        const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;

        return <iframe
          class={`embeddedContent ${lastClass}`}
          src={`https://player.twitch.tv/${args}`}
          // @ts-ignore no property
          className="w-max"
          allowFullScreen
        ></iframe>;
      }}
    </For>
  };

  const renderMixCloud = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        const feedPath = (isMixCloud(token) && RegExp.$1) + "%2F" + (isMixCloud(token) && RegExp.$2);

        return <div class={`embeddedContent ${lastClass}`}>
          <iframe
            title="SoundCloud player"
            width="100%"
            height="120"
            // @ts-ignore no property
            frameBorder="0"
            src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${feedPath}%2F`}
          ></iframe>
        </div>;
      }}
    </For>
  };

  const renderSoundCloud = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        return <iframe
          class={`embeddedContent ${lastClass}`}
          width="100%"
          height="166"
          // @ts-ignore no property
          scrolling="no"
          allow="autoplay"
          src={`https://w.soundcloud.com/player/?url=${token}`}
        ></iframe>;
      }}
    </For>
  };

  const renderAppleMusic = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        const convertedUrl = token.replace("music.apple.com", "embed.music.apple.com");
        const isSongLink = /\?i=\d+$/.test(convertedUrl);

        return <iframe
          class={`embeddedContent ${lastClass}`}
          allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
          // @ts-ignore no property
          frameBorder="0"
          height={`${isSongLink ? 175 : 450}`}
          style="width: 100%; maxWidth: 660; overflow: hidden; background: transparent;"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          src={convertedUrl}
        ></iframe>;
      }}
    </For>
  };

  const renderWavelake = (item: NoteContent, index?: number) => {
    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    return <For each={item.tokens}>
      {(token) => {

        const convertedUrl = token.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

        return <iframe
          class={`embeddedContent ${lastClass}`}
          style="borderRadius: 12"
          src={convertedUrl}
          width="100%"
          height="380"
          // @ts-ignore no property
          frameBorder="0"
          loading="lazy"
        ></iframe>;
      }}
    </For>
  };

  const renderLinks = (item: NoteContent, index?: number) => {
    return <For each={item.tokens}>
      {(token) => {
        return (
          <span data-url={token}>
            <a link class={styles.mutedLinks} href={token} target="_blank" >{token}</a>
          </span>
        );
      }}
    </For>
  };

  const vanityName = (pubkey: string) => {
    return app?.verifiedUsers[pubkey];
  }

  const renderComunityMention = (item: NoteContent, index?: number) => {

    return <For each={item.tokens}>
      {(token) => {

        let [_, id] = token.split(':');

        if (!id) {
          return <>{token}</>;
        }

        let end = '';

        let match = specialCharsRegex.exec(id);

        if (match) {
          const i = match.index;
          end = id.slice(i);
          id = id.slice(0, i);
        }

        try {
          const decoded = nip19.decode(id);

          if (decoded.type === 'naddr') {
            const { kind, pubkey, identifier } = decoded.data;
            const author = props.mentionedUsers.find(u => u.pubkey === pubkey);

            let vn = vanityName(pubkey);


            if (kind === Kind.LongForm) {
              return <a
                href={vn ? `/${vn}/${urlEncode(identifier)}` : `/a/${id}`}
                class={styles.eventMention}
                target="_blank"
              >
                Article <Show when={author || vn}><span> by {userName(author) || vn}</span></Show>
              </a>;
            }

            if (kind === Kind.LiveEvent) {

              return <a
                href={`/a/${id}`}
                class={styles.eventMention}
                target="_blank"
              >
                Stream <Show when={author || vn}><span> by {userName(author) || vn}</span></Show>
              </a>;
            }

            return <a
              href={`/a/${id}`}
              class={styles.eventMention}
              target="_blank"
            >
              Article
            </a>;
          }
        } catch (e) {
          return <a
            href={`/a/${id}`}
            class={styles.eventMention}
            target="_blank"
          >
            Event
          </a>;
        }

        const unknownMention = (nid: string) => {
          return <A href={`/a/${nid}`}>{token}</A>
        }

        const decoded = decodeIdentifier(id);
        const reEncoded = nip19.naddrEncode({
          // @ts-ignore
          kind: decoded.data.kind,
          // @ts-ignore
          pubkey: decoded.data.pubkey,
          // @ts-ignore
          identifier: decoded.data.identifier || '',
        });
        const mentionedArticles = dms?.referecedReads;

        if (decoded.type !== 'naddr' || !mentionedArticles) {
          return unknownMention(reEncoded);
        }

        const mention = mentionedArticles[reEncoded];

        if (!mention) {
          return unknownMention(id);
        }

        return renderLongFormMention(mention, index);

      }}
    </For>
  }

  const renderLongFormMention = (mention: PrimalArticle | undefined, index?: number) => {

    if(!mention) return <></>;

    return (
      <div class={styles.articlePreview}>
        Article Mentioned
      </div>);
  };

  const renderNoteMention = (item: NoteContent, index?: number) => {

    return <For each={item.tokens}>
      {(token) => {

        let id = token;

        const idStart = token.search(noteRegex);

        if (idStart > 0) {
          id = token.slice(idStart);
        }

        if (!id || id.length === 0) {
          return <>{token}</>;
        }

        let end = '';

        let match = specialCharsRegex.exec(id);

        if (match) {
          const i = match.index;
          end = id.slice(i);
          id = id.slice(0, i);
        }

        try {
          const decoded = nip19.decode(id);

          if (decoded.type === 'note') {
            return <a
              href={`/e/${id}`}
              class={styles.eventMention}
              target="_blank"
            >
              Note
            </a>;
          }

          if (decoded.type === 'nevent') {
            const pubkey = decoded.data.author;
            const noteAuthor = props.mentionedUsers.find(u => u.pubkey === pubkey);

            const short = nip19.neventEncode({
                id: decoded.data.id,
                author: decoded.data.author,
                kind: decoded.data.kind,
            })

            return <a
              href={`/e/${short}`}
              class={styles.eventMention}
              target="_blank"
            >
              Note  <Show when={noteAuthor}><span> by {userName(noteAuthor)}</span></Show>
            </a>;
          }

          return <>{token}</>;

        } catch (e) {
          return <a
            href={`/e/${id}`}
            class={styles.eventMention}
            target="_blank"
          >
            Note
          </a>;
        }
       }}
    </For>
  };

  const renderUserMention = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        console.log('USER MENTION: ', token);
        let [nostr, id] = token.split(':');

        if (!id) {
          if ((nostr.startsWith('npub1') || nostr.startsWith('nprofile1'))) {
            id = nostr;
            nostr = '';
          } else {
            return <>{token}</>;
          }
        }

        let prefix = '';

        if (nostr !== 'nostr') {
          prefix = nostr.split('nostr')[0] || '';
        }

        let end = '';

        let match = specialCharsRegex.exec(id);

        if (match) {
          const i = match.index;
          end = id.slice(i);
          id = id.slice(0, i);
        }

        try {
          const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

          const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
          const npub = hexToNpub(hex);

          const path = app?.actions.profileLink(npub) || '';

          let user = props.mentionedUsers.find(u => u.pubkey === hex);

          const label = user ? userName(user) : truncateNpub(npub);

          let link = <span>{prefix}@{label}{end}</span>;

          if (props.noLinks === 'links') {
            link = <>{prefix}<span class='linkish'>@{label}</span>{end}</>;
          }

          if (!props.noLinks) {
            link = !user ?
              <>{prefix}<a href={path} target='_blank'>@{label}</a>{end}</> :
              <>{prefix}<a href={path} target='_blank'>@{userName(user)}</a>{end}</>;
          }
          return link;
        } catch (e) {
          return <>{prefix}<span class={styles.error}>{token}</span></>;
        }
      }}
    </For>
  };

  const renderHashtag = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        let [_, term] = token.split('#');
        let end = '';

        let match = hashtagCharsRegex.exec(term);

        if (match) {
          const i = match.index;
          end = term.slice(i);
          term = term.slice(0, i);
        }

        const embeded = props.noLinks === 'text' ?
          <span>#{term}</span> :
          <a href={`/search/%23${term}`}>#{term}</a>;

        return <span class="whole"> {embeded}{end}</span>;
      }}
    </For>
  };

  const renderEmoji = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        return <>{token}</>;
      }}
    </For>
  };
  const renderContent = (item: NoteContent, index: number) => {
    const renderers: Record<string, (item: NoteContent, index?: number) => JSXElement> = {
      linebreak: renderLinebreak,
      text: renderText,
      image: renderLinks,
      video: renderLinks,
      youtube: renderLinks,
      spotify: renderLinks,
      twitch: renderLinks,
      mixcloud: renderLinks,
      soundcloud: renderLinks,
      applemusic: renderLinks,
      wavelake: renderLinks,
      link: renderLinks,
      notemention: renderNoteMention,
      usermention: renderUserMention,
      comunity: renderComunityMention,
      // tagmention: renderTagMention,
      hashtag: renderHashtag,
      emoji: renderEmoji,
      lnbc: renderText,
    }

    return renderers[item.type] ?
      renderers[item.type](item, index) :
      <></>;
  };

  return (
    <span class={styles.parsedMessage}>
      <For each={content}>
        {(item, index) => renderContent(item, index())}
      </For>
    </span>
  )
}

export default hookForDev(ChatMessage);
