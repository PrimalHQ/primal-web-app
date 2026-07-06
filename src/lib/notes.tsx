import { Relay } from "../lib/nTools";
import { createStore, unwrap } from "solid-js/store";
import LinkPreview from "../components/LinkPreview/LinkPreview";
import { addrRegex, appleMusicRegex, emojiRegex, hashtagRegex, interpunctionRegex, Kind, linebreakRegex, lnRegex, lnUnifiedRegex, mixCloudRegex, nostrNestsRegex, noteRegexLocal, profileRegex, rumbleRegex, soundCloudRegex, spotifyRegex, tagMentionRegex, tidalEmbedRegex, twitchPlayerRegex, twitchRegex, urlRegex, urlRegexG, wavlakeRegex, youtubeRegex, zapStreamEmbedRegex } from "../constants";
import { sendMessage, subsTo } from "../sockets";
import { EventCoordinate, MediaSize, MegaFeedPage, NostrNoteContent, NostrRelays, NostrRelaySignedEvent, PrimalArticle, PrimalDVM, PrimalNote, PrimalPollChoice, PrimalUser, PrimalUserPoll, SendNoteResult } from "../types/primal";
import { decodeIdentifier, hexToNpub, npubToHex } from "./keys";
import { logError, logWarning } from "./logger";
import { getMediaUrl as getMediaUrlDefault } from "./media";
import { encrypt44, signEvent } from "./nostrAPI";
import { ArticleEdit } from "../pages/ReadsEditor";
import { APP_ID, relayWorker } from "../App";
import { accountStore, dequeEvent, enqueEvent, updateAccountStore } from "../stores/accountStore";
import { DecodedNaddr } from "nostr-tools/lib/types/nip19";
import { emptyMegaFeedPage, emptyMegaFeedResults, FeedPaging, MegaFeedResults, pageResolve, updateFeedPage } from "../megaFeeds";
import { parseBolt11 } from "../utils";
import { emptyUser } from "../stores/profile";

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

export const isAudio = (url: string) => ['.mp3', '.wav'].some(x => url.includes(x));

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

      if (isAudio(url)) {
        return `<audio class="mtop-12" controls src="${url}"></audio>`;
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

    let preview: any;

    if (i === matched.length - 1 && text.endsWith(m)) {
      preview = await addLinkPreviews(url);
    }

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


export const sendContentReport = async (noteId: string, pubkey: string, reason: string) => {
  const event = {
    content: '',
    kind: Kind.ReportContent,
    tags: [
      ['e', noteId, reason],
      ['p', pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event);

}

export const sendLike = async (note: PrimalNote | PrimalArticle | PrimalDVM) => {
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

  return await sendEvent(event);

}

export const sendRepost = async (note: PrimalNote) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: Kind.Repost,
    tags: [
      ['e', note.msg.id],
      ['p', note.user.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event);
}

export const sendBlossomEvent = async (list: string[]) => {
  const event = {
    content: '',
    kind: Kind.Blossom,
    tags: list.map(url => ['server', url]),
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event);
}

export const sendArticleRepost = async (note: PrimalArticle) => {
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

  return await sendEvent(event);
}

export const proxyEvent = async (event: NostrRelaySignedEvent, relays: Relay[], relaySettings?: NostrRelays) => {
  // let signedNote: NostrRelaySignedEvent | undefined;

  // try {
  //   signedNote = await signEvent(event);
  //   if (!signedNote) throw('event_not_signed');
  // } catch (reason) {
  //   logError('Failed to send event: ', reason);
  //   return { success: false , reasons: [reason]} as SendNoteResult;
  // }

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

  const relayUrls = Object.keys(relaySettings || {});

  let userRelays: Relay[] = relayUrls.filter(url => relaySettings?.[url].write);

  const publishRelays = new Set<string>([ ...userRelays, ...hintRelayUrls]);

  const promise = new Promise<boolean>((resolve, reject) => {
    if (!event) {
      reject("Note not signed");
      return;
    }

    const subId = `publish_event_${event.id}`;

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
      { cache: ["broadcast_events", { events: [event], relays: Array.from(publishRelays) }]}
    ]));
  });

  try {
    await Promise.race([promise]);

    return { success: true, note: event } as SendNoteResult;
  }
  catch (e) {
    logError('Failed to publish the note: ', e);
    return { success: false, reasons: [e], note: event} as SendNoteResult;
  }
}

export const sendNote = (text: string, tags: string[][], waitForImport?: boolean) => {
  const event = {
    content: text,
    kind: Kind.Text,
    tags,
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return new Promise<SendNoteResult>((resolve) => {
    sendEvent(event, {
      success: (noteEvent) => {
        if (noteEvent) {
          // On the worker path the event is imported centrally on EVENT_SENT
          // (see the relayWorker listener in App.tsx). Only the proxy path,
          // which broadcasts directly and emits no EVENT_SENT, needs us to
          // import it explicitly here — otherwise the event is imported twice.
          if (accountStore.proxyThroughPrimal) {
            triggerImportEvents([noteEvent], `import_${APP_ID}`);
          }
          resolve({ success: true, note: noteEvent });
          return;
        }

        resolve({ success: false, reasons: ['failed-to-publish']});
      },
      fail: (noteEvent) => {
        resolve({ success: false, note: noteEvent });
      }
    });
  })
}

export const sendArticle = async (articleData: ArticleEdit, tags: string[][]) => {
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

  return await sendEvent(event);
}

export const sendPoll = (
  question: string,
  kind: Kind.UserPoll | Kind.ZapPoll,
  tags: string[][],
  created_at?: number,
  waitForImport?: boolean,
) => {
  const event = {
    content: question,
    kind,
    tags,
    created_at: created_at || Math.floor((new Date()).getTime() / 1000),
  };


  // signEvent(event).then((se => {
  //   console.log('EVENT: ', se);
  // }))

  // if (kind !== Kind.UserPoll) {
    // return new Promise<SendNoteResult>((resolve) => {
    //   resolve({ success: false });
    // });
  // }

  return new Promise<SendNoteResult>((resolve) => {
    sendEvent(event, {
      success: (pollEvent) => {
        if (pollEvent) {
          const then = waitForImport ? () => { resolve({ success: true, note: pollEvent })} : () => {};
          triggerImportEvents([pollEvent], `import_${APP_ID}`, then)
          !waitForImport && resolve({ success: true, note: pollEvent });
          return;
        }

        resolve({ success: false, reasons: ['failed-to-publish']});
      },
      fail: (pollEvent) => {
        resolve({ success: false, note: pollEvent });
      }
    });
  })
}
export const sendUserPollVote = async (poll: PrimalUserPoll, choice: PrimalPollChoice) => {
  const event = {
    content: '',
    kind: Kind.UserPollVote,
    tags: [
      ['e', poll.id],
      ['response', choice.id],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const event_from_user = await signEvent(event);

  sendMessage(JSON.stringify([
    "REQ",
    `vote_${choice.id}_${APP_ID}`,
    {cache: ["import_poll_vote_event", { event_from_user }]},
  ]));
}

export const generateIdentifier = (title: string) => {
  let str = title.toLowerCase();

  return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

export const sendDeleteEvent = async (
  pubkey: string,
  eventId: string,
  kind: number,
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

  const response = await sendEvent(ev);

  return response;
};

export const sendDraft = async (
  user: PrimalUser,
  article: ArticleEdit,
  mdContent: string,
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
      ['client', 'Primal Web'],
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
      ['client', 'Primal Web'],
      // ["e", "<anchor event event id>", "<relay-url>"],
      // ["a", "<anchor event address>", "<relay-url>"],
    ],
    content: e,
    // other fields
  }

  const response = await sendEvent(draft);

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

//   return await sendEvent(event);
// }

export const sendContacts = async (tags: string[][], date: number, content: string) => {
  const event = {
    content,
    kind: Kind.Contacts,
    tags: [...tags],
    created_at: date,
  };

  return await sendEvent(event);
};

export const sendMuteList = async (muteList: string[][], date: number, content: string) => {
  const event = {
    content,
    kind: Kind.MuteList,
    tags: muteList,
    created_at: date,
  };

  return await sendEvent(event);
};

export const sendStreamMuteList = async (muteList: string[][], date: number, content: string) => {
  const event = {
    content,
    kind: Kind.StreamMuteList,
    tags: muteList,
    created_at: date,
  };

  return await sendEvent(event);
};
export const broadcastEvent = async (event: NostrRelaySignedEvent) => {
  // const relays = accountStore.activeRelays;
  // const relaySettings = accountStore.relaySettings;
  // const shouldProxy = accountStore.proxyThroughPrimal;

  // if (shouldProxy) {
  //   return await proxyEvent(event, relays, relaySettings);
  // }

  // let responses = [];
  // let reasons: string[] = [];

  // for (let i = 0;i < relays.length;i++) {
  //   const relay = relays[i];

  //   const settings = (relaySettings && relaySettings[relay]) || { read: true, write: true };

  //   if (!settings.write) {
  //     continue;
  //   }

  //   responses.push(new Promise<string>((resolve, reject) => {
  //     const timeout = setTimeout(() => {
  //       logError(`Publishing post to ${relay} has timed out`);
  //       reasons.push('timeout');
  //       reject('timeout');
  //     }, 8_000);

  //     try {
  //       let pub = relay.publish(event);

  //       logInfo('publishing to relay: ', relay)

  //       pub.on('ok', () => {
  //         logInfo(`${relay.url} has accepted our event`);
  //         clearTimeout(timeout);
  //         resolve('success');
  //       });

  //       pub.on('failed', (reason: any) => {
  //         logError(`failed to publish to ${relay.url}: ${reason}`)
  //         clearTimeout(timeout);
  //         reasons.push(reason);
  //         reject('failed');
  //       });

  //     } catch (e) {
  //       logError('Failed publishing note: ', e);
  //       clearTimeout(timeout);
  //       reasons.push(`${e}`);
  //       reject(e);
  //     }
  //   }));
  // }

  // try {
  //   await Promise.any(responses);
  //   return { success: true, note: event } as SendNoteResult;
  // }
  // catch (e) {
  //   logError('Error broadcasting note: ', e);
  //   return { success: false, reasons, note: event} as SendNoteResult;
  // }
  return { success: false }
};

export const sendSignedEvent = (event: NostrRelaySignedEvent, callbacks?: { success?: (event?: NostrRelaySignedEvent) => void, fail?: (event?: NostrRelaySignedEvent) => void}) => {
  const relays = [...accountStore.activeRelays];

  // Relay hints fromm `e` tags
  const hintRelayUrls = event.tags.reduce((acc, t) => {
    if (
      t[0] === 'e' &&
      t[2] &&
      t[2].length > 0 &&
      !relays.find(r => r === t[2])
    ) {
      return [ ...acc, t[2] ];
    }

    return [...acc];
  }, []);

  const allRelays = [
    ...relays.map(r => r),
    ...hintRelayUrls,
  ];

  if (callbacks) {
    const onSuccess = (e: MessageEvent<{ type: string, event: NostrRelaySignedEvent, reason?: any }>) => {
      const { type, event: rEvent, reason } = e.data;

      if (type === 'EVENT_SENT' && rEvent.id === event.id) {
        callbacks.success?.(rEvent);
        relayWorker.removeEventListener('message', onSuccess);
        return;
      }

      if (type === 'EVENT_NOT_SENT' && rEvent.id === event.id) {
        updateAccountStore('sendErrors', () => ({ [rEvent.id]: `${reason}` }));
        callbacks.success?.(rEvent);
        relayWorker.removeEventListener('message', onSuccess);
        return;
      }
    }

    relayWorker.addEventListener('message', onSuccess);
  }

  relayWorker.postMessage({type: 'SEND_EVENT', eventData: { event: unwrap(event), relays: allRelays }});
}

export const sendEvent = async (event: NostrEvent, callbacks?: { success?: (event?: NostrRelaySignedEvent) => void, fail?: (event?: NostrRelaySignedEvent) => void}) => {
  const relays = accountStore.activeRelays;
  const relaySettings = accountStore.relaySettings;
  const shouldProxy = accountStore.proxyThroughPrimal;

  signEvent(event).then(async (signedNote) => {
    if (!signedNote) return { success: false , reasons: ['event_not_signed']} as SendNoteResult;

    if (shouldProxy) {
      try {
        enqueEvent(signedNote);
        await proxyEvent(signedNote, relays, relaySettings);
        dequeEvent(signedNote);
        callbacks?.success && callbacks.success(signedNote);
      }
      catch (reasons) {
        callbacks?.fail && callbacks.fail(signedNote);
      }
      return;
    }

    sendSignedEvent(signedNote, callbacks);
  }).catch((reason) => {
    logWarning('EVENT FAILED REASON: ', reason);
  })

  return { success: true, note: event } as SendNoteResult;

  // let signedNote: NostrRelaySignedEvent | undefined;

  // try {
  //   signedNote = await signEvent(event);
  //   if (!signedNote) throw('event_not_signed');
  // } catch (reason) {
  //   logError('Failed to send event: ', reason);
  //   return { success: false , reasons: [reason]} as SendNoteResult;
  // }

  // if (shouldProxy) {
  //   return await proxyEvent(signedNote, relays, relaySettings);
  // }

  // sendSignedEvent(signedNote, callbacks);

  // return { success: true, note: signedNote } as SendNoteResult;
}

export const triggerImportEvents = (events: NostrRelaySignedEvent[], subId: string, then?: () => void) => {

  let settled = false;
  let timeout: ReturnType<typeof setTimeout>;

  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    unsub();
    then && then();
  };

  const unsub = subsTo(subId, {
    onEose: () => finish(),
  });

  // Safety net: a missing or very late EOSE from the import must not block the
  // caller (and therefore the user's post-success feedback) indefinitely.
  timeout = setTimeout(finish, 8000);

  importEvents(events, subId);
};

export type PollVote = {
  user: PrimalUser,
  msg: NostrNoteContent,
  tags: string[][],
  id: string,
  pubkey: string,
  response: string,
  amount?: number,
  message?: string,
}

export const getPollVotes = (pollId: string, option: string, subId: string, paging?: FeedPaging) => {

  return new Promise<MegaFeedResults>((resolve) => {
    let page: MegaFeedPage = {...emptyMegaFeedPage()};

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        content && updateFeedPage(page, content);
      },
      onEose: () => {
        unsub();
        resolve(pageResolve(page));
      },
      onNotice: (_, reason) => {
        unsub();
        resolve({ ...emptyMegaFeedResults() });
      }
    });

    const until = paging?.until || 0;
    const since = paging?.since || 0;
    const limit = paging?.limit || 0;

    let offset = 0;

    if (typeof paging?.offset === 'number') {
      offset = paging.offset;
    }
    else if (Array.isArray(paging?.offset)) {
      if (until > 0) {
        offset = (paging?.offset || []).filter(v => v === until).length;
      }

      if (since > 0) {
        offset = (paging?.offset || []).filter(v => v === since).length;
      }
    }


    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["poll_votes", { event_id: pollId, option, limit, offset }]},
    ]));
  });
};


export const getZapPollVotes = (pollId: string, option: string, subId: string, paging?: FeedPaging) => {

  return new Promise<PollVote[]>((resolve) => {

    let users: Record<string, any> = {};
    let zaps: any[] = [];
    let elements: string[] = [];


    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.FeedRange) {
          elements = (JSON.parse(content.content) || { elements: []}).elements as string[];
        }
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users[content.pubkey] = { ...user };

          return;
        }

        if (content?.kind === Kind.Zap) {
          const zapTag = content.tags.find(t => t[0] === 'description');

          if (!zapTag) return;

          const zapInfo = JSON.parse(zapTag[1] || '{}');

          let amount = '0';

          let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

          if (bolt11Tag) {
            try {
              amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
            } catch (e) {
              const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

              amount = amountTag ? amountTag[1] : '0';
            }
          }

          zaps.push({
            amount,
            pubkey: zapInfo.pubkey,
            receiver: (zapInfo.tags.find((t: string[]) => t[0] === 'p') || ['p', ''])[1],
            message: zapInfo.content,
            tags: [ ...zapInfo.tags ],
            msg: { ...zapInfo },
          })

          return;
        }
      },
      onEose: () => {
        const zapData = zaps.map((zap => ({
          ...zap,
          amount: parseInt(zap.amount || '0'),
          sender: users[zap.pubkey],
        })));

        const pollVotes: PollVote[] = zaps.reduce<PollVote[]>((acc, zap) => {
          const vote: PollVote = {
            user: users[zap.pubkey] || emptyUser(zap.pubkey),
            msg: {...zap.msg},
            tags: [...zap.tags],
            id: zap.msg.id,
            pubkey: zap.receiver,
            response: (zap.tags.find((t: string[]) => t[0] === 'poll_option') || ['poll_option', ''])[1],
            amount: zap.amount,
            message: zap.message,
          };

          return [...acc, vote];
        }, []);

        resolve(pollVotes)
        unsub();
      },
    });

    const until = paging?.until || 0;
    const since = paging?.since || 0;
    const limit = paging?.limit || 0;

    let offset = 0;

    if (typeof paging?.offset === 'number') {
      offset = paging.offset;
    }
    else if (Array.isArray(paging?.offset)) {
      if (until > 0) {
        offset = (paging?.offset || []).filter(v => v === until).length;
      }

      if (since > 0) {
        offset = (paging?.offset || []).filter(v => v === since).length;
      }
    }


    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["poll_votes", { event_id: pollId, option, limit, offset }]},
    ]));
  });
}

export const getEventReactions = (eventId: string, kind: number, subid: string, offset = 0) => {
  let event_id: string | undefined = eventId;
  let pubkey: string | undefined;
  let identifier: string | undefined;

  if (eventId.startsWith('note1')) {
    event_id = npubToHex(eventId);
  }

  if (eventId.startsWith('naddr')) {
    const decode = decodeIdentifier(event_id) as DecodedNaddr;

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
    const decode = decodeIdentifier(event_id) as DecodedNaddr;

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
    const decode = decodeIdentifier(event_id) as DecodedNaddr;

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
          id = event.id || '';
        }
      },
      onEose: () => {
        unsub();
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
