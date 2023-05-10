import DOMPurify from "dompurify";
import { getLinkPreview } from "link-preview-js";
import { Relay } from "nostr-tools";
import { createStore } from "solid-js/store";
import { Kind } from "../constants";
import { NostrWindow, PrimalNote } from "../types/primal";

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

export const sanitize = DOMPurify.sanitize;

export const [linkPreviews, setLinkPreviews] = createStore<Record<string, any>>({});

export const addLinkPreviews = async (url: string) => {
  try {
    const preview = await getLinkPreview(url);

    setLinkPreviews((p) => ({ ...p, [url]: { ...preview }}));

  } catch (e) {
    console.log('Failed to get preview for: ', url);
    setLinkPreviews((p) => ({ ...p, [url]: { noPreview: url }}));
  }
};

export const spotifyRegex = /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;
export const twitchRegex = /twitch.tv\/([a-z0-9_]+$)/i;
export const mixCloudRegex = /mixcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;
// export const tidalRegex = /tidal\.com\/(?:browse\/)?(\w+)\/([a-z0-9-]+)/i;
export const soundCloudRegex = /soundcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;
// export const tweetUrlRegex = /https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/;
export const appleMusicRegex = /music\.apple\.com\/([a-z]{2}\/)?(?:album|playlist)\/[\w\d-]+\/([.a-zA-Z0-9-]+)(?:\?i=\d+)?/i;
export const nostrNestsRegex = /nostrnests\.com\/[a-zA-Z0-9]+/i;
// export const magnetRegex = /(magnet:[\S]+)/i;
export const wavlakeRegex = /(?:player\.)?wavlake\.com\/(track\/[.a-zA-Z0-9-]+|album\/[.a-zA-Z0-9-]+|[.a-zA-Z0-9-]+)/i;
// export const odyseeRegex = /odysee\.com\/([a-zA-Z0-9]+)/;
export const youtubeRegex = /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/;

export const urlify = (text: string, highlightOnly = false) => {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,8}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  return text.replace(urlRegex, (url) => {
    const isImage = url.includes('.jpg')|| url.includes('.jpeg')|| url.includes('.webp') || url.includes('.png') || url.includes('.gif') || url.includes('format=png');

    if (isImage) {
      return '<img src="' + url + '" class="postImage"/>'
    }

    const isMp4Video = url.includes('.mp4') || url.includes('.mov');

    if (isMp4Video) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    const isOggVideo = url.includes('.ogg');

    if (isOggVideo) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    const isWebmVideo = url.includes('.webm');

    if (isWebmVideo) {
      return `<video class="w-max" controls><source src="${url}" type="video/mp4"></video>`;
    }

    if (youtubeRegex.test(url)) {
      const youtubeId = youtubeRegex.test(url) && RegExp.$1;

      return `<iframe
        class="w-max"
        src="https://www.youtube.com/embed/${youtubeId}"
        title="YouTube video player"
        key="${youtubeId}"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />`;
    }

    if (spotifyRegex.test(url)) {
      const convertedUrl = url.replace(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/, "/embed/$1/$2");

      return `<iframe style="borderRadius: 12" src="${convertedUrl}" width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    }

    if (twitchRegex.test(url)) {
      const channel = url.split("/").slice(-1);

      const args = `?channel=${channel}&parent=${window.location.hostname}&muted=true`;
      return `<iframe src="https://player.twitch.tv/${args}" className="w-max" allowFullScreen></iframe>`;
    }

    if (mixCloudRegex.test(url)) {
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
          />`;
    }

    if (soundCloudRegex.test(url)) {
      return `<iframe
          width="100%"
          height="166"
          scrolling="no"
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=${url}"></iframe>`;
    }

    if (appleMusicRegex.test(url)) {
      const convertedUrl = url.replace("music.apple.com", "embed.music.apple.com");
      const isSongLink = /\?i=\d+$/.test(convertedUrl);

      return `
        <iframe
          allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
          frameBorder="0"
          height="${isSongLink ? 175 : 450}"
          style="width: 100%, maxWidth: 660, overflow: hidden, background: transparent"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          src="${convertedUrl}"></iframe>
      `;
    }

    if (nostrNestsRegex.test(url)) {
      return `<iframe src="${url}" allow="microphone" width="480" height="680" style="maxHeight: 680"></iframe>`;
    }

    if (wavlakeRegex.test(url)) {
      const convertedUrl = url.replace(/(?:player\.)?wavlake\.com/, "embed.wavlake.com");

      return `
        <iframe
          style="borderRadius: 12"
          src="${convertedUrl}"
          width="100%"
          height="380"
          frameBorder="0"
          loading="lazy"></iframe>`;
    }

    if (highlightOnly) {
      return `<span class="linkish">${url}</span>`;
    }

    addLinkPreviews(url);

    return `__LINK__${url}__LINK__`;
  })
}

export const addlineBreaks = (text: string) => {
  const regex = /(\r\n|\r|\n)/g;

  return text.replaceAll(regex, '<br> ');
};

export const highlightHashtags = (text: string) => {
  const regex = /(^|\s)(#[a-z\d-]+)/ig;

  return text.replace(regex, "$1<span class='hash_tag'>$2</span>");
};

export const parseNote1 = (content: string) => urlify(addlineBreaks(content));
export const parseNote2 = (content: string) => urlify(addlineBreaks(content), true);

type ReplyTo = { e?: string, p?: string };
type NostrEvent = { content: string, kind: number, tags: string[][], created_at: number };

export const sendLike = async (note: PrimalNote, relays: Relay[]) => {
  const event = {
    content: '+',
    kind: Kind.Reaction,
    tags: [
      ['e', note.post.id],
      ['p', note.post.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays);

}

export const sendRepost = async (note: PrimalNote, relays: Relay[]) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: Kind.Repost,
    tags: [
      ['e', note.post.id],
      ['p', note.user.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays);
}


export const sendNote = async (text: string, relays: Relay[], tags: string[][]) => {
  const event = {
    content: text,
    kind: Kind.Text,
    tags,
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays);
}

export const sendContacts = async (contacts: string[], date: number, content: string, relays: Relay[]) => {
  const event = {
    content,
    kind: Kind.Contacts,
    tags: contacts.map(c => ['p', c]),
    created_at: date,
  };

  return await sendEvent(event, relays);
};

const sendEvent = async (event: NostrEvent, relays: Relay[]) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr === undefined) {
    return false;
  }

  const signedNote = await nostr.signEvent(event);

  return new Promise<boolean>((resolve) => {
    const numberOfRelays = relays.length;
    let failed = 0;

    relays.forEach(relay => {
      try {
        let pub = relay.publish(signedNote);

        pub.on('ok', () => {
          console.log(`${relay.url} has accepted our event`);
          resolve(true);
        });

        pub.on('failed', (reason: any) => {
          console.log(`failed to publish to ${relay.url}: ${reason}`)
          failed += 1;
          if (failed >= numberOfRelays) {
            resolve(false);
          }
        });
      } catch (e) {
        console.log('Failed sending note: ', e);
        failed += 1;
        if (failed >= numberOfRelays) {
          resolve(false);
        }
      }
    });

  });
}
