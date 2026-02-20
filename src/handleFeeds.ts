import { nip19 } from "./lib/nTools";
import { Kind } from "./constants";
import { getEvents, getUserArticleFeed, getUserFeed } from "./lib/feed";
import { hexToNpub } from "./lib/keys";
import { parseLinkPreviews, setLinkPreviews } from "./lib/notes";
import { getProfileZapList, getUserProfileInfo } from "./lib/profile";
import { subsTo } from "./sockets";
import { convertToArticles, convertToNotes } from "./stores/note";
import { convertToUser } from "./stores/profile";
import { FeedPage, FeedRange, NostrEventContent, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NostrUserZaps, NoteActions, PrimalArticle, PrimalNote, PrimalUser, PrimalZap, TopZap } from "./types/primal";
import { parseBolt11 } from "./utils";
import { getFeedItems } from "./lib/search";
import { PaginationInfo } from "./megaFeeds";
import { getArticlesStats, getTopArticle } from "./lib/stats";

export type ArticlesStats = { articles: number, drafts: number, satszapped: number };

export const fetchTopArticle = (pubkey: string, by: 'satszapped' | 'interactions', subId: string) => {
  return new Promise<PrimalArticle>((resolve, reject) => {

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

        resolve(notes[0]);
      }
    });

    getTopArticle(pubkey, by, subId);

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
}

export const fetchArticlesStats = (pubkey: string, subId: string) => {
  return new Promise<ArticlesStats>((resolve, reject) => {

    let stats: ArticlesStats = { articles: 0, drafts: 0, satszapped: 0}

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.ArticlesStats) {
          stats = JSON.parse(content.content || `{ articles: 0, drafts: 0, satszapped: 0}`);
        }
      },
      onEose: () => {
        unsub();

        resolve(stats);
      },
    });

    getArticlesStats(pubkey, subId);
  });
}

export const fetchNotesFeed = (pubkey: string | undefined, specification: any, subId: string, limit = 20, until = 0, offset = 0) => {
  return new Promise<PrimalNote[]>((resolve, reject) => {

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

    getFeedItems(subId, specification, pubkey, limit, until, offset);

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

export const fetchArticlesFeed = (pubkey: string | undefined, specification: any, subId: string, limit = 20, until = 0, offset = 0) => {
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

    getFeedItems(subId, specification, pubkey, limit, until, offset);

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


export type ContentZaps = {
  notes: PrimalNote[],
  articles: PrimalArticle[],
  zaps: PrimalZap[],
  paging: PaginationInfo,
}


export const fetchUserZaps = (pubkey: string | undefined, subId: string, until = 0, offset = 0, limit = 10) => {
  return new Promise<ContentZaps>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let zapList: NostrUserZaps[] = [];

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
      sortBy: 'created_at',
      wordCount: {},
      elements: [],
    }

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();

        const pageNotes = page.messages.filter(m => m.kind === Kind.Text);
        const pageArticles = page.messages.filter(m => m.kind === Kind.LongForm);

        const notes = convertToNotes({ ...page, messages: [...pageNotes] }, page.topZaps);
        const articles = convertToArticles({ ...page, messages: [...pageArticles] }, page.topZaps);

        const paging: PaginationInfo = {
          since: page.since || 0,
          until: page.until || 0,
          sortBy: page.sortBy || 'created_at',
          elements: page.elements || [],
        };

        let zaps: PrimalZap[] = [];

        for (let i=0; i< zapList.length; i++) {
          const zapContent = zapList[i];


          const bolt11 = (zapContent.tags.find(t => t[0] === 'bolt11') || [])[1];
          const zapEvent = JSON.parse((zapContent.tags.find(t => t[0] === 'description') || [])[1] || '{}');
          const senderPubkey = zapEvent.pubkey as string;
          const receiverPubkey = zapEvent.tags.find((t: string[]) => t[0] === 'p')[1] as string;

          let zappedId = '';
          let zappedKind: number = 0;

          const zapTagA = zapEvent.tags.find((t: string[]) => t[0] === 'a');
          const zapTagE = zapEvent.tags.find((t: string[]) => t[0] === 'e');

          if (zapTagA) {
            const [kind, pubkey, identifier] = zapTagA[1].split(':');

            zappedId = nip19.naddrEncode({ kind, pubkey, identifier });

            const article = pageArticles.find(a => a.id === zappedId);
            zappedKind = article?.kind || 0;
          }
          else if (zapTagE) {
            zappedId = zapTagE[1];

            const article = pageArticles.find(a => a.id === zappedId);
            const note = pageNotes.find(n => n.id === zappedId);

            zappedKind = article?.kind || note?.kind || 0;
          }

          if (![Kind.Text, Kind.LongForm].includes(zappedKind)) continue;

          const sender = page.users[senderPubkey] ? convertToUser(page.users[senderPubkey], senderPubkey) : senderPubkey;
          const reciver = page.users[receiverPubkey] ? convertToUser(page.users[receiverPubkey], receiverPubkey) : receiverPubkey;

          const zap: PrimalZap = {
            id: zapContent.id,
            message: zapEvent.content || '',
            amount: parseBolt11(bolt11) || 0,
            sender,
            reciver,
            created_at: zapContent.created_at,
            zappedId,
            zappedKind,
          };

          if (!zaps.find(z => z.id === zap.id)) {
            zaps.push(zap);
          }
        }


        resolve({
          notes,
          articles,
          zaps,
          paging,
        });

      }
    });

    getProfileZapList(pubkey, subId, until, 0, limit);

    const updatePage = (content: NostrEventContent) => {
      if (content?.kind === Kind.Zap) {
        zapList.push(content);
        return;
      }

      if (content.kind === Kind.Metadata) {
        const user = content as NostrUserContent;

        page.users[user.pubkey] = { ...user };

        return;
      }

      if ([Kind.Text, Kind.Repost, Kind.LongForm, Kind.LongFormShell, Kind.Repost].includes(content.kind)) {
        const message = content as NostrNoteContent;

        // if (lastNote?.id !== message.id) {
          page.messages.push({...message});
        // }

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

      // if (content?.kind === Kind.Zap) {
      //   const zapTag = content.tags.find(t => t[0] === 'description');

      //   if (!zapTag) return;

      //   const zapInfo = JSON.parse(zapTag[1] || '{}');

      //   let amount = '0';

      //   let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

      //   if (bolt11Tag) {
      //     try {
      //       amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
      //     } catch (e) {
      //       const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

      //       amount = amountTag ? amountTag[1] : '0';
      //     }
      //   }

      //   const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

      //   const zap: TopZap = {
      //     id: zapInfo.id,
      //     amount: parseInt(amount || '0'),
      //     pubkey: zapInfo.pubkey,
      //     message: zapInfo.content,
      //     eventId,
      //   };

      //   if (page.topZaps[eventId] === undefined) {
      //     page.topZaps[eventId] = [{ ...zap }];
      //     return;
      //   }

      //   if (page.topZaps[eventId].find(i => i.id === zap.id)) {
      //     return;
      //   }

      //   const newZaps = [ ...page.topZaps[eventId], { ...zap }].sort((a, b) => b.amount - a.amount);

      //   page.topZaps[eventId] = [ ...newZaps ];

      //   return;
      // }

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

      if (content.kind === Kind.FeedRange) {
        const feedRange: FeedRange = JSON.parse(content.content || '{}');

        page.since = feedRange.since;
        page.until = feedRange.until;
        page.sortBy = feedRange.order_by;
        page.elements = [...feedRange.elements];
        return;
      }
    };
  });
};

export const fetchUserProfile = (userPubkey: string | undefined, pubkey: string | undefined, subId: string) => {
  return new Promise<PrimalUser>((resolve, reject) => {
    if (!pubkey) reject('Missing pubkey');

    let user: PrimalUser | undefined;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;
        updatePage(content);
      },
      onEose: () => {
        unsub();
        user ? resolve(user) : reject('user not found');
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
