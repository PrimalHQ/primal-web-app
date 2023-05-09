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

    const isYouTubeVideo = url.includes('https://www.youtube.com') || url.includes('https://youtu.be');

    if (isYouTubeVideo) {
      const full = new URL(url);
      const videoId = url.includes('/watch?v=') ? full.searchParams.get('v') : full.pathname.split('/')[full.pathname.split('/').length - 1];
      const source = `https://www.youtube.com/embed/${videoId}`
      return `<iframe class="w-max" src="${source}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen=""></iframe>`;
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
