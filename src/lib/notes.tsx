// @ts-ignore Bad types in nostr-tools
import { Relay } from "nostr-tools";
import { createStore } from "solid-js/store";
import LinkPreview from "../components/LinkPreview/LinkPreview";
import { appleMusicRegex, emojiRegex, hashtagRegex, interpunctionRegex, Kind, linebreakRegex, mixCloudRegex, nostrNestsRegex, noteRegex, noteRegexLocal, profileRegex, soundCloudRegex, spotifyRegex, tagMentionRegex, twitchRegex, urlRegex, urlRegexG, wavlakeRegex, youtubeRegex } from "../constants";
import { sendMessage, subscribeTo } from "../sockets";
import { MediaSize, NostrRelays, NostrRelaySignedEvent, PrimalNote, SendNoteResult } from "../types/primal";
import { logError, logInfo, logWarning } from "./logger";
import { getMediaUrl as getMediaUrlDefault } from "./media";
import { signEvent } from "./nostrAPI";

const getLikesStorageKey = () => {
  const key = localStorage.getItem('pubkey') || 'anon';
  return `likes_${key}`;
};

export const getStoredLikes = () => {
  return JSON.parse(localStorage.getItem(getLikesStorageKey()) || '[]');
};

export const setStoredLikes = (likes: string[]) => {
  return localStorage.setItem(getLikesStorageKey(), JSON.stringify(likes));
};

export const sanitize = (html: string) => {
  return html.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
};

export const [linkPreviews, setLinkPreviews] = createStore<Record<string, any>>({});

export const getLinkPreview = (url: string) => {
  return { ...linkPreviews[url] };
};

export const addLinkPreviews = async (url: string) => {
  if (linkPreviews[url]) {
    return { ...linkPreviews[url] };
  }

  try {
    const origin = window.location.origin.startsWith('http://localhost') ? 'https://dev.primal.net' : window.location.origin;

    const preview = await fetch(`${origin}/link-preview?u=${encodeURI(url)}`);
    const data = await preview.json();

    return { url, description: data.description, title: data.title, images: [data.image], favicons: [data.icon_url] };

  } catch (e) {
    logWarning('Failed to get preview for: ', url);
    return { url };
  }
};

export const isUrl = (url: string) => urlRegex.test(url);
export const isHashtag = (url: string) => hashtagRegex.test(url);
export const isLinebreak = (url: string) => linebreakRegex.test(url);
export const isTagMention = (url: string) => tagMentionRegex.test(url);
export const isNoteMention = (url: string) => noteRegexLocal.test(url);
export const isUserMention = (url: string) => profileRegex.test(url);
export const isInterpunction = (url: string) => interpunctionRegex.test(url);
export const isCustomEmoji = (url: string) => emojiRegex.test(url);

export const isImage = (url: string) => ['.jpg', '.jpeg', '.webp', '.png', '.gif', '.format=png'].some(x => url.includes(x));
export const isMp4Video = (url: string) => ['.mp4', '.mov'].some(x => url.includes(x));
export const isOggVideo = (url: string) => ['.ogg'].some(x => url.includes(x));
export const isWebmVideo = (url: string) => ['.webm'].some(x => url.includes(x));

export const isYouTube = (url: string) => youtubeRegex.test(url);
export const isSpotify = (url: string) => spotifyRegex.test(url);
export const isTwitch = (url: string) => twitchRegex.test(url);
export const isMixCloud = (url: string) => mixCloudRegex.test(url);
export const isSoundCloud = (url: string) => soundCloudRegex.test(url);
export const isAppleMusic = (url: string) => appleMusicRegex.test(url);
export const isNostrNests = (url: string) => nostrNestsRegex.test(url);
export const isWavelake = (url: string) => wavlakeRegex.test(url);


export const urlify = (
  text: string,
  getMediaUrl: ((url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined) | undefined,
  highlightOnly = false,
  skipEmbed = false,
  skipLinkPreview = false,
) => {

  return text.replace(urlRegexG, (url: string) => {
    if (!skipEmbed) {

      if (isImage(url)) {
        const dev = localStorage.getItem('devMode') === 'true';
        let imgUrl = getMediaUrl && getMediaUrl(url);

        if (!imgUrl) {
          // @ts-ignore
          // return (<div><NoteImage src={getMediaUrlDefault(url)} isDev={dev} /></div>).outerHTML;
          return `<img src="${getMediaUrlDefault(url)}" class="postImage${dev ? ' redBorder' : ''}"/>`;
        }

        // @ts-ignore
        // return (<div><NoteImage src={imgUrl} isDev={dev} /></div>).outerHTML;
        return `<img src="${imgUrl}" class="postImage"/>`;
      }

      if (isMp4Video(url)) {
        return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
      }

      if (isOggVideo(url)) {
        return `<video class="w-max" controls><source src="${url}" type="video/ogg"></video>`;
      }

      if (isWebmVideo(url)) {
        return `<video class="w-max" controls><source src="${url}" type="video/webm"></video>`;
      }

      if (isYouTube(url)) {
        const youtubeId = youtubeRegex.test(url) && RegExp.$1;

        return `<iframe
          class="w-max"
          src="https://www.youtube.com/embed/${youtubeId}"
          title="YouTube video player"
          key="${youtubeId}"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>`;
      }

      if (isSpotify(url)) {
        const convertedUrl = url.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

        return `<iframe style="borderRadius: 12" src="${convertedUrl}" width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      }

      if (isTwitch(url)) {
        const channel = url.split("/").slice(-1);

        const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;
        return `<iframe src="https://player.twitch.tv/${args}" className="w-max" allowFullScreen></iframe>`;
      }

      if (isMixCloud(url)) {
        const feedPath = (mixCloudRegex.test(url) && RegExp.$1) + "%2F" + (mixCloudRegex.test(url) && RegExp.$2);

        // const lightTheme = useLogin().preferences.theme === "light";
        // const lightParams = lightTheme ? "light=1" : "light=0";
        return `
            <br />
            <iframe
              title="SoundCloud player"
              width="100%"
              height="120"
              frameBorder="0"
              src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${feedPath}%2F"
            ></iframe>`;
      }

      if (isSoundCloud(url)) {
        return `<iframe
            width="100%"
            height="166"
            scrolling="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=${url}"></iframe>`;
      }

      if (isAppleMusic(url)) {
        const convertedUrl = url.replace("music.apple.com", "embed.music.apple.com");
        const isSongLink = /\?i=\d+$/.test(convertedUrl);

        return `
          <iframe
            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
            frameBorder="0"
            height="${isSongLink ? 175 : 450}"
            style="width: 100%; maxWidth: 660; overflow: hidden; background: transparent;"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            src="${convertedUrl}"></iframe>
        `;
      }

      // if (isNostrNests(url)) {
      //   return `
      //     <iframe
      //       src="${url}"
      //       allow="microphone"
      //       width="480"
      //       height="680"
      //       style="maxHeight: 680"
      //       sandbox="allow-same-origin allow-scripts"
      //     ></iframe>`;
      // }

      if (isWavelake(url)) {
        const convertedUrl = url.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

        return `
          <iframe
            style="borderRadius: 12"
            src="${convertedUrl}"
            width="100%"
            height="380"
            frameBorder="0"
            loading="lazy"></iframe>`;
      }
    }

    if (highlightOnly) {
      return `<span class="linkish">${url}</span>`;
    }

    if (skipLinkPreview) {
      return `<a link href="${url}" target="_blank" >${url}</a>`;
    }

    return `__LINK__${url}__LINK__`;
  })
}

export const replaceLinkPreviews = async (text: string) => {
  let parsed = text;

  const regex = /__LINK__.*?__LINK__/ig;

  const matched = parsed.match(regex) || [];

  for (let i = 0;i < matched.length; i++) {
    const m = matched[i];
    const url = m.split('__LINK__')[1];

    const preview = await addLinkPreviews(url);

    const hasMinimalPreviewData = preview && preview.url &&
      ((preview.description && preview.description.length > 0) || preview.image || preview.title);

    const c = hasMinimalPreviewData ?
      // @ts-ignore
      (<div class="bordered"><LinkPreview preview={preview} /></div>)?.outerHTML :
      `<a link href="${url}" target="_blank" >${url}</a>`;

    parsed = parsed.replace(m, c);
  }

  return parsed;
}

export const addlineBreaks = (text: string) => {
  const regex = /(\r\n|\r|\n)/g;

  return text.replaceAll(regex, '<br> ');
};

export const highlightHashtags = (text: string) => {
  const regex = /(^|\s)(#[a-z\d-]+)/ig;

  return text.replace(regex, "$1<span class='hash_tag'>$2</span>");
};

export const parseNote1 = (content: string, getMediaUrl: ((url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined) | undefined) =>
  urlify(addlineBreaks(content), getMediaUrl);
export const parseNote2 = (content: string, getMediaUrl: ((url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined) | undefined) =>
  urlify(addlineBreaks(content), getMediaUrl, true);
export const parseNote3 = (content: string, getMediaUrl: ((url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined) | undefined) =>
  urlify(addlineBreaks(content), getMediaUrl, false, false, true);


export const importEvents = (events: NostrRelaySignedEvent[], subid: string) => {

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["import_events", { events }]},
  ]));
};

type NostrEvent = { content: string, kind: number, tags: string[][], created_at: number };

export const sendLike = async (note: PrimalNote, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: '+',
    kind: Kind.Reaction,
    tags: [
      ['e', note.post.id],
      ['p', note.post.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings);

}

export const sendRepost = async (note: PrimalNote, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: Kind.Repost,
    tags: [
      ['e', note.post.id],
      ['p', note.user.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings);
}

export const sendNote = async (text: string, relays: Relay[], tags: string[][], relaySettings?: NostrRelays) => {
  const event = {
    content: text,
    kind: Kind.Text,
    tags,
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings);
}

export const sendContacts = async (tags: string[][], date: number, content: string, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content,
    kind: Kind.Contacts,
    tags: [...tags],
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings);
};

export const sendMuteList = async (muteList: string[], date: number, content: string, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content,
    kind: Kind.MuteList,
    tags: muteList.map(c => ['p', c]),
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings);
};

export const broadcastEvent = async (event: NostrRelaySignedEvent, relays: Relay[], relaySettings?: NostrRelays) => {

  let responses = [];
  let reasons: string[] = [];

  for (let i = 0;i < relays.length;i++) {
    const relay = relays[i];

    const settings = (relaySettings && relaySettings[relay.url]) || { read: true, write: true };

    if (!settings.write) {
      continue;
    }

    responses.push(new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        logError(`Publishing post to ${relay.url} has timed out`);
        reasons.push('timeout');
        reject('timeout');
      }, 8_000);

      try {
        let pub = relay.publish(event);

        logInfo('publishing to relay: ', relay)

        pub.on('ok', () => {
          logInfo(`${relay.url} has accepted our event`);
          clearTimeout(timeout);
          resolve('success');
        });

        pub.on('failed', (reason: any) => {
          logError(`failed to publish to ${relay.url}: ${reason}`)
          clearTimeout(timeout);
          reasons.push(reason);
          reject('failed');
        });

      } catch (e) {
        logError('Failed publishing note: ', e);
        clearTimeout(timeout);
        reasons.push(`${e}`);
        reject(e);
      }
    }));
  }

  try {
    await Promise.any(responses);

    return { success: true, note: event } as SendNoteResult;
  }
  catch (e) {
    logError('Error broadcasting note: ', e);
    return { success: false, reasons, note: event} as SendNoteResult;
  }
};

export const sendEvent = async (event: NostrEvent, relays: Relay[], relaySettings?: NostrRelays) => {
  let signedNote: NostrRelaySignedEvent | undefined;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  let responses = [];
  let reasons: string[] = [];

  for (let i = 0;i < relays.length;i++) {
    const relay = relays[i];

    const settings = (relaySettings && relaySettings[relay.url]) || { read: true, write: true };

    if (!settings.write) {
      continue;
    }

    responses.push(new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        logError(`Publishing note to ${relay.url} has timed out`);
        reasons.push('timeout');
        reject('timeout');
      }, 8_000);

      try {
        logInfo('publishing to relay: ', relay)

        await relay.publish(signedNote);

        logInfo(`${relay.url} has accepted our event`);
        clearTimeout(timeout);
        resolve('success');

      } catch (e) {
        logError(`Failed publishing note to ${relay.url}: `, e);
        clearTimeout(timeout);
        reasons.push(`${e}`);
        reject(e);
      }
    }));
  }

  try {
    await Promise.any(responses);

    return { success: true, note: signedNote } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    return { success: false, reasons, note: signedNote} as SendNoteResult;
  }
}

export const triggerImportEvents = (events: NostrRelaySignedEvent[], subId: string, then?: () => void) => {

  const unsub = subscribeTo(subId, (type) => {

    if (type === 'EOSE') {
      unsub();
      then && then();
    }
  });

  importEvents(events, subId);
};


export const getEventReactions = (eventId: string, kind: number, subid: string, offset = 0) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["event_actions", { event_id: eventId, kind, limit: 20, offset }]},
  ]));
};
