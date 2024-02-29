import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import {
  addLinkPreviews,
  isAppleMusic,
  isHashtag,
  isImage,
  isInterpunction,
  isLinebreak,
  isMixCloud,
  isMp4Video,
  isNostrNests,
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
import { convertToUser, truncateNpub, userName } from '../../stores/profile';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import {
  Component, createEffect, createSignal, For, JSXElement, Match, onMount, Show, Switch,
} from 'solid-js';
import {
  MediaSize,
  NostrMentionContent,
  NostrNoteContent,
  NostrPostStats,
  NostrStatsContent,
  NostrUserContent,
  NoteReference,
  PrimalNote,
  PrimalUser,
  UserReference,
} from '../../types/primal';

import { nip19 } from 'nostr-tools';
import LinkPreview from '../LinkPreview/LinkPreview';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import { getMediaUrl, getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import NoteImage from '../NoteImage/NoteImage';
import { createStore } from 'solid-js/store';
import { Kind, linebreakRegex } from '../../constants';
import { APP_ID } from '../../App';
import { getEvents } from '../../lib/feed';
import { getUserProfileInfo } from '../../lib/profile';
import { store, updateStore } from '../../services/StoreService';
import { subscribeTo } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { account } from '../../translations';
import { useAccountContext } from '../../contexts/AccountContext';
import { logError } from '../../lib/logger';


export type Token = {
  type: string;
  content: string | PrimalNote | PrimalUser,
  options?: Object,
}

export type ParserContextStore = {
  userRefs: UserReference,
  noteRefs: NoteReference,
  parsedToken: Token,
  isDataFetched: boolean,
  renderedUrl: JSXElement,
}


const ParsingToken: Component<{
  token: string,
  userRefs?: UserReference,
  noteRefs?: NoteReference,
  id?: string,
  ignoreMedia?: boolean,
  noLinks?: 'links' | 'text',
  noPreviews?: boolean,
  index?: number,
}> = (props) => {

  const account = useAccountContext();

  const [store, updateStore] = createStore<ParserContextStore>({
    userRefs: {},
    noteRefs: {},
    parsedToken: { type: 'text', content: ''},
    isDataFetched: false,
    renderedUrl: <></>,
  });

  const getMentionedUser = (mention: string) => {
    let [_, npub] = mention.trim().split(':');

    const lastChar = npub[npub.length - 1];

    if (isInterpunction(lastChar)) {
      npub = npub.slice(0, -1);
    }

    const subId = `um_${APP_ID}`;

    try {
      const eventId = nip19.decode(npub).data as string | nip19.ProfilePointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.pubkey;

      if (store.userRefs[hex]) {
        return;
      }

      const unsub = subscribeTo(subId, (type, _, content) => {
          if (type === 'EOSE') {
            updateStore('isDataFetched', () => true)
            unsub();
            return;
          }

          if (type === 'EVENT') {
            if (!content) return;

            if (content.kind === Kind.Metadata) {
              const user = content as NostrUserContent;

              const u = convertToUser(user);

              updateStore('userRefs', () => ({ [u.pubkey]: u }));
              return;
            }
          }
      });

      getUserProfileInfo(hex, account?.publicKey, subId);
    }
    catch (e) {
      logError('Failed to fetch mentioned user info: ', e);
    }
  }

  const getMentionedNote = (mention: string) => {
    let [_, noteId] = mention.trim().split(':');

    const lastChar = noteId[noteId.length - 1];

    if (isInterpunction(lastChar)) {
      noteId = noteId.slice(0, -1);
    }

    const subId = `nm_${noteId}_${APP_ID}`;

    try{
      const eventId = nip19.decode(noteId).data as string | nip19.EventPointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.id;

      if (store.noteRefs[hex]) {
        return;
      }

      let users: Record<string, NostrUserContent> = {};
      let messages: NostrNoteContent[] = [];
      let noteStats: NostrPostStats = {};
      let noteMentions: Record<string, NostrNoteContent> = {};

      const unsub = subscribeTo(subId, (type, subId, content) =>{
        if (type === 'EOSE') {
          const newNote = convertToNotes({
            users,
            messages,
            postStats: noteStats,
            mentions: noteMentions,
            noteActions: {},
          })[0];

          updateStore('noteRefs', () => ({[newNote.post.id]: { ...newNote }}));
          updateStore('isDataFetched', () => true)
          unsub();
          return;
        }

        if (type === 'EVENT') {
          if (!content) {
            return;
          }

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            users[user.pubkey] = { ...user };
            return;
          }

          if ([Kind.Text, Kind.Repost].includes(content.kind)) {
            const message = content as NostrNoteContent;

            messages.push(message);
            return;
          }

          if (content.kind === Kind.NoteStats) {
            const statistic = content as NostrStatsContent;
            const stat = JSON.parse(statistic.content);

            noteStats[stat.event_id] = { ...stat };
            return;
          }

          if (content.kind === Kind.Mentions) {
            const mentionContent = content as NostrMentionContent;
            const mention = JSON.parse(mentionContent.content);

            noteMentions[mention.id] = { ...mention };
            return;
          }
        }
      });


      getEvents(account?.publicKey, [hex], subId, true);
    }
    catch (e) {
      logError('Failed to fetch mentioned user info: ', e);
    }
  }

  const prepareForParsing = async (token: string) => {
    if (isUserMention(token)) {
      getMentionedUser(token);
      return;
    }

    if (isNoteMention(token)) {
      getMentionedNote(token);
      return;
    }
  }


  createEffect(() => {
    prepareForParsing(props.token);
  });

  createEffect(() => {
    updateStore('userRefs', props.userRefs || {});
    updateStore('noteRefs', props.noteRefs || {});
  });

  createEffect(() => {
    if (!isUrl(props.token)) return;

    if (props.noLinks === 'text') {
      updateStore('renderedUrl', () => renderText(props.token));
      return;
    }

    const url = props.token.trim();

    updateStore('renderedUrl', () => <a link href={url} target="_blank" >{url}</a>);

    addLinkPreviews(url).then(preview => {
      const hasMinimalPreviewData = !props.noPreviews &&
        preview &&
        preview.url &&
        ((preview.description && preview.description.length > 0) ||
          preview.image ||
          preview.title
        );

      if (hasMinimalPreviewData) {
        updateStore('renderedUrl', () => <div class="bordered"><LinkPreview preview={preview} /></div>);
      }
    });
  });

  const renderText = (token: string) => token;

  const renderImage = (token: string) => {

    const dev = localStorage.getItem('devMode') === 'true';
    let imgUrl = getMediaUrl ? getMediaUrl(token) : token;
    const url = imgUrl || getMediaUrlDefault(token)

    return <NoteImage src={url} isDev={dev} />;
  }

  const renderVideo = (token: string, type: string) => {
    return <video class="w-max" controls><source src={token} type={`video/${type}`} /></video>
  }

  const renderYouTube = (token: string) => {
    const youtubeId = isYouTube(token) && RegExp.$1;

    return (
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
  }

  const renderSpotify = (token: string) => {
    const convertedUrl = token.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

    return (
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
  };

  const renderTwitch = (token: string) => {
    const channel = token.split("/").slice(-1);
    const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;

    return (
      <iframe
        src={`https://player.twitch.tv/${args}`}
        // @ts-ignore no property
        className="w-max"
        allowFullScreen
      ></iframe>
    );
  };

  const renderMixCloud = (token: string) => {
    const feedPath = (isMixCloud(token) && RegExp.$1) + "%2F" + (isMixCloud(token) && RegExp.$2);

    return (
      <iframe
        title="SoundCloud player"
        width="100%"
        height="120"
        // @ts-ignore no property
        frameBorder="0"
        src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${feedPath}%2F`}
      ></iframe>
    );
  };

  const renderSoundCloud = (token: string) => {
    return (
      <iframe
        width="100%"
        height="166"
        // @ts-ignore no property
        scrolling="no"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=${token}`}
      ></iframe>
    );
  };

  const renderAppleMusic = (token: string) => {
    const convertedUrl = token.replace("music.apple.com", "embed.music.apple.com");
    const isSongLink = /\?i=\d+$/.test(convertedUrl);

    return (
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
  };

  const renderWavelake = (token: string) => {
    const convertedUrl = token.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

    return (
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
  };

  const renderNoteMention = (token: string) => {
    let [nostr, noteId] = token.trim().split(':');

    if (!noteId) {
      return renderText(token);
    }

    let lastChar = noteId[noteId.length - 1];

    if (isInterpunction(lastChar)) {
      noteId = noteId.slice(0, -1);
    } else {
      lastChar = '';
    }

    try {
      const eventId = nip19.decode(noteId).data as string | nip19.EventPointer;
      const hex = typeof eventId === 'string' ? eventId : eventId.id;

      const path = `/e/${noteId}`;

      if (props.noLinks === 'links') {
        return <><span class="linkish">{nostr}:{noteId}</span>{lastChar}</>;
      }

      if (!props.noLinks) {
        const ment = store.noteRefs && store.noteRefs[hex];

        return ment ?
          <>
            <EmbeddedNote
              note={ment}
              mentionedUsers={store.userRefs || {}}
              includeEmbeds={true}
            />
            {lastChar}
          </> :
          <><A href={path}>{nostr}:{noteId}</A>{lastChar}</>;
      }

    } catch (e) {
      logError('Failed to render note mention: ', e)
      return <span class="error">{token}</span>;
    }
  }

  const renderUserMention = (token: string) => {

    let [_, npub] = token.trim().split(':');

    if (!npub) {
      return renderText(token);
    }

    let lastChar = npub[npub.length - 1];

    if (isInterpunction(lastChar)) {
      npub = npub.slice(0, -1);
    } else {
      lastChar = '';
    }

    try {
      const profileId = nip19.decode(npub).data as string | nip19.ProfilePointer;

      const hex = typeof profileId === 'string' ? profileId : profileId.pubkey;

      const path = `/p/${npub}`;

      let user = store.userRefs && store.userRefs[hex];

      const label = user ? userName(user) : truncateNpub(npub);

      if (props.noLinks === 'links') {
        return <><span class="linkish">@{label}</span>{lastChar}</>;
      }

      if (!props.noLinks) {
        return !user ? <><A href={path}>@{label}</A>{lastChar}</> : <>{MentionedUserLink({ user })}{lastChar}</>;
      }

    } catch (e) {
      logError('Failed to parse user mention: ', e)
      return <span class="error">{token}</span>;
    }
  }

  return (
    <Switch fallback={renderText(props.token)}>
      <Match when={props.token === '<_space_>'}>
        <> </>
      </Match>

      <Match when={isUrl(props.token)}>
        <Switch fallback={store.renderedUrl}>

          <Match when={isImage(props.token) && !props.ignoreMedia}>
            {renderImage(props.token)}
          </Match>

          <Match when={isMp4Video(props.token) && !props.ignoreMedia}>
            {renderVideo(props.token, 'mp4')}
          </Match>

          <Match when={isOggVideo(props.token) && !props.ignoreMedia}>
            {renderVideo(props.token, 'ogg')}
          </Match>

          <Match when={isWebmVideo(props.token) && !props.ignoreMedia}>
            {renderVideo(props.token, 'webm')}
          </Match>

          <Match when={isYouTube(props.token) && !props.ignoreMedia}>
            {renderYouTube(props.token)}
          </Match>

          <Match when={isSpotify(props.token) && !props.ignoreMedia}>
            {renderSpotify(props.token)}
          </Match>

          <Match when={isTwitch(props.token) && !props.ignoreMedia}>
            {renderTwitch(props.token)}
          </Match>

          <Match when={isMixCloud(props.token) && !props.ignoreMedia}>
            {renderMixCloud(props.token)}
          </Match>

          <Match when={isSoundCloud(props.token) && !props.ignoreMedia}>
            {renderSoundCloud(props.token)}
          </Match>

          <Match when={isAppleMusic(props.token) && !props.ignoreMedia}>
            {renderAppleMusic(props.token)}
          </Match>

          <Match when={isWavelake(props.token) && !props.ignoreMedia}>
            {renderWavelake(props.token)}
          </Match>
        </Switch>
      </Match>

      <Match when={isLinebreak(props.token)}>
        <br/>
      </Match>

      <Match when={isInterpunction(props.token)}>
        {renderText(props.token)}
      </Match>

      <Match when={isNoteMention(props.token)}>
        <Show when={store.isDataFetched}>
          {renderNoteMention(props.token)}
        </Show>
      </Match>

      <Match when={isUserMention(props.token)}>
        <Show when={store.isDataFetched}>
          {renderUserMention(props.token)}
        </Show>
      </Match>

    </Switch>
  );
};

export default ParsingToken;
