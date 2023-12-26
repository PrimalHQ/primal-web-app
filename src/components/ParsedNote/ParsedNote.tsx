import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import {
  getLinkPreview,
  isAppleMusic,
  isHashtag,
  isImage,
  isInterpunction,
  isMixCloud,
  isMp4Video,
  isNoteMention,
  isOggVideo,
  isSoundCloud,
  isSpotify,
  isTagMention,
  isTwitch,
  isUrl,
  isUserMention,
  isWavelake,
  isWebmVideo,
  isYouTube,
} from '../../lib/notes';
import { truncateNpub, userName } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component, createEffect, createSignal, For, JSXElement, onMount, Show,
} from 'solid-js';
import {
  PrimalNote,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
// @ts-ignore Bad types in nostr-tools
import { nip19, generatePrivateKey } from 'nostr-tools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteImage from '../NoteImage/NoteImage';
import { createStore } from 'solid-js/store';
import { linebreakRegex, shortMentionInWords, shortNoteWords, specialCharsRegex, urlExtractRegex } from '../../constants';
import { useIntl } from '@cookbook/solid-intl';
import { actions } from '../../translations';

import PhotoSwipeLightbox from 'photoswipe/lightbox';

const groupGridLimit = 7;

const convertHTMLEntity = (text: string) => {
  const span = document.createElement('span');

  return text
  .replace(/&[#A-Za-z0-9]+;/gi, (entity)=> {
      span.innerHTML = entity;
      return span.innerText;
  });
}


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
}> = (props) => {

  const intl = useIntl();
  const media = useMediaContext();

  const id = () => {
    // if (props.id) return props.id;

    return `note_${props.note.post.noteId}`;
  }

  let thisNote: HTMLDivElement | undefined;

  let imageGroup: string = generatePrivateKey()
  let consecutiveImages: number = 0;
  let imgCount = 0;

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
    lightbox.init();

  });

  let allImagesLoaded = false;

  createEffect(() => {
    if (imagesLoaded() > 0 && imagesLoaded() === imgCount && !allImagesLoaded) {
      allImagesLoaded = true;
      groupGalleryImages(thisNote);
    }
  });

  const [tokens, setTokens] = createStore<string[]>([]);
  const [imagesLoaded, setImagesLoaded] = createSignal(0);

  let wordsDisplayed = 0;

  const shouldShowToken = () => {
    if (!props.shorten) return true;


    if (wordsDisplayed < shortNoteWords) {
      return true;
    }

    return false;
  };

  const parseContent = () => {
    const content = props.ignoreLinebreaks ?
      props.note.post.content.replace(/\s+/g, ' __SP__ ') :
      props.note.post.content.replace(linebreakRegex, ' __LB__ ').replace(/\s+/g, ' __SP__ ');

    const tokens = content.split(/[\s]+/);

    setTokens(() => [...tokens]);
  }

  const parseToken: (token: string) => JSXElement  = (token: string) => {

      if (token === '__LB__') {
        return <br />;
      }

      if (token === '__SP__') {
        return <> </>;
      }

      wordsDisplayed++;

      if (isInterpunction(token)) {
        return <span>{token}</span>;
      }

      if (isUrl(token)) {
        const index = token.indexOf('http');

        if (index > 0) {
          const prefix = token.slice(0, index);

          const matched = (token.match(urlExtractRegex) || [])[0];

          if (matched) {
            const suffix = token.substring(matched.length + index, token.length);
            return <>{parseToken(prefix)}{parseToken(matched)}{parseToken(suffix)}</>;
          } else {
            return <>{parseToken(prefix)}{parseToken(token.slice(index))}</>;
          }
        }

        if (!props.ignoreMedia) {
          if (isImage(token)) {
            imgCount++;
            consecutiveImages++;
            const dev = localStorage.getItem('devMode') === 'true';
            let image = media?.actions.getMedia(token, 'o');
            const url = image?.media_url || getMediaUrlDefault(token);

            if (consecutiveImages > 1) {
              // There are consecutive images, so reduce the impact of each image in order to show them grouped
              wordsDisplayed += 10;
            } else {
              wordsDisplayed += shortMentionInWords
            }

            return <NoteImage
              class={`noteimage image_${props.note.post.noteId}`}
              src={url}
              isDev={dev}
              media={image}
              width={514}
              imageGroup={imageGroup}
              onImageLoaded={() => setImagesLoaded(i => i+1)}
              shortHeight={props.shorten}
            />;
          }

          consecutiveImages = 0;
          imageGroup = generatePrivateKey();

          if (isMp4Video(token)) {
            wordsDisplayed += shortMentionInWords;
            let mVideo = media?.actions.getMedia(token, 'o');

            const w = mVideo ? mVideo?.w > 524 ? 524 : mVideo?.w : undefined;
            const h = mVideo ? mVideo?.w > 524 ? 524 * mVideo?.h / mVideo?.w : mVideo?.h : undefined;
            const klass = mVideo ? 'w-cen' : 'w-max';

            const video = <video class={klass} width={w} height={h} controls muted={true} ><source src={token} type="video/mp4" /></video>;
            media?.actions.addVideo(video as HTMLVideoElement);


            return video;
          }

          if (isOggVideo(token)) {
            wordsDisplayed += shortMentionInWords;
            let mVideo = media?.actions.getMedia(token, 'o');

            const w = mVideo ? mVideo?.w > 524 ? 524 : mVideo?.w : undefined;
            const h = mVideo ? mVideo?.w > 524 ? 524 * mVideo?.h / mVideo?.w : mVideo?.h : undefined;
            const klass = mVideo ? 'w-cen' : 'w-max';

            const video = <video class={klass} width={w} height={h} controls muted={true} ><source src={token} type="video/ogg" /></video>;
            media?.actions.addVideo(video as HTMLVideoElement);
            return video;
          }

          if (isWebmVideo(token)) {
            wordsDisplayed += shortMentionInWords;
            let mVideo = media?.actions.getMedia(token, 'o');

            const w = mVideo ? mVideo?.w > 524 ? 524 : mVideo?.w : undefined;
            const h = mVideo ? mVideo?.w > 524 ? 524 * mVideo?.h / mVideo?.w : mVideo?.h : undefined;
            const klass = mVideo ? 'w-cen' : 'w-max';

            const video = <video class={klass} width={w} height={h} controls muted={true} ><source src={token} type="video/webm" /></video>;
            media?.actions.addVideo(video as HTMLVideoElement);
            return video;
          }

          if (isYouTube(token)) {
            wordsDisplayed += shortMentionInWords;

            const youtubeId = isYouTube(token) && RegExp.$1;

            return <iframe
              class="w-max"
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="YouTube video player"
              // @ts-ignore no property
              key={youtubeId}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>;
          }

          if (isSpotify(token)) {
            wordsDisplayed += shortMentionInWords;

            const convertedUrl = token.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

            return <iframe
              style="borderRadius: 12"
              src={convertedUrl}
              width="100%"
              height="352"
              // @ts-ignore no property
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            ></iframe>;
          }

          if (isTwitch(token)) {
            wordsDisplayed += shortMentionInWords;

            const channel = token.split("/").slice(-1);

            const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;

            return <iframe
              src={`https://player.twitch.tv/${args}`}
              // @ts-ignore no property
              className="w-max"
              allowFullScreen
            ></iframe>;
          }

          if (isMixCloud(token)) {
            wordsDisplayed += shortMentionInWords;

            const feedPath = (isMixCloud(token) && RegExp.$1) + "%2F" + (isMixCloud(token) && RegExp.$2);

            return <div>
              <iframe
                title="SoundCloud player"
                width="100%"
                height="120"
                // @ts-ignore no property
                frameBorder="0"
                src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${feedPath}%2F`}
              ></iframe>
            </div>;
          }

          if (isSoundCloud(token)) {
            wordsDisplayed += shortMentionInWords;

            return <iframe
              width="100%"
              height="166"
              // @ts-ignore no property
              scrolling="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=${token}`}
            ></iframe>;
          }

          if (isAppleMusic(token)) {
            wordsDisplayed += shortMentionInWords;

            const convertedUrl = token.replace("music.apple.com", "embed.music.apple.com");
            const isSongLink = /\?i=\d+$/.test(convertedUrl);

            return <iframe
              allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
              // @ts-ignore no property
              frameBorder="0"
              height={`${isSongLink ? 175 : 450}`}
              style="width: 100%; maxWidth: 660; overflow: hidden; background: transparent;"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              src={convertedUrl}
            ></iframe>;
          }

          if (isWavelake(token)) {
            wordsDisplayed += shortMentionInWords;

            const convertedUrl = token.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

            return <iframe
              style="borderRadius: 12"
              src={convertedUrl}
              width="100%"
              height="380"
              // @ts-ignore no property
              frameBorder="0"
              loading="lazy"
            ></iframe>;
          }
        }

        if (props.noLinks === 'text') {
          return <span class="whole">{token}</span>;
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
          wordsDisplayed += shortMentionInWords;
          return <LinkPreview preview={preview} bordered={props.isEmbeded} />;
        }

        return <span data-url={token}><a link href={token.toLowerCase()} target="_blank" >{token}</a></span>;
      }

      consecutiveImages = 0;
      imageGroup = generatePrivateKey();

      if (isNoteMention(token)) {
        let [_, id] = token.split(':');

        if (!id) {
          return token;
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
          const hex = typeof eventId === 'string' ? eventId : eventId.id;
          const noteId = nip19.noteEncode(hex);

          const path = `/e/${noteId}`;

          if (props.noLinks === 'links') {
            link = <span class='linkish'>@{token}</span>;
          }

          if (!props.noLinks) {
            const ment = props.note.mentionedNotes && props.note.mentionedNotes[hex];

            link = <A href={path}>{token}</A>;

            if (ment) {
              wordsDisplayed += shortMentionInWords;

              link = <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={props.note.mentionedUsers || {}}
                />
              </div>;
            }
          }

        } catch (e) {
          link = <span class={styles.error}>{token}</span>;
        }

        return <span class="whole"> {link}{end}</span>;
      }

      if (isUserMention(token)) {
        let [_, id] = token.split(':');

        if (!id) {
          return token;
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

          return <span class="whole"> {link}</span>;
        } catch (e) {
          return <span class={styles.error}> {token}</span>;
        }
      }

      if (isTagMention(token)) {
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
              wordsDisplayed += shortMentionInWords;

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
      }

      if (isHashtag(token)) {
        let [_, term] = token.split('#');
        let end = '';

        let match = specialCharsRegex.exec(term);

        if (match) {
          const i = match.index;
          end = term.slice(i);
          term = term.slice(0, i);
        }

        const embeded = props.noLinks === 'text' ?
          <span>#{term}</span> :
          <A href={`/search/%23${term}`}>#{term}</A>;

        return <span class="whole"> {embeded}{end}</span>;
      }

      return <span class="whole">{convertHTMLEntity(token)}</span>;
  };

  onMount(() => {
    parseContent();
  });

  return (
    <div ref={thisNote} id={id()} class={styles.parsedNote} >
      <For each={tokens}>
        {(token) =>
          <Show when={shouldShowToken()}>
            <>{parseToken(token)}</>
          </Show>
        }
      </For>
      <Show when={props.shorten && tokens.length > shortNoteWords}>
        <span class={styles.more}>
          ... <span class="linkish">{intl.formatMessage(actions.seeMore)}</span>
        </span>
      </Show>
    </div>
  );
};

export default hookForDev(ParsedNote);
