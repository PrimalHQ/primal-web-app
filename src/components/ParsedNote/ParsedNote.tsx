import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import {
  addLinkPreviews,
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
  Component, createEffect, For, JSXElement, onMount, Show,
} from 'solid-js';
import {
  PrimalLinkPreview,
  PrimalNote,
} from '../../types/primal';

import styles from './ParsedNote.module.scss';
import { nip19 } from 'nostr-tools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteImage from '../NoteImage/NoteImage';
import { createStore } from 'solid-js/store';
import { linebreakRegex, specialCharsRegex, urlExtractRegex } from '../../constants';


const convertHTMLEntity = (text: string) => {
  const span = document.createElement('span');

  return text
  .replace(/&[#A-Za-z0-9]+;/gi, (entity)=> {
      span.innerHTML = entity;
      return span.innerText;
  });
}

const ParsedNote: Component<{
  note: PrimalNote,
  id?: string,
  ignoreMedia?: boolean,
  ignoreLinebreaks?: boolean,
  noLinks?: 'links' | 'text',
  noPreviews?: boolean,
}> = (props) => {

  const media = useMediaContext();

  const [tokens, setTokens] = createStore<string[]>([])

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
            const dev = localStorage.getItem('devMode') === 'true';
            let image = media?.actions.getMedia(token, 'o');
            const url = image?.media_url || getMediaUrlDefault(token)

            return <NoteImage src={url} isDev={dev} media={image} width={514} />;
          }

          if (isMp4Video(token)) {
            return <video class="w-max" controls><source src={token} type="video/mp4" /></video>;
          }

          if (isOggVideo(token)) {
            return <video class="w-max" controls><source src={token} type="video/ogg" /></video>;
          }

          if (isWebmVideo(token)) {
            return <video class="w-max" controls><source src={token} type="video/webm" /></video>;
          }

          if (isYouTube(token)) {
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
          return <LinkPreview preview={preview} />;
        }

        return <span data-url={token}><a link href={token} target="_blank" >{token}</a></span>;
      }

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

            link = ment ?
              <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={props.note.mentionedUsers || {}}
                />
              </div> :
              <A href={path}>{token}</A>;
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

            embeded = ment ?
              <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={props.note.mentionedUsers}
                />
                {end}
              </div> :
              <><A href={path}>{noteId}</A>{end}</>;
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

  let noteHolder: HTMLDivElement | undefined;

  const replaceLink = (url: string, preview: PrimalLinkPreview) => {
    if (!noteHolder) return;

    const hasMinimalPreviewData = !props.noPreviews &&
      preview &&
      preview.url &&
      ((!!preview.description && preview.description.length > 0) ||
        !preview.images?.some(x => x === '') ||
        !!preview.title
      );

    if (hasMinimalPreviewData) {
      // @ts-ignore
      noteHolder.querySelector(`[data-url="${url}"]`).innerHTML = (<div><LinkPreview preview={preview} /></div>).outerHTML;
    }
  };

  return (
    <div id={props.id} ref={noteHolder}>
      <For each={tokens}>
        {(token) => <>{parseToken(token)}</>}
      </For>
    </div>
  );
};

export default hookForDev(ParsedNote);
