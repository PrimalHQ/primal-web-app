import { Event, Relay } from "nostr-tools";
import { noteEncode } from "nostr-tools/nip19";
import { createStore, SetStoreFunction } from "solid-js/store";
import { useFeedContext } from "../contexts/FeedContext";
import { FeedStore, NostrWindow, PrimalNote } from "../types/primal";
import { getThread } from "./feed";
import { getUserProfile } from "./profile";

const getLikesStorageKey = () => {
  const key = localStorage.getItem('pubkey') || 'anon';
  return `likes_${key}`;
};

const getStoredLikes = () => {
  return JSON.parse(localStorage.getItem(getLikesStorageKey()) || '[]');
};

const setStoredLikes = (likes: string[]) => {
  return localStorage.setItem(getLikesStorageKey(), JSON.stringify(likes));
};

export const [likedNotes, setLikedNotes] = createStore(getStoredLikes());

export const urlify = (text: string) => {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  return text.replace(urlRegex, function(url) {
    const isImage = url.includes('.jpg')|| url.includes('.jpeg')|| url.includes('.webp') || url.includes('.png') || url.includes('.gif') || url.includes('format=png');

    if (isImage) {
      return '<img src="' + url + '" class="postImage"/>'
    }

    const isMp4Video = url.includes('.mp4');

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
      const videoId = url.includes('/watch?v=') ? full.searchParams.get('v') : full.pathname.substring(1);
      const source = `https://www.youtube.com/embed/${videoId}`
      return `<iframe class="w-max" src="${source}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen=""></iframe>`;
    }

    return `<a href="${url}" target="_blank" >${url}</a>`;
  })
}

export const addlineBreaks = (text: string) => {
  const regex = /(\r\n|\r|\n)/g;

  return text.replace(regex, '<br>');
};

export const highlightHashtags = (text: string) => {
  const regex = /(^|\s)(#[a-z\d-]+)/ig;

  return text.replace(regex, "$1<span class='hash_tag'>$2</span>");
};

const nostrify = (text: string, note: PrimalNote, skipNotes: boolean) => {

  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;
  // let nostrifiedText = `${text}`;

  while((match = regex.exec(text)) !== null) {
    refs.push(match[1]);
  }

  if (refs.length > 0) {
    refs.forEach(ref => {
      const tag = note.post.tags[ref];
      if (tag[0] === 'p') {
        getUserProfile(tag[1], `mentioned_user_|_${note.post.noteId}_|_${ref}`)
        // nostrifiedText = nostrifiedText.replaceAll(`#[${ref}]`, `[[UR ${tag[1]}]]`)
      }

      if (!skipNotes && tag[0] === 'e') {
        const mId = noteEncode(tag[1]);
        getThread(mId, `mentioned_post_|_${note.post.noteId}_|_${ref}_|_${mId}`, 0, 1);
        // nostrifiedText = nostrifiedText.replaceAll(`#[${ref}]`, `[[ER ${tag[1]}]]`)
      }
    });
  }
  // return nostrifiedText;
  return text;

};

export const parseNote = (note: PrimalNote, skipNotes = false) => highlightHashtags(urlify(addlineBreaks(nostrify(note.post.content, note, skipNotes))));

type ReplyTo = { e?: string, p?: string };
type NostrEvent = { content: string, kind: number, tags: string[][], created_at: number };

const parseReplyTo = (replyTo?: ReplyTo) => {
  let ret: string[][] = [];

  if (!replyTo) {
    return ret;
  }

  if (replyTo.e) {
    ret.push(['e', replyTo.e]);
  }

  if (replyTo.p) {
    ret.push(['p', replyTo.p]);
  }

  return ret;

};

export const sendLike = async (note: PrimalNote, relays: Relay[], setData: SetStoreFunction<FeedStore>) => {
  const event = {
    content: '+',
    kind: 7,
    tags: [
      ['e', note.post.id],
      ['p', note.post.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const likes = getStoredLikes();

  if (likes.includes(note.post.id)) {
    return;
  }

  const success = await sendEvent(event, relays);

  if (success) {
    setStoredLikes([...likes, note.post.id]);

    setLikedNotes(ls => [...ls, note.post.id]);

    setData('posts', p => p.post.id === note.post.id, 'post', 'likes', (l) => l+1);
  }

}

export const sendNote = (text: string, relays: Relay[], replyTo?: ReplyTo) => {
  const tags = parseReplyTo(replyTo);

  const event = {
    content: text,
    kind: 1,
    tags,
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  sendEvent(event, relays);
}

export const sendRepost = async (note: PrimalNote, relays: Relay[], setData: SetStoreFunction<FeedStore>) => {
  const event = {
    content: JSON.stringify(note.msg),
    kind: 6,
    tags: [
      ['e', note.post.id],
      ['p', note.user.pubkey],
    ],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const success = await sendEvent(event, relays);

  // if (success) {
  //   setData('posts', p => p.post.id === note.post.id, 'post', 'mentions', (l) => l+1);
  // }
}


export const getLikes = (userId: string, relays: Relay[]) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr !== undefined) {
    try {
      // const signedNote = await nostr.signEvent(event);

      relays?.forEach(relay => {

        const sub = relay.sub([
          {
            kinds: [7],
            authors: [userId],
          },
        ]);

        sub.on('event', (event: Event) => {
          const likes = getStoredLikes();
          const e = event.tags.find(t => t[0] === 'e');

          if (!e || likes.includes(e[1])) {
            return;
          }

          setStoredLikes([ ...likes, e[1]]);
          setLikedNotes(ls => [...ls, e[1]]);
        })
        sub.on('eose', () => {
          sub.unsub();
        })
      });

    } catch (e) {
      console.log('Failed sending note: ', e);
    }
  }
};

const sendEvent = async (event: NostrEvent, relays: Relay[]) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr !== undefined) {
    try {
      const signedNote = await nostr.signEvent(event);

      relays?.forEach(relay => {
        let pub = relay.publish(signedNote)
        pub.on('ok', () => {
          console.log(`${relay.url} has accepted our event`)
        })
        pub.on('seen', () => {
          console.log(`we saw the event on ${relay.url}`)
        })
        pub.on('failed', reason => {
          console.log(`failed to publish to ${relay.url}: ${reason}`)
        })
      });

      return true;

    } catch (e) {
      console.log('Failed sending note: ', e);
      return false;
    }
  }

  return false;
}
