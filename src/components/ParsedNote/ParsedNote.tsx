import { A } from '@solidjs/router';
import { decodeIdentifier, hexToNpub } from '../../lib/keys';
import {
  getLinkPreview,
  getParametrizedEvent,
  isAddrMention,
  isAppleMusic,
  isCustomEmoji,
  isHashtag,
  isImage,
  isInterpunction,
  isLnbc,
  isMixCloud,
  isMp4Video,
  isNoteMention,
  isOggVideo,
  isSoundCloud,
  isSpotify,
  isTagMention,
  isTwitch,
  isUnitifedLnAddress,
  isUrl,
  isUserMention,
  isWavelake,
  isWebmVideo,
  isYouTube,
} from '../../lib/notes';
import { truncateNpub, userName } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component, createSignal, For, JSXElement, onMount, Show,
} from 'solid-js';
import {
  NostrEventContent,
  NostrUserZaps,
  PrimalArticle,
  PrimalNote,
  PrimalUser,
  PrimalZap,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
import { nip19, generatePrivateKey } from '../../lib/nTools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteImage from '../NoteImage/NoteImage';
import { createStore } from 'solid-js/store';
import { hashtagCharsRegex, Kind, linebreakRegex, lnUnifiedRegex, shortMentionInWords, shortNoteChars, shortNoteWords, specialCharsRegex, urlExtractRegex } from '../../constants';
import { useIntl } from '@cookbook/solid-intl';
import { actions } from '../../translations';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import Lnbc from '../Lnbc/Lnbc';
import { logError } from '../../lib/logger';
import { useAppContext } from '../../contexts/AppContext';
import ArticleCompactPreview from '../ArticlePreview/ArticleCompactPreview';
import { fetchArticles } from '../../handleNotes';
import { APP_ID } from '../../App';
import { getEvents } from '../../lib/feed';
import { useAccountContext } from '../../contexts/AccountContext';
import { subsTo } from '../../sockets';
import ProfileNoteZap from '../ProfileNoteZap/ProfileNoteZap';
import { parseBolt11 } from '../../utils';

const groupGridLimit = 7;

export type NoteContent = {
  type: string,
  tokens: string[],
  meta?: Record<string, any>,
};

export const groupGalleryImages = (noteHolder: HTMLDivElement | undefined) => {

      // Go through the note and find all images to group them in sections separated by non-image content.
      // Once grouped we will combine them in a grid layout to save screen space.

      if (!noteHolder) return;

      // Get all images
      const allImgs: NodeListOf<HTMLAnchorElement> = noteHolder.querySelectorAll('a.noteimage');

      if (allImgs.length === 0) return;

      // If there is only a single image, just remove thumbnail cropping, nothing more is needed.
      if (allImgs.length === 1) {
        allImgs[0].removeAttribute('data-cropped');
        return;
      }

      let grouped: { group: string, images: HTMLAnchorElement[]}[] = [];

      // Sort images into groups, based on `data-image-group` attribute
      allImgs.forEach((img) => {
        // @ts-ignore
        const group: string = img.attributes['data-image-group'].nodeValue;

        let g = grouped.find((g) => g.group === group);

        if (g) {
          g.images.push(img);
        }
        else {
          grouped.push({ group, images: [img] })
        }
      });

      // Wrap each group into a div with a grid layout,
      grouped.forEach(group => {
        // if there is only one image in this group nothing further is needed
        if (group.images.length < 2) return;

        const groupCount = group.images.length;
        const gridClass = groupCount < groupGridLimit ? `grid-${groupCount}` : 'grid-large';

        const first = group.images[0];
        const parent = first.parentElement;

        // Create the wrapper for this group
        const wrapper = document.createElement('div');

        // Insert the wrapper into the note content, before the first image of the group
        parent?.insertBefore(wrapper, first);

        // Move each image of the group into the wrapper, also setting css classes and atributes for proper display
        group.images.forEach((img, index) => {
          img.classList.add(`cell_${index+1}`);
          img.setAttribute('style', 'width: 100%; height: 100%;');
          img.classList.remove('noteimage');
          img.classList.add('noteimage_gallery');

          img.classList.remove('roundedImage');
          wrapper.appendChild(img as Node)
        });

        // Add classes to the wrapper for layouting
        wrapper.classList.add('imageGrid');
        wrapper.classList.add(gridClass)
      });

      const brs = [].slice.call(noteHolder.querySelectorAll('br + br + br'));

      brs.forEach((br: HTMLBRElement) =>{
        br.parentNode?.removeChild(br);
      });
};

const ParsedNote: Component<{
  note: PrimalNote,
  id?: string,
  ignoreMedia?: boolean,
  ignoreLinebreaks?: boolean,
  noLinks?: 'links' | 'text',
  noPreviews?: boolean,
  shorten?: boolean,
  veryShort?: boolean,
  isEmbeded?: boolean,
  width?: number,
  margins?: number,
  noLightbox?: boolean,
  altEmbeds?: boolean,
  embedLevel?: number,
  rootNote?: PrimalNote,
  footerSize?: 'xwide' | 'wide' | 'normal' | 'compact' | 'short' | 'mini',
}> = (props) => {

  const intl = useIntl();
  const media = useMediaContext();
  const app = useAppContext();
  const account = useAccountContext();

  const dev = localStorage.getItem('devMode') === 'true';

  const id = () => {
    // if (props.id) return props.id;

    return `note_${props.note.noteId}`;
  }

  const noteWidth = () => props.width || 514;

  let thisNote: HTMLDivElement | undefined;

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#${id()}`,
    children: `a.image_${props.note.noteId}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    thumbSelector: `a.image_${props.note.noteId}`,
    pswpModule: () => import('photoswipe')
  });

  onMount(() => {
    if (props.noLightbox) return;

    lightbox.init();
  });

  const [tokens, setTokens] = createStore<string[]>([]);

  const [wordsDisplayed, setWordsDisplayed] = createSignal(0);

  const isNoteTooLong = () => {
    return props.shorten && wordsDisplayed() > shortNoteWords;
  };

  const rootNote = () => props.rootNote || props.note;

  const noteContent = () => {
    const content = props.note.content || '';
    const charLimit = 7 * shortNoteChars;

    if (!props.shorten || content.length < charLimit) return content;

    // Find the first word break after the char limit so we don't do a word cut-off
    const nextWordBreak = content.slice(charLimit).search(/\s|\n|\r/);

    return content.slice(0, charLimit + nextWordBreak);
  };

  const parseContent = () => {
    const content = props.ignoreLinebreaks ?
      noteContent().replace(/\s+/g, ' __SP__ ') :
      noteContent().replace(linebreakRegex, ' __LB__ ').replace(/\s+/g, ' __SP__ ');

    const tokens = content.split(/[\s]+/);

    setTokens(() => [...tokens]);
  }

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

  const [content, setContent] = createStore<NoteContent[]>([]);

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

  let lastSignificantContent = 'text';
  let isAfterEmbed = false;
  let totalLinks = 0;

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

  const generateContent = () => {

    parseContent();

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

  const renderLinebreak = (item: NoteContent) => {
    if (isNoteTooLong()) return;

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

      if (isNoteTooLong()) break;
      if (token.trim().length > 0) {
        setWordsDisplayed(w => w + 1);
      }
      tokens.push(token)
    }

    const text = tokens.join(' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>');

    return <>{text}</>;
  };

  const renderImage = (item: NoteContent, index?: number) => {

    const groupCount = item.tokens.length;
    const imageGroup = generatePrivateKey();

    const imageError = (event: any) => {
      // const image = event.target;

      // image.style = '';
      // image.width = 100;
      // image.height = 100;

      return true;
    }

    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    if (groupCount === 1) {
      if (isNoteTooLong()) return;

      const token = item.tokens[0];
      let image = media?.actions.getMedia(token, 'o');
      const url = image?.media_url || getMediaUrlDefault(token) || token;

      let imageThumb =
        media?.actions.getMedia(token, 'm') ||
        media?.actions.getMedia(token, 'o') ||
        token;

      // Images tell a 100 words :)
      setWordsDisplayed(w => w + 100);

      return <NoteImage
        class={`noteimage image_${props.note.noteId} ${lastClass}`}
        src={url}
        isDev={dev}
        media={image}
        mediaThumb={imageThumb}
        width={noteWidth()}
        imageGroup={`${imageGroup}`}
        shortHeight={props.shorten}
        onError={imageError}
      />
    }

    const gridClass = groupCount < groupGridLimit ? `grid-${groupCount}` : 'grid-large';

    if (isNoteTooLong()) return <></>;

    setWordsDisplayed(w => w + 100);

    return <div
      class={`imageGrid ${gridClass}`}
      style={`max-width: ${noteWidth() - (props.margins || 20)}px`}
    >
      <For each={item.tokens}>
        {(token, index) => {

          let image = media?.actions.getMedia(token, 'o');
          const url = image?.media_url || getMediaUrlDefault(token) || token;

          let imageThumb =
            media?.actions.getMedia(token, 'm') ||
            media?.actions.getMedia(token, 'o') ||
            token;

          if (props.shorten && index() > 11) {
            return <></>;
          }

          return <NoteImage
            class={`noteimage_gallery image_${props.note.noteId} cell_${index()+1}`}
            src={url}
            isDev={dev}
            media={image}
            width={514}
            mediaThumb={imageThumb}
            imageGroup={`${imageGroup}`}
            shortHeight={props.shorten}
            plainBorder={true}
            forceHeight={500}
            onError={imageError}
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
        if (isNoteTooLong()) return;

        let mVideo = media?.actions.getMedia(token, 'o');

        let h: number | undefined = undefined;
        let w: number | undefined = undefined;

        let ratio = 1;
        const margins = props.margins || 20;

        if (mVideo) {
          ratio = mVideo.w / mVideo.h;

          if (ratio < 1) {
            h = 680;
            w = Math.min((noteWidth() - margins), h * ratio);
            h = w / ratio;
          } else {
            w = (noteWidth() - margins);
            h = w / ratio;
          }
        }

        let klass = mVideo ? 'w-cen' : 'w-max';

        if (dev && !mVideo) {
          klass += ' redBorder';
        }

        klass += ' embeddedContent';
        klass += ` ${lastClass}`;

        setWordsDisplayed(w => w + shortMentionInWords);

        const video = <video
          class={klass}
          width={w}
          height={h}
          controls
          muted={true}
          loop={true}
          playsinline={true}
          data-ratio={`${ratio}`}
        >
          <source src={token} type={item.meta?.videoType} />
        </video>;

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + shortMentionInWords);

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
        if (isNoteTooLong()) return;

        if (item.meta && item.meta.preview && totalLinks < 2) {
          setWordsDisplayed(w => w + shortMentionInWords);
          return (
            <LinkPreview
              preview={item.meta.preview}
              bordered={props.isEmbeded}
              isLast={index === content.length-1}
            />
          );
        }

        setWordsDisplayed(w => w + 1);
        return (
          <span data-url={token}>
            <a link href={token} target="_blank" >{token}</a>
          </span>
        );
      }}
    </For>
  };

  const [unknownEvents, setUnknownEvents] = createStore<Record<string, NostrEventContent>>({});

  const unknownMention = (nid: string) => {
    setWordsDisplayed(w => w + 1);

    const decoded = decodeIdentifier(nid);

    const alt = () => {
      // @ts-ignore
      const a = ((unknownEvents[nid]?.tags || []).find(t => t[0] === 'alt') || [])[1];

      return a;
    }

    if (decoded.type === 'nevent') {
      const subId = `events_${APP_ID}`;
      const data = decoded.data as nip19.EventPointer;

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (content.id === data.id) {
            setUnknownEvents((evs) => ({ ...evs, [nid]: { ...content } }))
          }
        },
        onEose: () => {
          unsub();
        }
      })

      getEvents(account?.publicKey, [nid], subId);


      return (
        <Show
          when={alt()}
          fallback={
            <div class={styles.unknownEvent}>
              <div class={`${styles.icon} ${styles.bang}`}></div>
              <div class={styles.label}>Esemény nem található</div>
            </div>
          }
        >
          <div class={styles.unknownEvent}>
            <div class={`${styles.icon} ${styles.file}`}></div>
            <div class={styles.label}>{alt()}</div>
          </div>
        </Show>
      );
    }

    if (decoded.type === 'naddr') {
      const subId = `p_events_${APP_ID}`;
      const data = decoded.data as nip19.AddressPointer;

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (content.kind === data.kind) {
            setUnknownEvents((evs) => ({ ...evs, [nid]: { ...content } }))
          }
        },
        onEose: () => {
          unsub();
        }
      })

      getParametrizedEvent(data.pubkey, data.identifier, data.kind, subId);

      return (
        <Show
          when={alt()}
          fallback={
            <div class={styles.unknownEvent}>
              <div class={`${styles.icon} ${styles.bang}`}></div>
              <div class={styles.label}>Esemény nem található</div>
            </div>
          }
        >
          <div class={styles.unknownEvent}>
            <div class={`${styles.icon} ${styles.file}`}></div>
            <div class={styles.label}>{alt()}</div>
          </div>
        </Show>
      )
    }

    return (
      <div class={styles.unknownEvent}>
        <div class={`${styles.icon} ${styles.bang}`}></div>
        <div class={styles.label}>Esemény nem található</div>
      </div>
    );
  }

  const renderComunityMention = (item: NoteContent, index?: number) => {

    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

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

        const rn = rootNote();
        const decoded = decodeIdentifier(id);

        if (decoded.type !== 'naddr') {
          return unknownMention(id);
        }

        const data = decoded.data as nip19.AddressPointer;

        const reEncoded = nip19.naddrEncode({
          kind: data.kind,
          pubkey: data.pubkey,
          identifier: data.identifier || '',
        });

        if (data.kind === Kind.LongForm) {
          const mentionedArticles = rn.mentionedArticles;

          if (!mentionedArticles || (props.embedLevel || 0) > 1) {
            return unknownMention(reEncoded);
          }

          const mention = mentionedArticles[reEncoded];

          if (!mention) {
            return unknownMention(id);
          }

          return renderLongFormMention(mention, index);
        }

        return unknownMention(id);
      }}
    </For>
  }

  const renderLongFormMention = (mention: PrimalArticle | undefined, index?: number) => {

    if(!mention) return <></>;

    return (
      <div class={styles.articlePreview}>
        <ArticleCompactPreview
          article={mention}
          hideFooter={true}
          hideContext={true}
          boredered={(props.embedLevel || 0) > 0}
        />
      </div>);
  };

  const renderNoteMention = (item: NoteContent, index?: number) => {

    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        let [_, id] = token.split(':');

        if (!id) {
          return unknownMention(id);
        }

        let end = '';

        let match = specialCharsRegex.exec(id);

        if (match) {
          const i = match.index;
          end = id.slice(i);
          id = id.slice(0, i);
        }

        let link = unknownMention(id);

        try {
          const eventId = nip19.decode(id).data as string | nip19.EventPointer;

          let kind = typeof eventId === 'string' ? Kind.Text : eventId.kind;
          const hex = typeof eventId === 'string' ? eventId : eventId.id;

          if (props.noLinks === 'links' || (props.embedLevel || 0) > 1) {
            return <span class='linkish'>{token}</span>;
          }

          const rn = rootNote();

          const mentionedNotes = {
            ...(rn.mentionedNotes || {}),
            ...(props.note.mentionedNotes || {}),
          }

          const mentionedArticles = {
            ...(rn.mentionedArticles || {}),
            ...(props.note.mentionedArticles || {}),
          }

          const mentionedHighlights = {
            ...(rn.mentionedHighlights || {}),
            ...(props.note.mentionedHighlights || {}),
          }

          const mentionedUsers = {
            ...(rn.mentionedUsers || {}),
            ...(props.note.mentionedUsers || {}),
          }

          if (kind === undefined) {
            let f: any = mentionedNotes && mentionedNotes[hex];
            if (!f) {
              const reEncoded = nip19.naddrEncode({
                // @ts-ignore
                kind: eventId.kind,
                // @ts-ignore
                pubkey: eventId.pubkey,
                // @ts-ignore
                identifier: eventId.identifier || '',
              });
              f = mentionedArticles && mentionedArticles[reEncoded];
            }
            if (!f) {
              f = mentionedHighlights && mentionedHighlights[hex];
            }
            kind = f?.post.kind || f?.msg?.kind || f.event.kind; // || Kind.Text;
          }

          if ([Kind.Text].includes(kind || -1)) {
            if (!props.noLinks) {
              const ment = mentionedNotes && mentionedNotes[hex];

              link = unknownMention(id);

              if (ment) {
                setWordsDisplayed(w => w + shortMentionInWords);

                if ([Kind.LongForm, Kind.LongFormShell].includes(ment.post.kind)) {
                  // @ts-ignore
                  link = renderLongFormMention(ment, index)
                }
                else {
                  link = <div>
                    <EmbeddedNote
                      note={ment}
                      mentionedUsers={mentionedUsers || {}}
                      isLast={index === content.length-1}
                      alternativeBackground={props.altEmbeds}
                      footerSize={props.footerSize}
                      hideFooter={true}
                      embedLevel={props.embedLevel}
                      rootNote={rn}
                    />
                  </div>;
                }
              }
            }
          }

          if ([Kind.LongForm, Kind.LongFormShell].includes(kind || -1)) {

            if (!props.noLinks) {
              const reEncoded = nip19.naddrEncode({
                // @ts-ignore
                kind: eventId.kind,
                // @ts-ignore
                pubkey: eventId.pubkey,
                // @ts-ignore
                identifier: eventId.identifier || '',
              });
              const ment = mentionedArticles && mentionedArticles[reEncoded];

              link = unknownMention(id);

              if (ment) {
                setWordsDisplayed(w => w + shortMentionInWords);

                // @ts-ignore
                link = renderLongFormMention(ment, index);
              }
            }
          }

          if (kind === Kind.Highlight) {
            const ment = mentionedHighlights && mentionedHighlights[hex];

            link = <div class={styles.mentionedHighlight}>
              {ment?.event?.content}
            </div>;
          }

          if (kind === Kind.Zap) {
            const zapContent = app?.events[Kind.Zap].find(e => e.id === hex) as NostrUserZaps | undefined;

            if (zapContent) {
              const zapEvent = JSON.parse((zapContent.tags.find(t => t[0] === 'description') || [])[1] || '{}');
              const bolt11 = (zapContent.tags.find(t => t[0] === 'bolt11') || [])[1];

              let zappedId = '';
              let zappedKind: number = 0;

              const zapTagA = zapEvent.tags.find((t: string[]) => t[0] === 'a');
              const zapTagE = zapEvent.tags.find((t: string[]) => t[0] === 'e');

              let zapSubject: PrimalArticle | PrimalUser | PrimalNote = mentionedUsers[zapEvent.tags.find((t: string[]) => t[0] === 'p')[1]];

              if (zapTagA) {
                const [kind, pubkey, identifier] = zapTagA[1].split(':');

                zappedId = nip19.naddrEncode({ kind, pubkey, identifier });

                const article = mentionedArticles[zappedId];

                if (article) {
                  zappedKind = Kind.LongForm;
                  zapSubject = article;
                } else {
                  zappedKind = Kind.Metadata;
                }
              }
              else if (zapTagE) {
                zappedId = zapTagE[1];

                const article = mentionedArticles[zappedId];
                const note = mentionedNotes[zappedId];

                if (article) {
                  zappedKind = Kind.LongForm;
                  zapSubject = article;
                } else if (note) {
                  zappedKind = Kind.Text;
                  zapSubject = note;
                } else {
                  zappedKind = Kind.Metadata;
                }
              }

              const zap: PrimalZap = {
                id: zapContent.id || '',
                message: zapEvent.content || '',
                amount: parseBolt11(bolt11) || 0,
                sender: mentionedUsers[zapEvent.pubkey],
                reciver: mentionedUsers[zapEvent.tags.find((t: string[]) => t[0] === 'p')[1]],
                created_at: zapContent.created_at,
                zappedId,
                zappedKind,
              };

              link = <ProfileNoteZap zap={zap} subject={zapSubject} />
            }

          }

        } catch (e) {
          logError('ERROR rendering note mention', e);
          setWordsDisplayed(w => w + 1);
          link = unknownMention(id);
        }

        return link;
      }}
    </For>
  };

  const renderUserMention = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 1);

        let [nostr, id] = token.split(':');

        if (!id) {
          return <>{token}</>;
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

        const rn = rootNote();

        const mentionedUsers = {
          ...(rn.mentionedUsers || {}),
          ...(props.note.mentionedUsers || {}),
        }

        try {
          const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

          const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
          const npub = hexToNpub(hex);

          const path = app?.actions.profileLink(npub) || '';

          let user = mentionedUsers && mentionedUsers[hex];

          const label = user ? userName(user) : truncateNpub(npub);

          let link = <span>{prefix}@{label}{end}</span>;

          if (props.noLinks === 'links') {
            link = <>{prefix}<span class='linkish'>@{label}</span>{end}</>;
          }

          if (!props.noLinks) {
            link = !user ?
              <>{prefix}<A href={path}>@{label}</A>{end}</> :
              <>{prefix}{MentionedUserLink({ user })}{end}</>;
          }
          return link;
        } catch (e) {
          return <>{prefix}<span class={styles.error}>{token}</span></>;
        }
      }}
    </For>
  };

  const renderTagMention = (item: NoteContent, index?: number) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 1);

        let t = `${token}`;

        let end = t[t.length - 1];

        if ([',', '?', ';', '!'].some(x => end === x)) {
          t = t.slice(0, -1);
        } else {
          end = '';
        }

        let r = parseInt(t.slice(2, t.length - 1));

        const tag = props.note.msg.tags[r];

        if (tag === undefined || tag.length === 0) return;


        const rn = rootNote();

        const mentionedNotes = {
          ...(rn.mentionedNotes || {}),
          ...(props.note.mentionedNotes || {}),
        }

        const mentionedArticles = {
          ...(rn.mentionedArticles || {}),
          ...(props.note.mentionedArticles || {}),
        }

        const mentionedHighlights = {
          ...(rn.mentionedHighlights || {}),
          ...(props.note.mentionedHighlights || {}),
        }

        const mentionedUsers = {
          ...(rn.mentionedUsers || {}),
          ...(props.note.mentionedUsers || {}),
        }

        if (
          tag[0] === 'e' &&
          mentionedNotes &&
          mentionedNotes[tag[1]]
        ) {
          const hex = tag[1];
          const noteId = `nostr:${nip19.noteEncode(hex)}`;
          const path = `/e/${nip19.noteEncode(hex)}`;

          let embeded = <span>{noteId}{end}</span>;

          if (props.noLinks === 'links') {
            embeded = <><span class='linkish'>@{noteId}</span>{end}</>;
          }

          if (!props.noLinks) {
            const ment = mentionedNotes[hex];

            embeded = <><A href={path}>{noteId}</A>{end}</>;

            if (ment) {
              setWordsDisplayed(w => w + shortMentionInWords - 1);

              embeded = <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={mentionedUsers}
                  hideFooter={true}
                  embedLevel={props.embedLevel}
                />
                {end}
              </div>;
            }
          }

          return <span class="whole"> {embeded}</span>;
        }

        if (
          tag[0] === 'a' &&
          mentionedArticles &&
          mentionedArticles[tag[1]]
        ) {

          const [kind, pubkey, identifier] = tag[1].split(':');
          const naddr = nip19.naddrEncode({ kind: parseInt(kind), pubkey, identifier });
          const noteId = `nostr:${naddr}`;
          let path = `/e/${naddr}`;

          const vanityName = app?.verifiedUsers[pubkey];

          if (vanityName) {
            path = `/${vanityName}/${identifier}`;
          }

          let embeded = <span>{noteId}{end}</span>;

          if (props.noLinks === 'links') {
            embeded = <><span class='linkish'>{noteId}</span>{end}</>;
          }

          if (!props.noLinks) {
            const ment = mentionedArticles[naddr];

            embeded = <><A href={path}>{noteId}</A>{end}</>;

            if (ment) {
              setWordsDisplayed(w => w + shortMentionInWords - 1);

              embeded = <div>
                {renderLongFormMention(ment, index)}
                {end}
              </div>;
            }
          }

          return <span class="whole"> {embeded}</span>;
        }

        if (tag[0] === 'p' && mentionedUsers && mentionedUsers[tag[1]]) {
          const user = mentionedUsers[tag[1]];

          const path = app?.actions.profileLink(user.npub) || '';

          const label = userName(user);

          let link = <span>@{label}{end}</span>;

          if (props.noLinks === 'links') {
            link = <><span class='linkish'>@{label}</span>{end}</>;
          }

          if (!props.noLinks) {
            link = user ?
              <><A href={path}>@{label}</A>{end}</> :
              <>{MentionedUserLink({ user })}{end}</>;
          }
          return <span> {link}</span>;
        }
      }}
    </For>
  };

  const renderHashtag = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 1);

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
          <A href={`/search/%23${term}`}>#{term}</A>;

        return <span class="whole"> {embeded}{end}</span>;
      }}
    </For>
  };

  const renderEmoji = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 1);

        const emoji = token.split(':')[1];

        const tag = props.note.msg.tags.find(t => t[0] === 'emoji' && t[1] === emoji);

        if (tag === undefined || tag.length === 0) return <>{token}</>;

        const image = tag[2];

        return image ?
          <span><img height={15} width={15} src={image} alt={`emoji: ${emoji}`} /></span> :
          <>{token}</>;
      }}
    </For>
  };

  const renderLnbc = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 100);

        return <Lnbc lnbc={token} />
      }}
    </For>
  }

  const renderContent = (item: NoteContent, index: number) => {


    const renderers: Record<string, (item: NoteContent, index?: number) => JSXElement> = {
      linebreak: renderLinebreak,
      text: renderText,
      image: renderImage,
      video: renderVideo,
      youtube: renderYouTube,
      spotify: renderSpotify,
      twitch: renderTwitch,
      mixcloud: renderMixCloud,
      soundcloud: renderSoundCloud,
      applemusic: renderAppleMusic,
      wavelake: renderWavelake,
      link: renderLinks,
      notemention: renderNoteMention,
      usermention: renderUserMention,
      comunity: renderComunityMention,
      tagmention: renderTagMention,
      hashtag: renderHashtag,
      emoji: renderEmoji,
      lnbc: renderLnbc,
    }

    return renderers[item.type] ?
      renderers[item.type](item, index) :
      <></>;
  };

  onMount(() => {
    generateContent();
  });

  return (
    <div ref={thisNote} id={id()} class={`${styles.parsedNote} ${props.veryShort ? styles.shortNote : ''}`} >
      <For each={content}>
        {(item, index) => renderContent(item, index())}
      </For>
      <Show when={isNoteTooLong() || noteContent().length < (props.note.content?.length || 0)}>
        <span class={styles.more}>
          ... <span class="linkish">{intl.formatMessage(actions.seeMore)}</span>
        </span>
      </Show>
    </div>
  );
};

export default hookForDev(ParsedNote);
