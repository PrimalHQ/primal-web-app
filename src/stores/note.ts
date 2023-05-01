import DOMPurify from "dompurify";
import { noteEncode } from "nostr-tools/nip19";
import { SetStoreFunction } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind } from "../constants";
import { getEvents } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { RepostInfo, NostrNoteContent, FeedPage, PrimalNote, PrimalRepost, NostrEventContent, NostrEOSE, NostrEvent } from "../types/primal";
import { convertToUser, emptyUser } from "./profile";


export const getRepostInfo: RepostInfo = (page, message) => {
  const user = page?.users[message.pubkey];
  const userMeta = JSON.parse(user?.content || '{}');
  const stat = page?.postStats[message.id];

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
      content: DOMPurify.sanitize(message.content),
      sig: message.sig,
      likes: stat?.likes || 0,
      mentions: stat?.mentions || 0,
      reposts: stat?.reposts || 0,
      replies: stat?.replies || 0,
      zaps: stat?.zaps || 0,
      score: stat?.score || 0,
      score24h: stat?.score24h || 0,
      satszapped: stat?.satszapped || 0,
      noteId: noteEncode(message.id),
    },
  }
};

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

const getNoteReferences = (message: NostrNoteContent) => {
  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;

  while((match = regex.exec(message.content)) !== null) {
    refs.push(match[1]);
  }

  return refs.reduce<string[]>((acc, ref) => {
    const tag = message.tags[parseInt(ref)] || [];

    return tag[0] === 'e' ? [...acc, tag[1]] : acc;
  }, []);
};

const getUserReferences = (message: NostrNoteContent) => {
  const regex = /\#\[([0-9]*)\]/g;
  let refs = [];
  let match;

  while((match = regex.exec(message.content)) !== null) {
    refs.push(match[1]);
  }

  return refs.reduce<string[]>((acc, ref) => {
    const tag = message.tags[parseInt(ref)] || [];

    return tag[0] === 'p' ? [...acc, tag[1]] : acc;
  }, []);
};

type ConvertToNotes = (page: FeedPage | undefined) => PrimalNote[];

export const convertToNotes: ConvertToNotes = (page) => {

  if (page === undefined) {
    return [];
  }

  return  page.messages.map((message) => {
    const msg: NostrNoteContent = message.kind === Kind.Repost ? parseKind6(message) : message;

    const user = page?.users[msg.pubkey];
    const stat = page?.postStats[msg.id];

    const userMeta = JSON.parse(user?.content || '{}');

    const mentionIds = getNoteReferences(message);
    const userMentionIds = getUserReferences(message);

    let mentionedNotes = {};
    let mentionedUsers = {};


    if (mentionIds.length > 0) {
      mentionedNotes = mentionIds.reduce((acc, id) => {
        const m = page.mentions && page.mentions[id];

        if (!m) {
          return acc;
        }

        m.tags.forEach(t => {
          if (t[0] === 'p') {
            mentionedUsers = {
              ...mentionedUsers,
              [t[1]]: convertToUser(page.users[t[1]] || emptyUser(t[1]))};
          }
        })

        return {
          ...acc,
          [id]: {
            post: { ...m },
            user: convertToUser(page.users[m.pubkey] || emptyUser(m.pubkey)),
          },
        };
      }, {});
    }

    if (userMentionIds.length > 0) {
      mentionedUsers = userMentionIds.reduce((acc, id) => {
        const m = page.users && page.users[id];

        return {
          ...acc,
          [id]: { ...convertToUser(m || emptyUser(id)) },
        };
      }, {});
    }

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
        content: DOMPurify.sanitize(msg.content),
        sig: msg.sig,
        likes: stat?.likes || 0,
        mentions: stat?.mentions || 0,
        reposts: stat?.reposts || 0,
        replies: stat?.replies || 0,
        zaps: stat?.zaps || 0,
        score: stat?.score || 0,
        score24h: stat?.score24h || 0,
        satszapped: stat?.satszapped || 0,
        noteId: noteEncode(msg.id),
      },
      repost: message.kind === Kind.Repost ? getRepostInfo(page, message) : undefined,
      msg,
      mentionedNotes,
      mentionedUsers,
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
