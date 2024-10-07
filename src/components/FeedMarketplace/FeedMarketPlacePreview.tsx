import { batch, Component, createEffect, For, Match, on, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { fetchNoteFeedBySpec, fetchReadsFeedBySpec } from '../../handleNotes';
import { emptyPaging, fetchMegaFeed, PaginationInfo } from '../../megaFeeds';
import { DVMMetadata, NoteActions, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser } from '../../types/primal';
import { calculatePagingOffset } from '../../utils';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import Note from '../Note/Note';
import Paginator from '../Paginator/Paginator';
import styles from './FeedMarketPlace.module.scss';
import FeedMarketItem from './FeedMarketPlaceItem';

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
}> = (props) => {
  const account = useAccountContext();

  const [store, updateStore] = createStore<FeedPreviewStore>({
    notes: [],
    reads: [],
    paging: { ...emptyPaging() },
    isFetching: false,
  });

  const getFeedPreview = async () => {
    if (store.isFetching || !props.type) return;

    updateStore('isFetching', () => true);

    const spec = JSON.stringify({
      dvm_id: props.dvm?.identifier,
      dvm_pubkey: props.dvm?.pubkey,
      kind: props.type,
    });

    const collection = props.type == 'reads' ?
      store.reads :
      store.notes;

    const offset = calculatePagingOffset(
      collection,
      store.paging.elements,
    );

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

    batch(() => {
      updateStore('notes', (ns) => [ ...ns, ...notes]);
      updateStore('reads', (rs) => [ ...rs, ...reads]);
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
      class={styles.feedMarketplacePreview}
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
              />}
            </For>
          </Match>
          <Match when={props.type === 'reads'}>
            <For each={store.reads}>
              {article => <ArticlePreview
                article={article}
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