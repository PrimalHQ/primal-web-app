import { nip19 } from "nostr-tools";
import { Kind } from "../constants";
import { hexToNpub } from "../lib/keys";
import { logError } from "../lib/logger";
import { sanitize } from "../lib/notes";
import { RepostInfo, NostrNoteContent, FeedPage, PrimalNote, PrimalRepost, NostrEventContent, NostrEOSE, NostrEvent, PrimalUser } from "../types/primal";
import { convertToUser, emptyUser } from "./profile";


export const getRepostInfo: RepostInfo = (page, message) => {
  const user = page?.users[message.pubkey];
  const userMeta = JSON.parse(user?.content || '{}');
  const stat = page?.postStats[message.id];

  const noActions = {
    event_id: message.id,
    liked: false,
    replied: false,
    reposted: false,
    zapped: false,
  };

  return {
    user: {
      id: user?.id || '',
      pubkey: user?.pubkey || message.pubkey,
      npub: hexToNpub(user?.pubkey || message.pubkey),
      name: (userMeta.name || user?.pubkey) as string,
      about: (userMeta.about || '') as string,
      picture: (userMeta.picture || '') as string,
      nip05: (userMeta.nip05 || '') as string,
      banner: (userMeta.banner || '') as string,
      displayName: (userMeta.display_name || '') as string,
      location: (userMeta.location || '') as string,
      lud06: (userMeta.lud06 || '') as string,
      lud16: (userMeta.lud16 || '') as string,
      website: (userMeta.website || '') as string,
      tags: user?.tags || [],
    },
    note: {
      id: message.id,
      pubkey: message.pubkey,
      created_at: message.created_at || 0,
      tags: message.tags,
      content: sanitize(message.content),
      sig: message.sig,
      likes: stat?.likes || 0,
      mentions: stat?.mentions || 0,
      reposts: stat?.reposts || 0,
      replies: stat?.replies || 0,
      zaps: stat?.zaps || 0,
      score: stat?.score || 0,
      score24h: stat?.score24h || 0,
      satszapped: stat?.satszapped || 0,
      noteId: nip19.noteEncode(message.id),
      noteActions: (page.noteActions && page.noteActions[message.id]) || noActions,
    },
  }
};

export const isRepostInCollection = (collection: NostrNoteContent[], repost: NostrNoteContent) => {

  const otherTags = collection.reduce((acc: string[][], m) => {
    if (m.kind !== Kind.Repost) return acc;

    const t = m.tags.find(t => t[0] === 'e');

    if (!t) return acc;

    return [...acc, t];
  }, []);

  if (repost.kind === Kind.Repost) {
    const tag = repost.tags.find(t => t[0] === 'e');

    return tag && !!otherTags.find(t => t[1] === tag[1]);
  }

  if (repost.kind === Kind.Text) {
    const id = repost.id;

    return !!otherTags.find(t => t[1] === id);
  }

  return false;

};

export const isInTags = (tags: string[][], tagName: string, value: string) => {
  return !!tags.find(tag => tag[0] === tagName && tag[1] === value);
}

export const parseEmptyReposts = (page: FeedPage) => {
  let reposts: Record<string, string> = {};

  page.messages.forEach(message => {
    if (message.kind === 6 && message.content.length === 0) {
      const tag = message.tags.find(t => t[0] === 'e');
      if (tag) {
        reposts[tag[1]] = message.id;
      }
    }
  });

  return reposts;
};

const parseKind6 = (message: NostrNoteContent) => {
  try {
    return JSON.parse(message.content);
  } catch (e) {
    return {
      kind: 1,
      content: '',
      id: message.id,
      created_at: message.created_at,
      pubkey: message.pubkey,
      sig: message.sig,
      tags: message.tags,
    }
  }
};

// const getNoteReferences = (message: NostrNoteContent) => {
//   const regex = /\#\[([0-9]*)\]/g;
//   let refs = [];
//   let match;

//   while((match = regex.exec(message.content)) !== null) {
//     refs.push(match[1]);
//   }

//   return refs.reduce<string[]>((acc, ref) => {
//     const tag = message.tags[parseInt(ref)] || [];

//     return tag[0] === 'e' ? [...acc, tag[1]] : acc;
//   }, []);
// };

// const getUserReferences = (message: NostrNoteContent) => {
//   const regex = /\#\[([0-9]*)\]/g;
//   let refs = [];
//   let match;

//   while((match = regex.exec(message.content)) !== null) {
//     refs.push(match[1]);
//   }

//   return refs.reduce<string[]>((acc, ref) => {
//     const tag: string[] = message.tags[parseInt(ref)] || [];

//     return tag[0] === 'p' ? [...acc, tag[1]] : acc;
//   }, []);
// };

type ConvertToNotes = (page: FeedPage | undefined) => PrimalNote[];

export const convertToNotes: ConvertToNotes = (page) => {

  if (page === undefined) {
    return [];
  }

  const mentions = page.mentions || {};

  return  page.messages.map((message) => {
    const msg: NostrNoteContent = message.kind === Kind.Repost ? parseKind6(message) : message;

    const user = page?.users[msg.pubkey];
    const stat = page?.postStats[msg.id];

    let userMeta: any = {};

    try {
      userMeta = JSON.parse(user?.content || '{}');
    } catch (e) {
      logError('Error in user meta JSON: ', e);
      userMeta = {};
    }

    const mentionIds = Object.keys(mentions) //message.tags.reduce((acc, t) => t[0] === 'e' ? [...acc, t[1]] : acc, []);
    const userMentionIds = msg.tags?.reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);

    const repost = message.kind === Kind.Repost ? getRepostInfo(page, message) : undefined;

    let replyTo: string[] | undefined;

    const tgs = msg.tags || [];

    // Determine parent by finding the `e` tag with `reply` then `root` as `marker`
    // If both fail return the last `e` tag
    for (let i=0; i<tgs.length; i++) {
      const tag = tgs[i];

      if (tag[0] !== 'e') continue;

      if (tag[3] === 'mention') continue;

      if (tag[3] === 'reply') {
        replyTo = [...tag];
        break;
      }

      if (tag[3] === 'root') {
        replyTo = [...tag];
        continue;
      }
    }

    if (!replyTo) {
      const eTags = tgs.filter(t => t[0] === 'e' && t[3] !== 'mention');

      if (eTags.length === 1) {
        replyTo = [...eTags[0]];
      }
      else if (eTags.length > 1){
        replyTo = [...eTags[eTags.length - 1]];
      }
    }

    let mentionedNotes: Record<string, PrimalNote> = {};
    let mentionedUsers: Record<string, PrimalUser> = {};

    if (mentionIds.length > 0) {
      for (let i = 0;i<mentionIds.length;i++) {
        const id = mentionIds[i];
        const m = mentions && mentions[id];

        if (!m) {
          continue;
        }

        for (let i = 0;i<m.tags.length;i++) {
          const t = m.tags[i];
          if (t[0] === 'p') {
            mentionedUsers[t[1]] = convertToUser(page.users[t[1]] || emptyUser(t[1]));
          }
        }

        mentionedNotes[id] = {
          // @ts-ignore TODO: Investigate this typing
          post: { ...m },
          user: convertToUser(page.users[m.pubkey] || emptyUser(m.pubkey)),
          mentionedUsers,
        };
      }
    }

    if (userMentionIds && userMentionIds.length > 0) {
      for (let i = 0;i<userMentionIds.length;i++) {
        const id = userMentionIds[i];
        const m = page.users && page.users[id];

        mentionedUsers[id] = convertToUser(m || emptyUser(id));
      }
    }

    const noActions = {
      event_id: msg.id,
      liked: false,
      replied: false,
      reposted: false,
      zapped: false,
    };

    return {
      user: {
        id: user?.id || '',
        pubkey: user?.pubkey || msg.pubkey,
        npub: hexToNpub(user?.pubkey || msg.pubkey),
        name: (userMeta.name || user?.pubkey || '') as string,
        about: (userMeta.about || '') as string,
        picture: (userMeta.picture || '') as string,
        nip05: (userMeta.nip05 || '') as string,
        banner: (userMeta.banner || '') as string,
        displayName: (userMeta.display_name || '') as string,
        location: (userMeta.location || '') as string,
        lud06: (userMeta.lud06 || '') as string,
        lud16: (userMeta.lud16 || '') as string,
        website: (userMeta.website || '') as string,
        tags: user?.tags || [],
      },
      post: {
        id: msg.id,
        pubkey: msg.pubkey,
        created_at: msg.created_at || 0,
        tags: msg.tags,
        content: sanitize(msg.content),
        sig: msg.sig,
        likes: stat?.likes || 0,
        mentions: stat?.mentions || 0,
        reposts: stat?.reposts || 0,
        replies: stat?.replies || 0,
        zaps: stat?.zaps || 0,
        score: stat?.score || 0,
        score24h: stat?.score24h || 0,
        satszapped: stat?.satszapped || 0,
        noteId: nip19.noteEncode(msg.id),
        noteActions: (page.noteActions && page.noteActions[msg.id]) ?? noActions,
      },
      repost,
      msg,
      mentionedNotes,
      mentionedUsers,
      replyTo: replyTo && replyTo[1],
    };
  });
}

const sortBy = (a: PrimalNote, b: PrimalNote, property: string) => {

  const aData: Record<string, any> = a.repost ? a.repost.note : a.post;
  const bData: Record<string, any> = b.repost ? b.repost.note : b.post;

  return bData[property] - aData[property];
};

export const sortByRecency = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = sortBy(a, b, 'created_at');

    return reverse ? -1 * order : order;
  });
};

export const sortByScore24h = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = sortBy(a, b, 'score24h');

    return reverse ? -1 * order : order;
  });
};

export const sortByScore = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = sortBy(a, b, 'score');

    return reverse ? -1 * order : order;
  });
};

export const sortByZapped = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = sortBy(a, b, 'satszapped');

    return reverse ? -1 * order : order;
  });
};

export const sortingPlan = (topic: string = '') => {
  const sortingFunctions: Record<string, Function> = {
    trending: sortByScore24h,
    popular: sortByScore,
    latest: sortByRecency,
    mostzapped: sortByZapped,
    mostzapped4h: sortByZapped,
  }

  const plan = topic || 'latest';

  return sortingFunctions[plan] || sortingFunctions['latest'];
};


export const paginationPlan = (criteria: string) => {
  const pagCriteria: Record<string, string> = {
    trending: 'score24h',
    popular: 'score',
    latest: 'created_at',
    mostzapped: 'satszapped',
    mostzapped4h: 'satszapped',
  }

  const plan = criteria || 'latest';

  return pagCriteria[plan] || pagCriteria['latest'];
}

type NoteStore = {
  notes: PrimalNote[],
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
}

export const referencesToTags = (value: string) => {
  const regexHashtag = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/ig;
  const regexMention =
    /\bnostr:((note|npub|nevent|nprofile)1\w+)\b|#\[(\d+)\]/g;

  let refs: string[] = [];
  let tags: string[][] = [];
  let match;

  // Parse hashtags to add to tags
  while((match = regexHashtag.exec(value)) != null) {
    tags.push(['t', match[0].trim().slice(1)]);
  }

  // Parse mentions to add to tags
  while((match = regexMention.exec(value)) !== null) {
    refs.push(match[0]);
  }

  refs.forEach((ref) => {
    const decoded = nip19.decode(ref.split('nostr:')[1]);

    if (decoded.type === 'npub') {
      tags.push(['p', decoded.data, '', 'mention'])
      return;
    }

    if (decoded.type === 'nprofile') {
      const relay = decoded.data.relays ? decoded.data.relays[0] : '';
      tags.push(['p', decoded.data.pubkey, relay, 'mention']);
      return;
    }

    if (decoded.type === 'note') {
      tags.push(['e', decoded.data, '', 'mention']);
      return;
    }

    if (decoded.type === 'nevent') {
      const relay = decoded.data.relays ? decoded.data.relays[0] : '';
      tags.push(['e', decoded.data.id, relay, 'mention']);
      return;
    }
  });

  return tags;

};
