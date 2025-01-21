import { nip19 } from "../lib/nTools";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { emptyPage, Kind } from "../constants";
import { convertToNotes, sortingPlan } from "../stores/note";
import { FeedPage, NostrEventContent, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalNote } from "../types/primal";
import { selectRelayTags } from "../utils";

type FeedStore = {
  lastNote?: PrimalNote,
  notes: PrimalNote[],
  isFetching: boolean,
}

type PrimalStore = {
  page: Record<string, FeedPage>,
  feed: Record<string, FeedStore>,
};


export const [store, updateStore] = createStore<PrimalStore>({
  page: {},
  feed: {},
});

export const getStoreKey = (subId: string) => {
  return subId.replace(APP_ID, '');
};

export const updatePage = (subId: string, content: NostrEventContent) => {

  const storeKey = getStoreKey(subId);
  const feed = store.feed[storeKey];

  if (content.kind === Kind.Metadata) {
    const user = content as NostrUserContent;


    updateStore('page', storeKey, 'users',
      (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
    );
    return;
  }

  if ([Kind.Text, Kind.Repost].includes(content.kind)) {
    const message = content as NostrNoteContent;
    const eventPointer: nip19.EventPointer ={
      id: message.id,
      author: message.pubkey,
      kind: message.kind,
      relays: selectRelayTags(message.tags),
    }

    const messageId = nip19.neventEncode(eventPointer);

    const isLastNote = message.kind === Kind.Text ?
      feed.lastNote?.post?.noteId === messageId :
      feed.lastNote?.repost?.note.noteId === messageId;

    if (!isLastNote) {
      updateStore('page', storeKey, 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );
    }

    return;
  }

  if (content.kind === Kind.NoteStats) {
    const statistic = content as NostrStatsContent;
    const stat = JSON.parse(statistic.content);

    updateStore('page', storeKey, 'postStats',
      (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
    );
    return;
  }

  if (content.kind === Kind.Mentions) {
    const mentionContent = content as NostrMentionContent;
    const mention = JSON.parse(mentionContent.content);

    updateStore('page', storeKey, 'mentions',
      (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
    );
    return;
  }

  if (content.kind === Kind.NoteActions) {
    const noteActionContent = content as NostrNoteActionsContent;
    const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

    updateStore('page', storeKey, 'noteActions',
      (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
    );
    return;
  }
};

export const savePage = (subId: string, sortBy = 'latest') => {
  const storeKey = getStoreKey(subId);
  const sortingFunction = sortingPlan(sortBy);

  const newPosts = sortingFunction(convertToNotes(store.page[storeKey]));

  saveNotes(newPosts, storeKey);
};

export const saveNotes = (notes: PrimalNote[], subId: string) => {
  const storeKey = getStoreKey(subId);

  updateStore('feed', storeKey, 'notes', (nts) => [ ...nts, ...notes ]);
  updateStore('feed', storeKey, 'isFetching', () => false);
};


export const clearPage = (subId: string) => {
  const storeKey = getStoreKey(subId);

  updateStore('page', storeKey, () => ({ ...emptyPage }));
};
