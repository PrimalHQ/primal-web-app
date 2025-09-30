import { Kind } from "./constants";
import { getArticleThread, getMegaFeed } from "./lib/feed";
import { parseLinkPreviews, setLinkPreviews } from "./lib/notes";
import { subsTo } from "./sockets";
import { isRepostInCollection } from "./stores/note";
import {
  FeedRange,
  MegaFeedPage,
  NostrEventContent,
  NostrMentionContent,
  NostrMessageEncryptedContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalArticle,
  PrimalDraft,
  PrimalNote,
  PrimalUser,
  PrimalZap,
  SenderMessageCount,
  TopicStats,
  TopZap,
  UserRelation,
  UserStats,
} from "./types/primal";
import { parseBolt11 } from "./utils";
import { convertToDraftsMega, convertToNotesMega, convertToReadsMega, convertToUsersMega } from "./stores/megaFeed";
import { getRecomendedArticleIds, getScoredUsers } from "./lib/search";
import { fetchArticles } from "./handleNotes";
import { APP_ID } from "./App";
import { decodeIdentifier } from "./lib/keys";
import { getExploreMedia, getExplorePeople, getExploreTopics, getExploreZaps, getUserProfiles } from "./lib/profile";
import { convertToUser, emptyUser } from "./stores/profile";
import { emptyStats } from "./contexts/ProfileContext";
import { getMessageCounts, getNewMessages, getOldMessages } from "./lib/messages";
import { LeaderboardSort } from "./pages/Premium/PremiumLegendLeaderboard";
import { LegendCustomizationConfig, fetchLeaderboard } from "./lib/premium";
import { CohortInfo } from "./contexts/AppContext";
import { nip19 } from './lib/nTools';

export type PaginationInfo = {
  since: number,
  until: number,
  sortBy: string,
  elements: string[],
};

export type TopicStat = [string, number];


export type DMContact = {
  pubkey: string,
  user: PrimalUser,
  dmInfo: SenderMessageCount,
}

export type LeaderboardInfo = {
  index: number,
  pubkey: string,
  donated_btc: number,
  last_donation: number,
  premium_since: number,
}

export type MegaFeedResults = {
  users: PrimalUser[],
  notes: PrimalNote[],
  reads: PrimalArticle[],
  drafts: PrimalDraft[],
  zaps: PrimalZap[],
  topicStats: TopicStat[],
  paging: PaginationInfo,
  page: MegaFeedPage,
  dmContacts: DMContact[],
  encryptedMessages: NostrMessageEncryptedContent[],
  legendCustomization: Record<string, LegendCustomizationConfig>,
  memberCohortInfo: Record<string, CohortInfo>,
  leaderboard: LeaderboardInfo[],
};

export type FeedPaging = {
  limit?: number,
  until?: number,
  since?: number,
  offset?: number | number[],
}

export const emptyMegaFeedPage: () => MegaFeedPage = () => ({
  users: {},
  notes: [],
  reads: [],
  drafts: [],
  zaps: [],
  topicStats: {},
  noteStats: {},
  mentions: {},
  noteActions: {},
  relayHints: {},
  topZaps: {},
  wordCount: {},
  userStats: {},
  userFollowerCounts: {},
  userFollowerIncrease: {},
  since: 0,
  until: 0,
  sortBy: 'created_at',
  elements: [],
  dmContacts: {},
  encryptedMessages: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
});

export const emptyPaging = () => ({ since: 0, until: 0, sortBy: 'created_at', elements: [] });

export const emptyMegaFeedResults = () => ({
  users: [],
  notes: [],
  reads: [],
  drafts: [],
  zaps: [],
  topicStats: [],
  dmContacts: [],
  paging: { ...emptyPaging() },
  page: { ...emptyMegaFeedPage() },
  encryptedMessages: [],
  legendCustomization: {},
  memberCohortInfo: {},
  leaderboard: [],
});

export const parseEmptyReposts = (page: MegaFeedPage) => {
  let reposts: Record<string, string> = {};

  page.notes.forEach(message => {
    if (message.kind === Kind.Repost && message.content.length === 0) {
      const tag = message.tags.find(t => t[0] === 'e');
      if (tag) {
        reposts[tag[1]] = message.id;
      }
    }
  });

  return reposts;
};

export const fetchMegaFeed = (
  pubkey: string | undefined,
  specification: any,
  subId: string,
  paging?: FeedPaging,
) => {
    return new Promise<MegaFeedResults>((resolve) => {
      let page: MegaFeedPage = {...emptyMegaFeedPage()};

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          resolve(pageResolve(page));
        },
        onEvent: (s, content) => {
          updateFeedPage(page, content);
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

      getMegaFeed(pubkey, specification, subId, until, limit, since, offset);

    });
};

export const fetchScoredContent = (
  pubkey: string | undefined,
  selector: string,
  subId: string,
) => {
  return new Promise<MegaFeedResults>((resolve) => {
    let page: MegaFeedPage = {...emptyMegaFeedPage()};

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();
        resolve(pageResolve(page));
      },
      onEvent: (_, content) => {
        updateFeedPage(page, content);
      }
    });

    getScoredUsers(pubkey, selector, 10, subId);
  });
}

export const fetchRecomendedReads = (
  subId: string,
) => {
  return new Promise<PrimalArticle[]>((resolve) => {
    let ids: string[] = [];

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();

        fetchArticles(ids, `get_reads_pe_${APP_ID}`).then((reads) => {
          resolve(reads);
        });

      },
      onEvent: (_, content) => {
        const recomended = JSON.parse(content?.content || '{}');
        ids = recomended.reads.reduce((acc: string[], r: string[]) => r[0] ? [ ...acc, r[0] ] : acc, []);
      }
    });

    getRecomendedArticleIds(subId);
  });
}

export const fetchReadThread = (
  userPubkey: string | undefined,
  naddr: string,
  subId: string,
) => {
  return new Promise<MegaFeedResults>((resolve) => {
    let page: MegaFeedPage = {...emptyMegaFeedPage()};

    const decoded = decodeIdentifier(naddr);

    // @ts-ignore
    const { pubkey, identifier, kind } = decoded.data;

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
        resolve({ ...emptyMegaFeedResults()});
      }
    });

    getArticleThread(userPubkey, pubkey, identifier, kind, subId);
  });
}

export const fetchExplorePeople = (
  user_pubkey: string | undefined,
  subId: string,
  paging?: FeedPaging,
) => {
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

    getExplorePeople(subId, user_pubkey, until, limit, since, offset);
  });
}

export const fetchExploreZaps = (
  user_pubkey: string | undefined,
  subId: string,
  paging?: FeedPaging,
) => {
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

    getExploreZaps(subId, user_pubkey, until, limit, since, offset);
  });
}

export const fetchExploreMedia = (
  user_pubkey: string | undefined,
  subId: string,
  paging?: FeedPaging,
) => {
  return new Promise<MegaFeedResults>((resolve) => {
    let page: MegaFeedPage = { ...emptyMegaFeedPage() };

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

    getExploreMedia(subId, user_pubkey, until, limit, since, offset);
  });
}

export const fetchExploreTopics = (
  user_pubkey: string | undefined,
  subId: string,
) => {
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

    getExploreTopics(subId, user_pubkey);
  });
}

export const fetchDMContacts = (
  user_pubkey: string | undefined,
  relation: UserRelation,
  subId: string,
  paging?: FeedPaging,
) => {
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

    getMessageCounts(user_pubkey, relation, subId, limit, since, offset);
  });
}

export const fetchDMConversation = (
  reciever: string | undefined,
  sender: string | undefined,
  subId: string,
  paging?: FeedPaging,
) => {
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

    getOldMessages(reciever, sender, subId, since, limit, offset);
  });
}

export const fetchDMConversationNew = (
  reciever: string | undefined,
  sender: string | undefined,
  subId: string,
  paging?: FeedPaging,
) => {
  return new Promise<MegaFeedResults>((resolve) => {
    if (!reciever || !sender) {
      resolve({ ...emptyMegaFeedResults() });
      return;
    }

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

    getNewMessages(reciever, sender, subId, since, limit, offset);
  });
}

export const fetchLeaderboardThread = (
  subId: string,
  order: LeaderboardSort,
  type: 'legend' | 'premium',
  paging?: FeedPaging,
) => {
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
        resolve({ ...emptyMegaFeedResults()});
      }
    });

    const until = paging?.until || 0;
    const since = paging?.since || 0;
    const limit = paging?.limit || 0;

    let offset = 0;

    if (typeof paging?.offset === 'number') {
      offset = paging.offset;
    }

    fetchLeaderboard(subId, type, order, since, limit, offset);
  });
}

export const fetchPeople = (
  pubkeys: string[],
  subId: string,
) => {
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

    getUserProfiles(pubkeys, subId);
  });
}

export const pageResolve = (page: MegaFeedPage) => {

  // If there are reposts that have empty content,
  // we need to add the content manualy
  const reposts = parseEmptyReposts(page);
  const repostIds = Object.keys(reposts);

  if (repostIds.length > 0) {
    repostIds.forEach(id => {
      const repostedNote = page.mentions[id];

      if (repostedNote) {
        const i = page.notes.findIndex(n => n.id === reposts[id]);
        page.notes[i].content = JSON.stringify(repostedNote);
      }
    })
  }

  const users = convertToUsersMega(page);
  const notes = convertToNotesMega(page);
  const reads = convertToReadsMega(page);
  const drafts = convertToDraftsMega(page);
  const zaps = convertToZapsMega(page);
  const topicStats = convertToTopicStatsMega(page);
  const dmContacts = convertToContactsMega(page);
  const encryptedMessages = [...page.encryptedMessages];
  const legendCustomization = { ...page.legendCustomization };
  const memberCohortInfo = { ...page.memberCohortInfo };
  const leaderboard = [ ...page.leaderboard ];

  return {
    users,
    notes,
    reads,
    drafts,
    zaps,
    topicStats,
    dmContacts,
    encryptedMessages,
    legendCustomization,
    memberCohortInfo,
    leaderboard,
    paging: {
      since: page.since,
      until: page.until,
      sortBy: page.sortBy,
      elements: page.elements,
    },
    page,
  };
}

export const updateFeedPage = (page: MegaFeedPage, content: NostrEventContent) => {
  if (content.kind === Kind.FeedRange) {
    const feedRange: FeedRange = JSON.parse(content.content || '{}');

    page.since = feedRange.since;
    page.until = feedRange.until;
    page.sortBy = feedRange.order_by;
    page.elements = [...feedRange.elements];
    return;
  }

  if (content.kind === Kind.Metadata) {
    const user = content as NostrUserContent;

    page.users[user.pubkey] = { ...user };
    return;
  }

  if ([Kind.Text, Kind.Repost].includes(content.kind)) {
    const message = content as NostrNoteContent;

    let isAlreadyReposted = isRepostInCollection(page.notes, message);

    if (isAlreadyReposted) return;

    page.notes.push({ ...message });

    return;
  }

  if ([Kind.LongForm, Kind.LongFormShell].includes(content.kind)) {
    const message = content as NostrNoteContent;

    let isAlreadyReposted = isRepostInCollection(page.notes, message);

    if (isAlreadyReposted) return;

    page.reads.push({ ...message });
    return;
  }

  if ([Kind.Draft].includes(content.kind)) {
      const message = content as NostrNoteContent;

      page.drafts.push({ ...message });
      return;
    }

  if (content.kind === Kind.NoteStats) {
    const statistic = content as NostrStatsContent;
    const stat = JSON.parse(statistic.content);

    page.noteStats[stat.event_id] = { ...stat };
    return;
  }

  if (content.kind === Kind.Mentions) {
    const mentionContent = content as NostrMentionContent;
    const mention = JSON.parse(mentionContent.content);

    page.mentions[mention.id] = { ...mention};
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

  if (content.kind === Kind.Zap) {
    page.zaps.push(content);

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

    let eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'a') || [])[1];

    if (eventId && eventId.includes(':')) {
      const [kind, pubkey, identifier] = eventId.split(':');

      eventId = nip19.naddrEncode({ kind, pubkey, identifier })
    } else {
      eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];
    }

    const topZap: TopZap = {
      id: zapInfo.id,
      amount: parseInt(amount || '0'),
      pubkey: zapInfo.pubkey,
      message: zapInfo.content,
      eventId,
    };


    const oldZaps = page.topZaps[eventId];

    if (oldZaps === undefined) {
      page.topZaps[eventId] = [{ ...topZap }];
      return;
    }

    if (oldZaps.find(i => i.id === topZap.id)) {
      return;
    }

    const newZaps = [ ...oldZaps, { ...topZap }].sort((a, b) => b.amount - a.amount);

    page.topZaps[eventId] = [ ...newZaps ];

    return;
  }

  if (content.kind === Kind.NoteTopicStat) {
    const topics = JSON.parse(content.content);

    page.topicStats = topics;
    return;
  }

  if (content.kind === Kind.UserStats) {
    let stats = JSON.parse(content.content) as UserStats;

    page.userStats[stats.pubkey] = { ...stats };
  }

  if (content.kind === Kind.UserFollowerCounts) {
    let stats = JSON.parse(content.content);

    page.userFollowerCounts = { ...stats };
  }

  if (content.kind === Kind.UserFollowerIncrease) {
    let stats = JSON.parse(content.content);

    page.userFollowerIncrease = { ...stats };
  }

  if (content?.kind === Kind.MesagePerSenderStats) {
    const senderCount = JSON.parse(content.content);

    page.dmContacts = { ...senderCount };
  }

  if (content?.kind === Kind.EncryptedDirectMessage) {
    page.encryptedMessages.push({ ...content });
  }

  if (content.kind === Kind.WordCount) {
    const count = JSON.parse(content.content) as { event_id: string, words: number };

    if (!page.wordCount) {
      page.wordCount = {};
    }

    page.wordCount[count.event_id] = count.words
    return;
  }


  if (content.kind === Kind.LegendCustomization) {
    const config = JSON.parse(content.content) as Record<string, LegendCustomizationConfig>;

    Object.entries(config).forEach(([pubkey, customization]) => {
      page.legendCustomization[pubkey] = { ...customization }
    });

  }

  if (content.kind === Kind.MembershipCohortInfo) {
    const config = JSON.parse(content.content) as Record<string, CohortInfo>;

    Object.entries(config).forEach(([pubkey, customization]) => {
      page.memberCohortInfo[pubkey] = { ...customization }
    });
  }

  if ([Kind.LegendLeaderboard, Kind.PremiumLeaderboard].includes(content.kind)) {
    let leaderboard = JSON.parse(content.content || '[]');

    leaderboard = leaderboard.map((l: any) => ({
      index: l.index,
      pubkey: l.pubkey,
      donated_btc: l.donated_btc ? parseFloat(l.donated_btc) : 0,
      last_donation: l.last_donation || 0,
      premium_since: l.premium_since || 0,
    }));

    page.leaderboard = [ ...leaderboard ];
  }

};

export const filterAndSortNotes = (notes: PrimalNote[], paging: PaginationInfo) => {
  let processedIds: string[] = [];
  return paging.elements.reduce<PrimalNote[]>(
    (acc, id) => {
      let note = notes.find(n => [n.id, n.repost?.note.id].includes(id));

      if (!note || processedIds.includes(note.id)) return acc;

      processedIds.push(note.id);

      return [ ...acc, { ...note } ];
    },
    [],
  );
}

export const filterAndSortReads = (reads: PrimalArticle[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalArticle[]>(
    (acc, id) => {
      const read = reads.find(n => n.id === id);

      return read ? [ ...acc, { ...read } ] : acc;
    },
    [],
  );
}

export const filterAndSortDrafts = (drafts: PrimalDraft[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalDraft[]>(
    (acc, id) => {
      const read = drafts.find(n => n.id === id);

      return read ? [ ...acc, { ...read } ] : acc;
    },
    [],
  );
}

export const filterAndSortZaps = (zaps: PrimalZap[], paging: PaginationInfo) => {
  return paging.elements.reduce<PrimalZap[]>(
    (acc, id) => {
      const zap = zaps.find(n => n.id === id);

      return zap ? [ ...acc, { ...zap } ] : acc;
    },
    [],
  );
}

export const filterAndSortUsers = (users: PrimalUser[], paging: PaginationInfo, page: MegaFeedPage) => {
  return paging.elements.reduce<PrimalUser[]>((acc, pk) => {

    let f: PrimalUser | undefined = users.find(u => u.pubkey === pk);

    // If we encounter a user without a metadata event
    // construct a user object for them
    if (!f) {
      f = emptyUser(pk);
      const stats = { ...emptyStats };

      f.userStats = {
        ...stats,
        followers_increase: page.userFollowerIncrease[pk],
        followers_count: page.userFollowerCounts[pk],
      };
    }

    return f ? [...acc, {...f}] : acc;
  } , []);
}


export const filterAndSortLeaderboard = (lb: LeaderboardInfo[], paging: PaginationInfo) => {
  return paging.elements.reduce<LeaderboardInfo[]>(
    (acc, id) => {
      let leader = lb.find(n => n.pubkey === id);

      return leader ? [ ...acc, { ...leader } ] : acc;
    },
    [],
  );
}

const convertToZapsMega = (page: MegaFeedPage) => {
  const pageZaps = page.zaps;

  let zaps: PrimalZap[] = [];

  for (let i=0; i< pageZaps.length; i++) {
    const zapContent = pageZaps[i];

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

      const article = page.reads.find(a => a.id === zappedId);
      zappedKind = article?.kind || 0;
    }
    else if (zapTagE) {
      zappedId = zapTagE[1];

      const article = page.reads.find(a => a.id === zappedId);
      const note = page.notes.find(n => n.id === zappedId);

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

  return zaps;
}

const convertToTopicStatsMega = (page: MegaFeedPage) => {
  return Object.entries(page.topicStats);
}

const convertToContactsMega = (page: MegaFeedPage) => {
  // const [keys, totalCount] = Object.entries(page.dmContacts).reduce<[string[], number]>((acc, [id, info]) => {
  //   return [[ ...acc[0], id ], acc[1] + info.cnt];
  // }, [[], 0]);

  const ids = Object.keys(page.dmContacts);

  return ids.map(id => ({
    pubkey: id,
    user: convertToUser(page.users[id], id),
    dmInfo: page.dmContacts[id],
  })) as DMContact[];
}
