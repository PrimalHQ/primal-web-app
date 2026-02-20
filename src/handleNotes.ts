import { nip19 } from "./lib/nTools";
import { Kind } from "./constants";
import { getEvents, getMegaFeed, getUserArticleFeed, getUserFeed } from "./lib/feed";
import { decodeIdentifier, hexToNpub } from "./lib/keys";
import { getParametrizedEvents, parseLinkPreviews, setLinkPreviews } from "./lib/notes";
import { getUserProfileInfo } from "./lib/profile";
import { subsTo } from "./sockets";
import { convertToArticles, convertToNotes } from "./stores/note";
import { EventCoordinate, FeedPage, MegaFeedPage, NostrEventContent, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalArticle, PrimalDraft, PrimalNote, PrimalUser, TopZap, UserStats } from "./types/primal";
import { parseBolt11 } from "./utils";
import { convertToDraftsMega } from "./stores/megaFeed";
import { emptyMegaFeedPage, pageResolve, updateFeedPage } from "./megaFeeds";

export const fetchDrafts = (pubkey: string | undefined, ids: string[], subId: string) => {
  return new Promise<PrimalDraft[]>((resolve, reject) => {
    // if (!pubkey) reject('Missing pubkey');

    let page: MegaFeedPage = emptyMegaFeedPage();


    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updateFeedPage(page, content);
      },
      onEose: () => {
        unsub();
        const feed = pageResolve(page);
        resolve(feed.drafts);
      }
    });

    getEvents(pubkey, [...ids], subId, true);
  });
};

export const fetchNotes = (pubkey: string | undefined, noteIds: string[], subId: string) => {
  return new Promise<PrimalNote[]>((resolve, reject) => {
    // if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
    }

    let lastNote: PrimalNote | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToNotes(page, page.topZaps);

        resolve(notes);
      }
    });

    getEvents(pubkey, [...noteIds], subId, true);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.Text, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
};

export const fetchArticles = (noteIds: string[], subId: string) => {
  return new Promise<PrimalArticle[]>((resolve, reject) => {

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
      wordCount: {},
    }

    const events = noteIds.reduce<EventCoordinate[]>((acc, id) => {
      const d = decodeIdentifier(id);

      if (!d.data || d.type !== 'naddr' || typeof d.data === 'string') return acc;

      const { pubkey, identifier, kind } = d.data;

      return [
        ...acc,
        { identifier, pubkey, kind },
      ]

    }, []);

    let lastNote: PrimalArticle | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToArticles(page, page.topZaps);

        resolve(notes);
      }
    });

    getParametrizedEvents(events, subId);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.LongForm, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.WordCount) {
        const count = JSON.parse(content.content) as { event_id: string, words: number };

        if (!page.wordCount) {
          page.wordCount = {};
        }

        page.wordCount[count.event_id] = count.words
        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
};


export const fetchArticleThread = (pubkey: string | undefined, noteIds: string, subId: string) => {
  return new Promise<PrimalArticle[]>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
      wordCount: {},
    }

    let primaryArticle: PrimalArticle | undefined;

    let lastNote: PrimalArticle | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToArticles(page, page.topZaps);

        resolve(notes);
      },
    });

    getEvents(pubkey, [...noteIds], subId, true);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.LongForm, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
};


export const fetchUserArticles = (userPubkey: string | undefined, pubkey: string | undefined, type: 'authored' | 'replies' | 'bookmarks', subId: string, until = 0, limit = 10) => {
  return new Promise<PrimalArticle[]>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
      wordCount: {},
    }

    let lastNote: PrimalArticle | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToArticles(page, page.topZaps);

        resolve(notes);
      },
    });

    getUserArticleFeed(userPubkey, pubkey, subId, type, until, limit);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.LongForm, Kind.LongFormShell, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.WordCount) {
        const count = JSON.parse(content.content) as { event_id: string, words: number };

        if (!page.wordCount) {
          page.wordCount = {};
        }

        page.wordCount[count.event_id] = count.words
        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
};

export const fetchUserProfile = (userPubkey: string | undefined, pubkey: string | undefined, subId: string) => {
  return new Promise<PrimalUser>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let user: PrimalUser | undefined;
    let userStats: UserStats | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        if (!user) {
          reject('user not found')
          return;
        };

        if (userStats) {
          user.userStats = userStats;
        }

        resolve(user);
      },
    });

    getUserProfileInfo(pubkey, userPubkey, subId);

    const updatePage = (content: NostrEventContent) => {
      if (content?.kind === Kind.Metadata) {
        let userData = JSON.parse(content.content);

        if (!userData.displayName || typeof userData.displayName === 'string' && userData.displayName.trim().length === 0) {
          userData.displayName = userData.display_name;
        }
        userData.pubkey = content.pubkey;
        userData.npub = hexToNpub(content.pubkey);
        userData.created_at = content.created_at;

        user = { ...userData };
        return;
      }

      if (content.kind === Kind.UserStats) {
        let stats = JSON.parse(content.content) as UserStats;

        userStats = { ...stats };
      }
    };
  });
}

export const fetchUserGallery = (userPubkey: string | undefined, pubkey: string | undefined, type: 'authored' | 'replies' | 'bookmarks' | 'user_media_thumbnails', subId: string, until = 0, limit = 10) => {
  return new Promise<PrimalNote[]>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
      wordCount: {},
    }

    let lastNote: PrimalNote | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToNotes(page, page.topZaps);

        resolve(notes);
      },
    });

    getUserFeed(userPubkey, pubkey, subId, type, undefined, until, limit);

    const updatePage = (content: NostrEventContent) => {

      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.Text, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.WordCount) {
        const count = JSON.parse(content.content) as { event_id: string, words: number };

        if (!page.wordCount) {
          page.wordCount = {};
        }

        page.wordCount[count.event_id] = count.words
        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
};


export const fetchNoteFeedBySpec = (pubkey: string | undefined, spec: string, subId: string, until = 0, limit = 20) => {

  return new Promise<PrimalNote[]>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
    }

    let lastNote: PrimalNote | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToNotes(page, page.topZaps);

        resolve(notes);
      },
    });

    getMegaFeed(pubkey, spec, subId, until, limit);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.Text, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.post?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      // if ([Kind.LongForm, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
      //   const message = content as NostrNoteContent;

      //   if (lastNote?.id !== message.id) {
      //     page.messages.push({...message});
      //   }

      //   return;
      // }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
}

export const fetchReadsFeedBySpec = (pubkey: string | undefined, spec: string, subId: string, until = 0, limit = 20) => {

  return new Promise<PrimalArticle[]>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let page: FeedPage = {
      users: {},
      messages: [],
      postStats: {},
      mentions: {},
      noteActions: {},
      relayHints: {},
      topZaps: {},
      since: 0,
      until: 0,
    }

    let lastNote: PrimalArticle | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        const notes = convertToArticles(page, page.topZaps);

        resolve(notes);
      }
    });

    getMegaFeed(pubkey, spec, subId, until, limit);

    const updatePage = (content: NostrEventContent) => {
      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      // if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      //   const message = content as NostrNoteContent;

      //   if (lastNote?.id !== message.id) {
      //     page.messages.push({...message});
      //   }

      //   return;
      // }

      if ([Kind.LongForm, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        }

        return;
      }

      if (content.kind === Kind.NoteStats) {
        const statistic = content as NostrStatsContent;
        const stat = JSON.parse(statistic.content);
        page.postStats[stat.event_id] = { ...stat };

        return;
      }

      if (content.kind === Kind.Mentions) {
        const mentionContent = content as NostrMentionContent;
        const mention = JSON.parse(mentionContent.content);

        if (!page.mentions) {
          page.mentions = {};
        }

        page.mentions[mention.id] = { ...mention };

        return;
      }

      if (content.kind === Kind.NoteActions) {
        const noteActionContent = content as NostrNoteActionsContent;
        const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

        page.noteActions[noteActions.event_id] = { ...noteActions };

        return;
      }

      if (content.kind === Kind.LinkMetadata) {
        parseLinkPreviews(JSON.parse(content.content));
        return;
      }

      if (content.kind === Kind.RelayHint) {
        const hints = JSON.parse(content.content);
        page.relayHints = { ...page.relayHints, ...hints };

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

        const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

        const zap: TopZap = {
          id: zapInfo.id,
          amount: parseInt(amount || '0'),
          pubkey: zapInfo.pubkey,
          message: zapInfo.content,
          eventId,
        };

        if (page.topZaps[eventId] === undefined) {
          page.topZaps[eventId] = [{ ...zap }];
          return;
        }

        if (page.topZaps[eventId].find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

        page.topZaps[eventId] = [ ...newZaps ];

        return;
      }

      if (content.kind === Kind.NoteQuoteStats) {
        const quoteStats = JSON.parse(content.content);


        // updateStore('quoteCount', () => quoteStats.count || 0);
        return;
      }
    };
  });
}
