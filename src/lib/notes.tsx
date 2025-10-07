import { Relay, relayInit } from "../lib/nTools";
import { createStore, unwrap } from "solid-js/store";
import LinkPreview from "../components/LinkPreview/LinkPreview";
import { addrRegex, appleMusicRegex, emojiRegex, hashtagRegex, interpunctionRegex, Kind, linebreakRegex, lnRegex, lnUnifiedRegex, mixCloudRegex, nostrNestsRegex, noteRegexLocal, profileRegex, rumbleRegex, soundCloudRegex, spotifyRegex, tagMentionRegex, tidalEmbedRegex, twitchPlayerRegex, twitchRegex, urlRegex, urlRegexG, wavlakeRegex, youtubeRegex, zapStreamEmbedRegex } from "../constants";
import { sendMessage, subsTo } from "../sockets";
import { EventCoordinate, MediaSize, NostrRelays, NostrRelaySignedEvent, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser, SendNoteResult } from "../types/primal";
import { decodeIdentifier, npubToHex } from "./keys";
import { logError, logInfo, logWarning } from "./logger";
import { getMediaUrl as getMediaUrlDefault } from "./media";
import { encrypt44, signEvent } from "./nostrAPI";
import { ArticleEdit } from "../pages/ReadsEditor";
import ExternalLiveEventPreview from "../components/LiveVideo/ExternalLiveEventPreview";
import { APP_ID } from "../App";

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
  return html ? html.replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '';
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

    const preview = await fetch(`${origin}/link-preview?u=${encodeURIComponent(url)}`);
    const data = await preview.json();

    return { url, description: data.description, title: data.title, images: [data.image], favicons: [data.icon_url] };

  } catch (e) {
    logWarning('Failed to get preview for: ', url);
    return { url };
  }
};

export const parseLinkPreviews = (previewKindContent: any) => {
  if (previewKindContent.resources.length === 0) return;

  for (let i = 0; i < previewKindContent.resources.length; i++) {
    const data = previewKindContent.resources[i];

    if (!data) {
      continue;
    }

    const preview = {
      url: data.url,
      title: data.md_title,
      description: data.md_description,
      mediaType: data.mimetype,
      contentType: data.mimetype,
      images: [data.md_image],
      favicons: [data.icon_url],
    };

    setLinkPreviews(() => ({ [data.url]: preview }));
  }
}

export const isUrl = (url: string) => urlRegex.test(url);
export const isHashtag = (url: string) => hashtagRegex.test(url);
export const isLinebreak = (url: string) => linebreakRegex.test(url);
export const isTagMention = (url: string) => tagMentionRegex.test(url);
export const isNoteMention = (url: string) => noteRegexLocal.test(url);
export const isUserMention = (url: string) => profileRegex.test(url);
export const isAddrMention = (url: string) => addrRegex.test(url);
export const isInterpunction = (url: string) => interpunctionRegex.test(url);
export const isCustomEmoji = (url: string) => emojiRegex.test(url);
export const isLnbc = (url: string) => lnRegex.test(url);
export const isUnitifedLnAddress = (url: string) => lnUnifiedRegex.test(url);

export const isImage = (url: string) => ['.jpg', '.jpeg', '.webp', '.png', '.gif', '.format=png'].some(x => url.includes(x));
export const isMp4Video = (url: string) => ['.mp4', '.mov'].some(x => url.includes(x));
export const isOggVideo = (url: string) => ['.ogg'].some(x => url.includes(x));
export const isWebmVideo = (url: string) => ['.webm'].some(x => url.includes(x));
export const is3gppVideo = (url: string) => ['.3gp'].some(x => url.includes(x));

export const isYouTube = (url: string) => youtubeRegex.test(url);
export const isSpotify = (url: string) => spotifyRegex.test(url);
export const isTwitch = (url: string) => twitchRegex.test(url);
export const isTwitchPlayer = (url: string) => twitchPlayerRegex.test(url);
export const isMixCloud = (url: string) => mixCloudRegex.test(url);
export const isSoundCloud = (url: string) => soundCloudRegex.test(url);
export const isAppleMusic = (url: string) => appleMusicRegex.test(url);
export const isNostrNests = (url: string) => nostrNestsRegex.test(url);
export const isWavelake = (url: string) => wavlakeRegex.test(url);
export const isRumble = (url: string) => rumbleRegex.test(url);
export const isTidal = (url: string) => tidalEmbedRegex.test(url);
export const isZapStream = (url: string) => zapStreamEmbedRegex.test(url);

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

      if (is3gppVideo(url)) {
        return `<video class="w-max" controls><source src="${url}" type="video/3gpp"></video>`;
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

      if (isZapStream(url)) {
        return `__EXTERNAL_STREAM__${url}__EXTERNAL_STREAM__`;
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

export type NostrEvent = { content: string, kind: number, tags: string[][], created_at: number };


export const sendContentReport = async (noteId: string, pubkey: string, reason: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: '',
    kind: Kind.ReportContent,
    tags: [
      ['e', noteId, reason],
      ['p', pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);

}

export const sendLike = async (note: PrimalNote | PrimalArticle | PrimalDVM, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: '+',
    kind: Kind.Reaction,
    tags: [
      ['e', note.id],
      ['p', note.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  // @ts-ignore
  if (note.coordinate) {
    // @ts-ignore
    event.tags.push(['a', note.coordinate]);
  }

  return await sendEvent(event, relays, relaySettings, shouldProxy);

}

export const sendRepost = async (note: PrimalNote, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: Kind.Repost,
    tags: [
      ['e', note.post.id],
      ['p', note.user.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
}

export const sendBlossomEvent = async (list: string[], shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: '',
    kind: Kind.Blossom,
    tags: list.map(url => ['server', url]),
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
}

export const sendArticleRepost = async (note: PrimalArticle, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: Kind.Repost,
    tags: [
      ['e', note.id],
      ['a', note.coordinate],
      ['p', note.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
}

export const proxyEvent = async (event: NostrEvent, relays: Relay[], relaySettings?: NostrRelays) => {
  let signedNote: NostrRelaySignedEvent | undefined;

  try {
    signedNote = await signEvent(event);
    if (!signedNote) throw('event_not_signed');
  } catch (reason) {
    logError('Failed to send event: ', reason);
    return { success: false , reasons: [reason]} as SendNoteResult;
  }

  // Relay hints from `e` tags
  const hintRelayUrls = event.tags.reduce((acc, t) => {
    if (
      t[0] === 'e' &&
      t[2] &&
      t[2].length > 0 &&
      !relays.find(r => r.url === t[2])
    ) {
      return [ ...acc, t[2] ];
    }

    return [...acc];
  }, []);

  let userRelays: Relay[] = relaySettings ?
    relays.filter((relay) => (relaySettings[relay.url] || { read: true, write: true }).write) :
    [...relays];

  const publishRelays = new Set<string>([ ...userRelays.map(r => r.url), ...hintRelayUrls]);

  const promise = new Promise<boolean>((resolve, reject) => {
    if (!signedNote) {
      reject("Note not signed");
      return;
    }

    const subId = `publish_event_${signedNote.id}`;

    const unsub = subsTo(subId, {
      onEvent: () => {
        unsub();
        resolve(true);
      },
      onNotice: () => {
        unsub();
        reject("Failed to publish note");
      },
      onEose: () => {
        unsub();
        reject('No publish confirmation')
      }
    })

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      { cache: ["broadcast_events", { events: [signedNote], relays: Array.from(publishRelays) }]}
    ]));
  });

  try {
    await Promise.race([promise]);

    return { success: true, note: signedNote } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    return { success: false, reasons: [e], note: signedNote} as SendNoteResult;
  }
}

export const sendNote = async (text: string, shouldProxy: boolean, relays: Relay[], tags: string[][], relaySettings?: NostrRelays) => {
  const event = {
    content: text,
    kind: Kind.Text,
    tags,
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
}

export const sendArticle = async (articleData: ArticleEdit, shouldProxy: boolean, relays: Relay[], tags: string[][], relaySettings?: NostrRelays) => {
  const time = Math.floor((new Date()).getTime() / 1000);

  const articleTags = [...(articleData.msg?.tags || [])];

  const pubTime = articleTags.find(t => t[0] === 'published_at')

  let timeTags = pubTime ? [[...pubTime] ]: [["published_at", `${time}`]]

  const event = {
    content: articleData.content,
    kind: Kind.LongForm,
    tags: [
      ...tags,
      ...timeTags,
    ],
    created_at: time,
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
}

export const generateIdentifier = (title: string) => {
  let str = title.toLowerCase();

  return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

export const sendDeleteEvent = async (
  pubkey: string,
  eventId: string,
  kind: number,
  relays: Relay[],
  relaySettings: NostrRelays | undefined,
  shouldProxy: boolean,
): Promise<SendNoteResult> => {
  const isCoordinate = eventId.split(':').length === 3;

  const tagLabel = isCoordinate ? 'a' : 'e';

  const ev: NostrEvent & { pubkey: string } = {
    kind: Kind.EventDeletion,
    pubkey,
    tags: [
      [tagLabel, eventId],
      ["k", `${kind}`],
    ],
    content: "Deleted by the author",
    created_at: Math.floor((new Date()).getTime() / 1_000),
  };

  const response = await sendEvent(ev, relays, relaySettings, shouldProxy);

  return response;
};

export const sendDraft = async (
  user: PrimalUser,
  article: ArticleEdit,
  mdContent: string,
  relays: Relay[],
  relaySettings: NostrRelays | undefined,
  shouldProxy: boolean,
): Promise<SendNoteResult> => {
  const pk = user.pubkey;
  const identifier = generateIdentifier(article.title);
  const time = Math.floor((new Date()).getTime() / 1000);
  const tags = article.tags.map((t) => ['t', t]);
  const a: NostrEvent = {
    content: mdContent,
    kind: Kind.LongForm,
    tags: [
      ["title", article.title],
      ["summary", article.summary],
      ["image", article.image],
      ["d", identifier],
      ['client', 'primal-web'],
      ...tags,
    ],
    created_at: time,
  };

  const e = await encrypt44(pk, JSON.stringify(a));
  // const d = await decrypt44(pk, e);

  const draft: NostrEvent = {
    kind: Kind.Draft,
    created_at: Math.floor((new Date()).getTime() / 1_000),
    tags: [
      ['d', identifier],
      ['k', `${Kind.LongForm}`],
      ['client', 'primal-web'],
      // ["e", "<anchor event event id>", "<relay-url>"],
      // ["a", "<anchor event address>", "<relay-url>"],
    ],
    content: e,
    // other fields
  }

  const response = await sendEvent(draft, relays, relaySettings, shouldProxy);

  return response;
};

// export const sendDraft = async (ev: NostrEvent, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
//   const time = Math.floor((new Date()).getTime() / 1000);

//   const event = {
//     content: articleData.content,
//     kind: Kind.LongForm,
//     tags: [
//       ["title", articleData.title],
//       ["summary", articleData.summary],
//       ["image", articleData.image],
//       ["published_at", `${time}`],
//       ["d", articleData.title.toLowerCase().replace(" ", "-")],
//       ["t", articleData.tags.join(" ")],
//       ...tags,
//     ],
//     created_at: time,
//   };

//   return await sendEvent(event, relays, relaySettings, shouldProxy);
// }

export const sendContacts = async (tags: string[][], date: number, content: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content,
    kind: Kind.Contacts,
    tags: [...tags],
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
};

export const sendMuteList = async (muteList: string[][], date: number, content: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content,
    kind: Kind.MuteList,
    tags: muteList,
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
};

export const sendStreamMuteList = async (muteList: string[][], date: number, content: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content,
    kind: Kind.StreamMuteList,
    tags: muteList,
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
};
export const broadcastEvent = async (event: NostrRelaySignedEvent, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {

  if (shouldProxy) {
    return await proxyEvent(event, relays, relaySettings);
  }

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

export const sendEvent = async (event: NostrEvent, relays: Relay[], relaySettings: NostrRelays | undefined, shouldProxy: boolean) => {

  if (shouldProxy) {
    return await proxyEvent(event, relays, relaySettings);
  }

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

  // Relay hints fromm `e` tags
  const hintRelayUrls = event.tags.reduce((acc, t) => {
    if (
      t[0] === 'e' &&
      t[2] &&
      t[2].length > 0 &&
      !relays.find(r => r.url === t[2])
    ) {
      return [ ...acc, t[2] ];
    }

    return [...acc];
  }, []);

  let relaysActual = [...relays];

  if (relaysActual.length === 0) {
    relaysActual = Object.keys(relaySettings || {});
  }

  for (let i = 0;i < relaysActual.length;i++) {

    const relay = relaysActual[i];

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
        logInfo('publishing to relay: ', relay, signedNote)

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

  for (let i = 0;i < hintRelayUrls.length;i++) {
    const url = hintRelayUrls[i];

    try {
      new Promise<string>(async (resolve, reject) => {
        const relay = relayInit(url);
        await relay.connect();

        try {
          logInfo('publishing to relay hint: ', relay)

          await relay.publish(signedNote);

          logInfo(`hint ${relay.url} has accepted our event`);
          resolve('success');

        } catch (e) {
          logError(`Failed publishing note to hint ${relay.url}: `, e);
          reject('success');
        }

        relay.close();
      });

    } catch (err) {
      logError('REALY ERROR: ', err)
    }
  }

  try {
    await Promise.any(responses);

    return { success: true, note: signedNote } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    return await proxyEvent(event, relays, relaySettings);
    // return { success: false, reasons, note: signedNote} as SendNoteResult;
  }
}

export const triggerImportEvents = (events: NostrRelaySignedEvent[], subId: string, then?: () => void) => {

  const unsub = subsTo(subId, {
    onEose: () => {
      unsub();
      then && then();
    }
  });

  importEvents(events, subId);
};


export const getEventReactions = (eventId: string, kind: number, subid: string, offset = 0) => {
  let event_id: string | undefined = eventId;
  let pubkey: string | undefined;
  let identifier: string | undefined;

  if (eventId.startsWith('note1')) {
    event_id = npubToHex(eventId);
  }

  if (eventId.startsWith('naddr')) {
    const decode = decodeIdentifier(event_id);

    pubkey = decode.data.pubkey;
    identifier = decode.data.identifier;
    event_id = undefined;
  }

  let payload = {
    kind,
    limit: 20,
    offset,
  };

  if (event_id) {
    // @ts-ignore
    payload.event_id = event_id;
  } else {
    // @ts-ignore
    payload.pubkey = pubkey;
    // @ts-ignore
    payload.identifier = identifier;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["event_actions", { ...payload }]},
  ]));
};

export const getEventQuotes = (eventId: string, subid: string, offset = 0, user_pubkey?: string | undefined) => {
  let event_id: string | undefined = eventId;
  let pubkey: string | undefined;
  let identifier: string | undefined;

  if (eventId.startsWith('note1')) {
    event_id = npubToHex(eventId);
  }

  if (eventId.startsWith('naddr')) {
    const decode = decodeIdentifier(event_id);

    pubkey = decode.data.pubkey;
    identifier = decode.data.identifier;
    event_id = undefined;
  }

  let payload = {
    limit: 20,
    offset,
  };

  if (event_id) {
    // @ts-ignore
    payload.event_id = event_id;
  } else {
    // @ts-ignore
    payload.pubkey = pubkey;
    // @ts-ignore
    payload.identifier = identifier;
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["note_mentions", { ...payload }]},
  ]));
};

export const getEventZaps = (eventId: string, user_pubkey: string | undefined, subid: string, limit: number,  offset = 0) => {
  let event_id: string | undefined = eventId;
  let pubkey: string | undefined;
  let identifier: string | undefined;

  if (eventId.startsWith('note1')) {
    event_id = npubToHex(eventId);
  }

  if (eventId.startsWith('naddr')) {
    const decode = decodeIdentifier(event_id);

    pubkey = decode.data.pubkey;
    identifier = decode.data.identifier;
    event_id = undefined;
  }

  let payload = {
    limit,
    offset
  };

  if (event_id) {
    // @ts-ignore
    payload.event_id = event_id;
  } else {
    // @ts-ignore
    payload.pubkey = pubkey;
    // @ts-ignore
    payload.identifier = identifier;
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["event_zaps_by_satszapped", { ...payload }]},
  ]));
};


export const getEventQuoteStats = (eventId: string, subid: string) => {
  const event_id = eventId.startsWith('note1') ? npubToHex(eventId) : eventId;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["note_mentions_count", { event_id }]},
  ]));
};


export const getParametrizedEvent = (pubkey: string, identifier: string, kind: number, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["parametrized_replaceable_event", { pubkey, kind, identifier, extended_response: true }]},
  ]));
};


export const getParametrizedEvents = (events: EventCoordinate[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["parametrized_replaceable_events", { events, extended_response: true }]},
  ]));
};


export const getReplacableEvent = (pubkey: string | undefined, kind: number, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["replaceable_event", { pubkey, kind, }]},
  ]));
};


export const getHighlights = (pubkey: string, identifier: string, kind: number, subid: string, user_pubkey: string | undefined) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_highlights", { pubkey, identifier, kind, user_pubkey }]},
  ]));
};

export const getMyRepostOfEvent = (event_id: string, pubkey: string | undefined) => {
  const subId = `find_repost_${APP_ID}`;
  return new Promise<string | undefined>((resolve) => {
    if (!pubkey) {
      resolve(undefined);
      return;
    }

    let id = '';

    const unsub = subsTo(subId, {
      onEvent: (_,event) => {
        if (event.kind === Kind.Repost) {
          console.log('content: ', event);
          id = event.id || '';
        }
      },
      onEose: () => {
        unsub();
        console.log('ID: ', id)
        if (!id || id.length === 0) {
          resolve(undefined);
          return;
        }

        resolve(id);
      },
      onNotice: () => {
        unsub();
        resolve(undefined);
      }
    })

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["find_reposts", { event_id, pubkey }]},
    ]));
  })
};
