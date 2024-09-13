import { Component, createEffect, For, Match, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { fetchNoteFeedBySpec, fetchReadsFeedBySpec } from '../../handleNotes';
import { PrimalArticle, PrimalDVM, PrimalNote } from '../../types/primal';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import Note from '../Note/Note';
import styles from './FeedMarketPlace.module.scss';
import FeedMarketItem from './FeedMarketPlaceItem';

type FeedPreviewStore = {
  notes: PrimalNote[],
  reads: PrimalArticle[],
}

const FeedMarketPlacePreview: Component<{
  dvm: PrimalDVM | undefined,
  stats?: { likes: number, satszapped: number},
  type: 'notes' | 'reads',
}> = (props) => {
  const account = useAccountContext();

  const [store, updateStore] = createStore<FeedPreviewStore>({
    notes: [],
    reads: [],
  });

  const getFeedPreview = async () => {
    let fetcher: Function | undefined;

    if (props.type === 'notes') {
      fetcher = fetchNoteFeedBySpec;
    }

    if (props.type === 'reads') {
      fetcher = fetchReadsFeedBySpec;
    }

    if (!fetcher) {
      return;
    }

    const spec = JSON.stringify({
      dvm_id: props.dvm?.id,
      dvm_pubkey: props.dvm?.author,
      kind: props.type,
    });

    const notes = await fetcher(
      account?.publicKey,
      spec,
      `note_dvm_preview_${APP_ID}`,
      0,
      3,
    );

    updateStore(props.type, () => [ ...notes ]);
  }

  const clearPreview = () => {
    updateStore(() => ({
      notes: [],
      reads: [],
    }));
  }

  createEffect(() => {
    if (props.dvm) {
      getFeedPreview();
    } else {
      clearPreview();
    }
  })

  return (
    <div
      class={styles.feedMarketplacePreview}
    >
      <div class={styles.dvmCaption}>
        <FeedMarketItem
          dvm={props.dvm}
          stats={props.stats}
        />
      </div>

      <div class={styles.dvmList}>
        <Switch>
          <Match when={props.type === 'notes'}>
            <For each={store.notes}>
              {note => <Note
                note={note}
                shorten={true}
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
    </div>
  )
}

export default FeedMarketPlacePreview;