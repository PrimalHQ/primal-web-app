import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import {
  addLinkPreviews,
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
  Component, For, JSXElement, onMount, Show,
} from 'solid-js';
import {
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
import { linebreakRegex } from '../../constants';


const ParsedNote: Component<{
  note: PrimalNote,
  id?: string,
  ignoreMedia?: boolean,
  noLinks?: 'links' | 'text',
  noPreviews?: boolean,
}> = (props) => {

  const media = useMediaContext();

  const [elements, setElements] = createStore<JSXElement[]>([]);

  const parseContent = async () => {
    const content = props.note.post.content.replace(linebreakRegex, ' __LB__ ');
    const tokens = content.split(/[\s]+/);

    for(let i = 0; i<tokens.length; i++) {
      const token = tokens[i];

      if (token === '__LB__') {
        setElements(elements.length, <br />);
        continue;
      }

      if (isInterpunction(token)) {
        setElements(elements.length, <span>{token}</span>)
        continue;
      }

      if (isUrl(token)) {
        const index = token.indexOf('http');

        if (index > 0) {
          const prefix = token.slice(0, index);
          const url = token.slice(index);
          tokens.splice(i+1, 0, prefix);
          tokens.splice(i+2, 0, url);
          continue;
        }

        if (!props.ignoreMedia) {
          if (isImage(token)) {
            const dev = localStorage.getItem('devMode') === 'true';
            let imgUrl = media?.actions.getMediaUrl(token);
            const url = imgUrl || getMediaUrlDefault(token)

            setElements(elements.length, <NoteImage src={url} isDev={dev} />);
            continue;
          }

          if (isMp4Video(token)) {
            setElements(elements.length, <video class="w-max" controls><source src={token} type="video/mp4" /></video>);
            continue;
          }

          if (isOggVideo(token)) {
            setElements(elements.length, <video class="w-max" controls><source src={token} type="video/ogg" /></video>);
            continue;
          }

          if (isWebmVideo(token)) {
            setElements(elements.length, <video class="w-max" controls><source src={token} type="video/webm" /></video>);
            continue;
          }

          if (isYouTube(token)) {
            const youtubeId = isYouTube(token) && RegExp.$1;

            setElements(elements.length,
              <iframe
                class="w-max"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="YouTube video player"
                // @ts-ignore no property
                key={youtubeId}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            );
            continue;
          }

          if (isSpotify(token)) {
            const convertedUrl = token.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

            setElements(elements.length,
              <iframe
                style="borderRadius: 12"
                src={convertedUrl}
                width="100%"
                height="352"
                // @ts-ignore no property
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            );
            continue;
          }

          if (isTwitch(token)) {
            const channel = token.split("/").slice(-1);

            const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;

            setElements(elements.length,
              <iframe
                src={`https://player.twitch.tv/${args}`}
                // @ts-ignore no property
                className="w-max"
                allowFullScreen
              ></iframe>
            );
            continue;
          }

          if (isMixCloud(token)) {
            const feedPath = (isMixCloud(token) && RegExp.$1) + "%2F" + (isMixCloud(token) && RegExp.$2);

            setElements(elements.length,
              <div>
                <iframe
                  title="SoundCloud player"
                  width="100%"
                  height="120"
                  // @ts-ignore no property
                  frameBorder="0"
                  src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${feedPath}%2F`}
                ></iframe>
              </div>
            );
          }

          if (isSoundCloud(token)) {
            setElements(elements.length,
              <iframe
                width="100%"
                height="166"
                // @ts-ignore no property
                scrolling="no"
                allow="autoplay"
                src={`https://w.soundcloud.com/player/?url=${token}`}
              ></iframe>
            );
            continue;
          }

          if (isAppleMusic(token)) {
            const convertedUrl = token.replace("music.apple.com", "embed.music.apple.com");
            const isSongLink = /\?i=\d+$/.test(convertedUrl);

            setElements(elements.length,
              <iframe
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                // @ts-ignore no property
                frameBorder="0"
                height={`${isSongLink ? 175 : 450}`}
                style="width: 100%; maxWidth: 660; overflow: hidden; background: transparent;"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                src={convertedUrl}
              ></iframe>
            );
            continue;
          }

          if (isWavelake(token)) {
            const convertedUrl = token.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

            setElements(elements.length,
              <iframe
                style="borderRadius: 12"
                src={convertedUrl}
                width="100%"
                height="380"
                // @ts-ignore no property
                frameBorder="0"
                loading="lazy"
              ></iframe>
            );
            continue;
          }
        }

        if (props.noLinks === 'text') {
          setElements(elements.length, <span class="whole">{token}</span>);
          continue;
        }

        const preview = await addLinkPreviews(token);

        const hasMinimalPreviewData = !props.noPreviews &&
          preview &&
          preview.url &&
          ((preview.description && preview.description.length > 0) ||
            preview.image ||
            preview.title
          );

        const c = hasMinimalPreviewData ?
          <div class="bordered"><LinkPreview preview={preview} /></div> :
          <a link href={token} target="_blank" >{token}</a>;

        setElements(elements.length, c);
        continue;
      }

      if (isNoteMention(token)) {
        const [_, id] = token.split(':');

        if (!id) {
          return token;
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

        setElements(elements.length, <span class="whole"> {link}</span>);
        continue;
      }

      if (isUserMention(token)) {
        let [_, id] = token.split(':');

        if (!id) {
          return token;
        }

        if ([',', '?', ';', '!'].some(x => id.endsWith(x))) {
          const end = id[id.length - 1];
          id = id.slice(0, -1);
          tokens.splice(i+1, 0, end);
        }

        try {
          const profileId = nip19.decode(id).data as string | nip19.ProfilePointer;

          const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;
          const npub = hexToNpub(hex);

          const path = `/p/${npub}`;

          let user = props.note.mentionedUsers && props.note.mentionedUsers[hex];

          const label = user ? userName(user) : truncateNpub(npub);

          let link = <span>@{label}</span>;

          if (props.noLinks === 'links') {
            link = <span class='linkish'>@{label}</span>;
          }

          if (!props.noLinks) {
            link = !user ? <A href={path}>@{label}</A> : MentionedUserLink({ user });
          }

          setElements(elements.length, <span class="whole"> {link}</span>);
        } catch (e) {
          setElements(elements.length, <span class={styles.error}> {token}</span>);
        }
        continue;
      }

      if (isTagMention(token)) {
        let t = `${token}`;

        if ([',', '?', ';', '!'].some(x => t.endsWith(x))) {
          const end = t[t.length - 1];
          t = t.slice(0, -1);
          tokens.splice(i+1, 0, end);
        }

        let r = parseInt(t.slice(2, t.length - 1));

        const tag = props.note.post.tags[r];

        if (tag === undefined || tag.length === 0) continue;

        if (
          tag[0] === 'e' &&
          props.note.mentionedNotes &&
          props.note.mentionedNotes[tag[1]]
        ) {
          const hex = tag[1];
          const noteId = `nostr:${nip19.noteEncode(hex)}`;
          const path = `/e/${nip19.noteEncode(hex)}`;

          let embeded = <span>{noteId}</span>;

          if (props.noLinks === 'links') {
            embeded = <span class='linkish'>@{noteId}</span>;
          }

          if (!props.noLinks) {
            const ment = props.note.mentionedNotes[hex];

            embeded = ment ?
              <div>
                <EmbeddedNote
                  note={ment}
                  mentionedUsers={props.note.mentionedUsers}
                />
              </div> :
              <A href={path}>{noteId}</A>;
          }

          setElements(elements.length, <span class="whole"> embeded</span>);
          continue;
        }

        if (tag[0] === 'p' && props.note.mentionedUsers && props.note.mentionedUsers[tag[1]]) {
          const user = props.note.mentionedUsers[tag[1]];

          const path = `/p/${user.npub}`;

          const label = userName(user);

          let link = <span>@{label}</span>;

          if (props.noLinks === 'links') {
            link = <span class='linkish'>@{label}</span>;
          }

          if (!props.noLinks) {
            link = user ? <A href={path}>@{label}</A> : MentionedUserLink({ user });
          }

          setElements(elements.length, <span> {link}</span>);
          continue;
        }
      }

      if (isHashtag(token)) {
        const [_, term] = token.split('#');
        const embeded = props.noLinks === 'text' ?
          <span>#{term}</span> :
          <A href={`/search/%23${term}`}>#{term}</A>;

        setElements(elements.length, <span class="whole"> {embeded}</span>);
        continue;
      }

      const c = <span class="whole">
        <Show when={i > 0}> </Show>
        {token}
      </span>;

      setElements(elements.length, c);
    }
  };

  onMount(() => {
    parseContent();
  });

  return (
    <div id={props.id}>
      <For each={elements}>
        {(el) => <>{el}</>}
      </For>
    </div>
  );
};

export default hookForDev(ParsedNote);
