import { createStore, SetStoreFunction } from "solid-js/store";
import { sortByScore24h, convertToNotes } from "../stores/note";
import { NostrNoteContent, NostrUserContent, NostrStatsContent, FeedPage, PrimalNote, NostrEventContent, Kind } from "../types/primal";

export type TrendingNotesData = FeedPage & { notes: PrimalNote[]};

export const emptyNotes: TrendingNotesData = {
  messages: [],
  users: {},
  notes: [],
  postStats: {},
};

export const [trendingNotes, setTrendingNotes] =
  createStore<TrendingNotesData>(emptyNotes);

const proccessNote = (post: NostrNoteContent) => {
  setTrendingNotes('messages', (msgs) => [ ...msgs, post]);
};

const proccessUser = (user: NostrUserContent) => {
  setTrendingNotes('users', (users) => ({ ...users, [user.pubkey]: user}))
};

const proccessStat = (stat: NostrStatsContent) => {
  const content = JSON.parse(stat.content);
  setTrendingNotes('postStats', (stats) => ({ ...stats, [content.event_id]: content }))
};

export const processTrendingNotes = (type: string, content: NostrEventContent | undefined) => {
  if (type === 'EOSE') {
    const newNotes = sortByScore24h(convertToNotes(trendingNotes));

    setTrendingNotes('notes', () => [...newNotes]);

    return;
  }

  if (type === 'EVENT') {
    if (content && content.kind === Kind.Metadata) {
      proccessUser(content);
    }
    if (content && content.kind === Kind.Text) {
      proccessNote(content);
    }
    if (content && content.kind === Kind.Repost) {
      proccessNote(content);
    }
    if (content && content.kind === Kind.NoteStats) {
      proccessStat(content);
    }
  }
};

export type TrendingNotesStore = {
  data: TrendingNotesData,
  setTrendingNotes: SetStoreFunction<TrendingNotesData>,
  processTrendingNotes: (type: string, content: NostrEventContent | undefined) => void,
}

export default {
  data: trendingNotes,
  setTrendingNotes,
  processTrendingNotes,
};
