import { paragraphSchema } from '@milkdown/preset-commonmark';
import { A, useNavigate, useParams } from '@solidjs/router';
import { Component, createEffect, For, Match, onMount, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import Loader from '../components/Loader/Loader';
import Note from '../components/Note/Note';
import PageCaption from '../components/PageCaption/PageCaption';
import Paginator from '../components/Paginator/Paginator';
import { Kind } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { fetchArticlesFeed, fetchNotesFeed } from '../handleFeeds';
import { getAdvancedFeeds, getFeedItems } from '../lib/search';
import { subsTo } from '../sockets';
import { PrimalArticle, PrimalNote } from '../types/primal';
import { SearchFeed } from './FeedsTest';
import styles from './FeedsTest.module.scss';

export type FeedRange = { order_by: string, since: number, until: number };

const FeedsQueryTest: Component = () => {
  const params = useParams();
  const account = useAccountContext();
  const navigate = useNavigate();

  const [feed, setFeed] = createStore<SearchFeed>({
    id: '',
    name: '',
    description: '',
    specification: '',
    category: ''
  });

  const [items, setItems] = createStore<PrimalNote[] | PrimalArticle[]>([]);

  createEffect(() => {
    fetchAdvancedFeeds(params.query);
  });

  createEffect(() => {
    if (feed.id.length > 0) {
      setItems(() => []);
      fetchFeedItems();
    }
  });

  const fetchAdvancedFeeds = (query: string) => {
    const subId = `advanced_feed_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content.content || '[]') as SearchFeed[];

        let item = feeds.find(f => f.id === query);

        setFeed(() => ({...item}));
      },
      onEose: () =>{
        unsub();
      },
    });

    getAdvancedFeeds(subId);
  }

  const fetchFeedItems = async (until = 0, offset = 0) => {
    const subId = `feed_items_${feed.id}_${APP_ID}`;

    if (feed.category === 'notes') {
      const notes = await fetchNotesFeed(
        account?.publicKey,
        feed.specification,
        subId,
        20,
        until,
        offset,
      );

      // @ts-ignore
      setItems((its) => [ ...its, ...notes]);
      return;
    }

    if (feed.category === 'reads') {
      const notes = await fetchArticlesFeed(
        account?.publicKey,
        feed.specification,
        subId,
        20,
        until,
        offset,
      );

      // @ts-ignore
      setItems((its) => [ ...its, ...notes]);
      return;
    }
  };

  const onNextPage = () => {
    if (feed.category === 'notes') {
      const lastItem = items[items.length - 1] as PrimalNote;
      const lastDate = lastItem.msg.created_at;
      const offset = (items as PrimalNote[]).filter(i => i.msg.created_at === lastDate).length;

      fetchFeedItems(lastItem.msg.created_at, offset);
    }

    if (feed.category === 'reads') {
      const lastItem = items[items.length - 1] as PrimalArticle;
      const lastDate = lastItem.published;
      const offset = (items as PrimalArticle[]).filter(i => i.published === lastDate).length;

      fetchFeedItems(lastItem.published, offset);
    }
  }

  return (
    <>
      <Show when={feed.id.length > 0} fallback={<Loader />}>
        <PageCaption title={feed.name} />

        <div class={styles.page}>
          <div class={styles.section}>
            <div class={styles.feedDescription}>{feed.description}</div>
          </div>
          <div class={`${styles.section} ${styles.borderless}`}>
            <div class={styles.list}>
             <For each={items}>
              {item => (
                <Switch>
                  <Match when={feed.category === 'notes'}>
                    <Note
                      note={item}
                      noteType="feed"
                      // @ts-ignore
                      // setItems((rs) => rs.filter(r => r.noteId !== id))
                    />
                  </Match>
                  <Match when={feed.category === 'reads'}>
                    <ArticlePreview
                      article={item}
                      onClick={navigate}
                      onRemove={(id: string) => {
                        // @ts-ignore
                        // setItems((rs) => rs.filter(r => r.noteId !== id))
                      }}
                    />
                  </Match>
                </Switch>)
              }
             </For>
             <Paginator loadNextPage={onNextPage} />
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

export default FeedsQueryTest;
