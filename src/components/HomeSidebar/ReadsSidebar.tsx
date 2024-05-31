import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';

import {
  EventCoordinate,
  PrimalArticle,
  SelectionOption
} from '../../types/primal';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import SelectionBox from '../SelectionBox/SelectionBox';
import Loader from '../Loader/Loader';
import { readHomeSidebarSelection, saveHomeSidebarSelection } from '../../lib/localStore';
import { useHomeContext } from '../../contexts/HomeContext';
import { useReadsContext } from '../../contexts/ReadsContext';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { getArticleThread, getReadsTopics } from '../../lib/feed';
import { fetchArticles } from '../../handleNotes';
import { getParametrizedEvent, getParametrizedEvents } from '../../lib/notes';
import { decodeIdentifier } from '../../lib/keys';
import ArticleShort from '../ArticlePreview/ArticleShort';

const sidebarOptions = [
  {
    label: 'Trending 24h',
    value: 'trending_24h',
  },
  {
    label: 'Trending 12h',
    value: 'trending_12h',
  },
  {
    label: 'Trending 4h',
    value: 'trending_4h',
  },
  {
    label: 'Trending 1h',
    value: 'trending_1h',
  },
  {
    label: '',
    value: '',
    disabled: true,
    separator: true,
  },

  {
    label: 'Most-zapped 24h',
    value: 'mostzapped_24h',
  },
  {
    label: 'Most-zapped 12h',
    value: 'mostzapped_12h',
  },
  {
    label: 'Most-zapped 4h',
    value: 'mostzapped_4h',
  },
  {
    label: 'Most-zapped 1h',
    value: 'mostzapped_1h',
  },
];

const ReadsSidebar: Component< { id?: string } > = (props) => {

  const account = useAccountContext();
  const reads= useReadsContext();

  const [topPicks, setTopPicks] = createStore<PrimalArticle[]>([]);
  const [topics, setTopics] = createStore<string[]>([]);

  const [isFetching, setIsFetching] = createSignal(false);
  const [isFetchingTopics, setIsFetchingTopics] = createSignal(false);



  const [got, setGot] = createSignal(false);

  const getTopics = () => {
    const subId = `reads_topics_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const topics = JSON.parse(content.content || '[]') as string[];

        setTopics(() => [...topics]);
      },
      onEose: () => {
        setIsFetchingTopics(() => false);
        unsub();
      }
    })
    setIsFetchingTopics(() => true);
    getReadsTopics(subId);
  }

  onMount(() => {
    if (account?.isKeyLookupDone && reads?.recomendedReads.length === 0) {
      reads.actions.doSidebarSearch('');
    }

    if (account?.isKeyLookupDone) {
      getTopics()
    }
  });


  createEffect(() => {
    const rec = reads?.recomendedReads || [];

    if (rec.length > 0 && !got()) {
      setGot(() => true);
      let randomIndices = new Set<number>();

      while (randomIndices.size < 3) {
        const randomIndex = Math.floor(Math.random() * rec.length);
        randomIndices.add(randomIndex);
      }

      const reads = [ ...randomIndices ].map(i => rec[i]);

      getRecomendedArticles(reads)
    }
  });

  const getRecomendedArticles = async (ids: string[]) => {
    if (!account?.publicKey) return;

    const subId = `reads_picks_${APP_ID}`;

    setIsFetching(() => true);

    const articles = await fetchArticles(account.publicKey, ids,subId);

    setIsFetching(() => false);

    setTopPicks(() => [...articles]);
  };

  return (
    <div id={props.id} class={styles.readsSidebar}>
      <Show when={account?.isKeyLookupDone}>
        <div class={styles.headingPicks}>
          Top Picks
        </div>

        <Show
          when={!isFetching()}
          fallback={
            <Loader />
          }
        >
          <div class={styles.section}>
            <For each={topPicks}>
              {(note) => <ArticleShort article={note} />}
            </For>
          </div>
        </Show>


        <div class={styles.headingPicks}>
          Topics
        </div>

        <Show
          when={!isFetchingTopics()}
          fallback={
            <Loader />
          }
        >
          <div class={styles.section}>
            <For each={topics}>
              {(topic) => <div class={styles.topic}>{topic}</div>}
            </For>
          </div>
        </Show>

      </Show>
    </div>
  );
}

export default hookForDev(ReadsSidebar);
