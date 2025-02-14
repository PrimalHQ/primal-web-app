import { A } from '@solidjs/router';
import { Component, For, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import Search from '../components/Search/Search';
import Wormhole from '../components/Wormhole/Wormhole';
import { getAdvancedFeeds } from '../lib/search';
import { subsTo } from '../sockets';
import styles from './FeedsTest.module.scss';

export type SearchFeed = {
  id: string,
  name: string,
  description: string,
  specification: any,
  category: string
};

const FeedsTest: Component = () => {

  const [noteFeeds, setNoteFeeds] = createStore<SearchFeed[]>([]);
  const [articleFeeds, setArticleFeeds] = createStore<SearchFeed[]>([]);

  onMount(() => {
    fetchAdvancedFeeds();
  })

  const fetchAdvancedFeeds = () => {
    const subId = `advanced_feeds_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content.content || '[]') as SearchFeed[];

        let notes = feeds.filter(f => f.category === 'notes');
        let articles = feeds.filter(f => f.category === 'reads');

        setNoteFeeds(() => [...notes]);
        setArticleFeeds(() => [...articles]);
      },
      onEose: () =>{
        unsub();
      },
    });

    getAdvancedFeeds(subId);
  }

  return (
    <>
      <PageTitle title="Feeds" />
      <Wormhole
        to="search_section"
      >
        <Search />
      </Wormhole>
      <PageCaption title="Feeds" />

      <div class={styles.page}>
        <Show when={noteFeeds.length > 0}>
          <div class={styles.section}>
            <div class={styles.caption}>Notes</div>
            <div class={styles.list}>
              <For each={noteFeeds}>
                {feed => (
                  <div class={styles.feed}>
                    <div class={styles.label}>
                      <A href={`/feeds/${encodeURIComponent(feed.id)}`} >{feed.name}</A>
                    </div>
                    <div class={styles.description}>
                      {feed.description}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={articleFeeds.length > 0}>
          <div class={styles.section}>
            <div class={styles.caption}>Reads</div>
            <div class={styles.list}>
              <For each={articleFeeds}>
                {feed => (
                  <div class={styles.feed}>
                    <div class={styles.label}>
                      <A href={`/feeds/${encodeURIComponent(feed.id)}`} >{feed.name}</A>
                    </div>
                    <div class={styles.description}>
                      {feed.description}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </>
  );
}

export default FeedsTest;
