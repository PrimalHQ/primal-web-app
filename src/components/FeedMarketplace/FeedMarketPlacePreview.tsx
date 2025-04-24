import { batch, Component, createEffect, For, Match, on, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { emptyPaging, fetchMegaFeed, filterAndSortNotes, filterAndSortReads, PaginationInfo } from '../../megaFeeds';
import { DVMMetadata, NoteActions, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser } from '../../types/primal';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import Note from '../Note/Note';
import Paginator from '../Paginator/Paginator';
import styles from './FeedMarketPlace.module.scss';
import FeedMarketItem from './FeedMarketPlaceItem';
import { useNavigate } from '@solidjs/router';

type FeedPreviewStore = {
  notes: PrimalNote[],
  reads: PrimalArticle[],
  paging: PaginationInfo,
  isFetching: boolean,
}

const FeedMarketPlacePreview: Component<{
  dvm: PrimalDVM | undefined,
  author: PrimalUser | undefined,
  stats?: { likes: number, satszapped: number},
  actions?: NoteActions,
  metadata?: DVMMetadata,
  commonFollows?: PrimalUser[],
  type?: 'notes' | 'reads',
  isInDialog?: boolean,
}> = (props) => {
  const account = useAccountContext();
  const navigate = useNavigate();

  const [store, updateStore] = createStore<FeedPreviewStore>({
    notes: [],
    reads: [],
    paging: { ...emptyPaging() },
    isFetching: false,
  });

  const getFeedPreview = async () => {
    if (store.isFetching || !props.type) return;

    updateStore('isFetching', () => true);

    const spec = props.dvm?.primal_spec ?? JSON.stringify({
      dvm_id: props.dvm?.identifier,
      dvm_pubkey: props.dvm?.pubkey,
      kind: props.type,
    });

    let offset = 0;

    const since = store.paging.since || 0;

    if (props.type === 'reads') {
      offset = store.reads.reduce<number>((acc, m) => {
        // @ts-ignore
        return since === m.published ? acc + 1 : acc
      }, 0)
    } else if (props.type === 'notes') {
      offset = store.notes.reduce<number>((acc, m) => {
        // @ts-ignore
        return since === m.msg.created_at ? acc + 1 : acc
      }, 0)
    }

    const { notes, reads, paging } = await fetchMegaFeed(
      account?.publicKey,
      spec,
      `dvm_preview_${APP_ID}`,
      {
        limit: 20,
        until: store.paging.since,
        offset,
      }
    );

    const sortedNotes = filterAndSortNotes(notes, paging);
    const sortedReads = filterAndSortReads(reads, paging);

    batch(() => {
      updateStore('notes', (ns) => [ ...ns, ...sortedNotes]);
      updateStore('reads', (rs) => [ ...rs, ...sortedReads]);
      updateStore('paging', () => ({ ...paging }));
    });

    updateStore('isFetching', () => false);
  };

  const clearPreview = () => {
    updateStore(() => ({
      notes: [],
      reads: [],
      paging: { ...emptyPaging() },
      isFetching: false,
    }));
  }

  createEffect(on(() => props.dvm && props.type, () => {
    if (props.dvm && props.type) {
      getFeedPreview();
    } else {
      clearPreview();
    }
  }))

  createEffect(() => {
  })

  return (
    <div
      class={`${styles.feedMarketplacePreview} ${props.isInDialog ? styles.previewInDialog : ''}`}
    >
      <div class={styles.dvmCaption}>
        <FeedMarketItem
          dvm={props.dvm}
          author={props.author}
          stats={props.stats}
          metadata={props.metadata}
          actions={props.actions}
          size="header"
          commonUsers={props.commonFollows}
        />
      </div>

      <div class={styles.dvmList}>
        <Switch>
          <Match when={props.type === 'notes'}>
            <For each={store.notes}>
              {note => <Note
                note={note}
                shorten={true}
                noteType={'feed'}
                onRemove={(id: string) => {
                  updateStore('notes', (ns) => ns.filter(n => n.noteId !== id));
                }}
              />}
            </For>
          </Match>
          <Match when={props.type === 'reads'}>
            <For each={store.reads}>
              {article => <ArticlePreview
                article={article}
                onClick={navigate}
              />}
            </For>
          </Match>
        </Switch>
      </div>
      <Paginator
        loadNextPage={getFeedPreview}
      />
    </div>
  )
}

export default FeedMarketPlacePreview;
