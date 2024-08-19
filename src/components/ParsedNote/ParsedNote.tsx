import { A } from '@solidjs/router';
import { decodeIdentifier, hexToNpub } from '../../lib/keys';
import {
  addLinkPreviews,
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
import { authorName, truncateNpub, userName } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component, createResource, createSignal, For, JSXElement, onMount, Show, Suspense,
} from 'solid-js';
import {
  PrimalArticle,
  PrimalNote,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
import { nip19, generatePrivateKey } from '../../lib/nTools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteImage from '../NoteImage/NoteImage';
import { createStore, unwrap } from 'solid-js/store';
import { hashtagCharsRegex, Kind, linebreakRegex, lnUnifiedRegex, shortMentionInWords, shortNoteWords, specialCharsRegex, urlExtractRegex } from '../../constants';
import { useIntl } from '@cookbook/solid-intl';
import { actions } from '../../translations';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import Lnbc from '../Lnbc/Lnbc';
import { subscribeTo } from '../../sockets';
import { APP_ID } from '../../App';
import { logError } from '../../lib/logger';
import ArticlePreview from '../ArticlePreview/ArticlePreview';

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
  isEmbeded?: boolean,
  width?: number,
  margins?: number,
  noLightbox?: boolean,
  altEmbeds?: boolean,
}> = (props) => {

  const intl = useIntl();
  const media = useMediaContext();

  const dev = localStorage.getItem('devMode') === 'true';

  const id = () => {
    // if (props.id) return props.id;

    return `note_${props.note.post.noteId}`;
  }

  const noteWidth = () => props.width || 514;

  let thisNote: HTMLDivElement | undefined;

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#${id()}`,
    children: `a.image_${props.note.post.noteId}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
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

  const noteContent = () => {
    const content = props.note.post.content;
    const charLimit = 7 * shortNoteWords;

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

    // Remove bottom margin if media is the last thing in the note
    const lastClass = index === content.length-1 ?
      'noBottomMargin' : '';

    if (groupCount === 1) {
      if (isNoteTooLong()) return;

      const token = item.tokens[0];
      let image = media?.actions.getMedia(token, 'o');
      const url = image?.media_url || getMediaUrlDefault(token);

      // Images tell a 100 words :)
      setWordsDisplayed(w => w + 100);

      return <NoteImage
        class={`noteimage image_${props.note.post.noteId} ${lastClass}`}
        src={url}
        isDev={dev}
        media={image}
        width={noteWidth()}
        imageGroup={imageGroup}
        shortHeight={props.shorten}
      />
    }

    const gridClass = groupCount < groupGridLimit ? `grid-${groupCount}` : 'grid-large';

    if (isNoteTooLong()) return <></>;

    setWordsDisplayed(w => w + 100);

    return <div class={`imageGrid ${gridClass}`}>
      <For each={item.tokens}>
        {(token, index) => {

          let image = media?.actions.getMedia(token, 'o');
          const url = image?.media_url || getMediaUrlDefault(token);

          if (props.shorten && index() > 11) {
            return <></>;
          }

          return <NoteImage
            class={`noteimage_gallery image_${props.note.post.noteId} cell_${index()+1}`}
            src={url}
            isDev={dev}
            media={image}
            width={514}
            imageGroup={imageGroup}
            shortHeight={props.shorten}
            plainBorder={true}
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

        if (mVideo) {
          const margins = props.margins || 20
          const ratio = mVideo.w / mVideo.h;
          h = ((noteWidth() - 2*margins) / ratio);
          w = h > 680 ? 680 * ratio : noteWidth() - 2*margins;
          h = h > 680 ? 680 : h;
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

        const unknownMention = (nid: string) => {
          setWordsDisplayed(w => w + 1);

          const url = `https://highlighter.com/a/${nid}`;

          return <a href={url} target="_blank" >{token}</a>;
        }

        const decoded = decodeIdentifier(id);
        const mentionedArticles = props.note.mentionedArticles;

        if (decoded.type !== 'naddr' || !mentionedArticles) {
          return unknownMention(id);
        }


        const mention = mentionedArticles[id];

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
        <ArticlePreview article={mention} hideFooter={true} />
      </div>);
  };

  const renderNoteMention = (item: NoteContent, index?: number) => {
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

        let link = <span>{token}</span>;

        try {
          const eventId = nip19.decode(id).data as string | nip19.EventPointer;
          const kind = typeof eventId === 'string' ? Kind.Text : eventId.kind;
          const hex = typeof eventId === 'string' ? eventId : eventId.id;
          const noteId = nip19.noteEncode(hex);

          const path = `/e/${noteId}`;

          if (props.noLinks === 'links') {
            link = <span class='linkish'>@{token}</span>;
          }

          if (kind === Kind.Text) {
            if (!props.noLinks) {
              const ment = props.note.mentionedNotes && props.note.mentionedNotes[hex];

              link = <A href={path}>{token}</A>;

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
                      mentionedUsers={props.note.mentionedUsers || {}}
                      isLast={index === content.length-1}
                      alternativeBackground={props.altEmbeds}
                    />
                  </div>;
                }

              }
            }
          }

          if ([Kind.LongForm, Kind.LongFormShell].includes(kind)) {
            console.log('MENTION LONGFORM')
            link = '__MENTION__'
          }

          if (kind === Kind.Highlight) {
            const ment = props.note.mentionedHighlights && props.note.mentionedHighlights[hex];
            link = <div class={styles.mentionedHighlight}>
              {ment.event.content}
            </div>;
          }

        } catch (e) {
          logError('ERROR rendering note mention', e);
          setWordsDisplayed(w => w + 1);
          link = <span class={styles.error}>{token}</span>;
        }

        return link;}}
    </For>
  };

  const renderUserMention = (item: NoteContent) => {
    return <For each={item.tokens}>
      {(token) => {
        if (isNoteTooLong()) return;

        setWordsDisplayed(w => w + 1);

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
          const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

          const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
          const npub = hexToNpub(hex);

          const path = `/p/${npub}`;

          let user = props.note.mentionedUsers && props.note.mentionedUsers[hex];

          const label = user ? userName(user) : truncateNpub(npub);

          let link = <span>@{label}{end}</span>;

          if (props.noLinks === 'links') {
            link = <><span class='linkish'>@{label}</span>{end}</>;
          }

          if (!props.noLinks) {
            link = !user ?
              <><A href={path}>@{label}</A>{end}</> :
              <>{MentionedUserLink({ user })}{end}</>;
          }
          return link;
        } catch (e) {
          return <span class={styles.error}> {token}</span>;
        }
      }}
    </For>
  };

  const renderTagMention = (item: NoteContent) => {
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

        const tag = props.note.post.tags[r];

        if (tag === undefined || tag.length === 0) return;

        if (
          tag[0] === 'e' &&
          props.note.mentionedNotes &&
          props.note.mentionedNotes[tag[1]]
        ) {
          const hex = tag[1];
          const noteId = `nostr:${nip19.noteEncode(hex)}`;
          const path = `/e/${nip19.noteEncode(hex)}`;

          let embeded = <span>{noteId}{end}</span>;

          if (props.noLinks === 'links') {
            embeded = <><span class='linkish'>@{noteId}</span>{end}</>;
          }

          if (!props.noLinks) {
            const ment = props.note.mentionedNotes[hex];

            embeded = <><A href={path}>{noteId}</A>{end}</>;

            if (ment) {
              setWordsDisplayed(w => w + shortMentionInWords - 1);

              embeded = <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={props.note.mentionedUsers}
                />
                {end}
              </div>;
            }
          }

          return <span class="whole"> {embeded}</span>;
        }

        if (tag[0] === 'p' && props.note.mentionedUsers && props.note.mentionedUsers[tag[1]]) {
          const user = props.note.mentionedUsers[tag[1]];

          const path = `/p/${user.npub}`;

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

        const tag = props.note.post.tags.find(t => t[0] === 'emoji' && t[1] === emoji);

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
    <div ref={thisNote} id={id()} class={`${styles.parsedNote} ${props.shorten ? styles.shortNote : ''}`} >
      <For each={content}>
        {(item, index) => renderContent(item, index())}
      </For>
      <Show when={isNoteTooLong() || noteContent().length < props.note.post.content.length}>
        <span class={styles.more}>
          ... <span class="linkish">{intl.formatMessage(actions.seeMore)}</span>
        </span>
      </Show>
    </div>
  );
};

export default hookForDev(ParsedNote);
