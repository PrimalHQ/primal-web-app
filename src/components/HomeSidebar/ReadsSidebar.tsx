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
import { getArticleThread, getFeaturedAuthors, getReadsTopics } from '../../lib/feed';
import { fetchArticles, fetchUserProfile } from '../../handleNotes';
import { getParametrizedEvent, getParametrizedEvents } from '../../lib/notes';
import { decodeIdentifier } from '../../lib/keys';
import ArticleShort from '../ArticlePreview/ArticleShort';
import AuthorSubscribe from '../AuthorSubscribe/AuthorSubscribe';
import { A } from '@solidjs/router';
import { getRandomIntegers, isDev } from '../../utils';
import ArticlePreviewSidebarSkeleton from '../Skeleton/ArticlePreviewSidebarSkeleton';
import ReadsFeaturedTopicsSkeleton from '../Skeleton/ReadsFeaturedTopicsSkeleton';
import { Transition } from 'solid-transition-group';
import { minKnownProfiles } from '../../constants';

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

  // const [topPicks, setTopPicks] = createStore<PrimalArticle[]>([]);
  // const [topics, setTopics] = createStore<string[]>([]);
  const [featuredAuthor, setFeautredAuthor] = createSignal<string>();

  const [isFetching, setIsFetching] = createSignal(false);
  const [isFetchingTopics, setIsFetchingTopics] = createSignal(false);
  const [isFetchingAuthors, setIsFetchingAuthors] = createSignal(false);

  const [got, setGot] = createSignal(false);

  const getTopics = () => {
    if (!reads) return;
    if (reads.topics.length > 0) return;

    const subId = `reads_topics_${APP_ID}`;


    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const topics = JSON.parse(content.content || '[]') as string[];

        reads?.actions.setTopics(topics);
      },
      onEose: () => {
        setIsFetchingTopics(() => false);
        unsub();
      }
    })
    setIsFetchingTopics(() => true);
    getReadsTopics(subId);
  }

  const getFeaturedAuthor = () => {
    if (!reads) return;
    if (reads.featuredAuthor) return;

    const subId = `reads_fa_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const authors = JSON.parse(content.content || '[]') as string[];

        // const author = '1d22e00c32fcf2eb60c094f89f5cfa3ccd38a1b317dccda9b296fa6f50e00d0e';
        // setFeautredAuthor(() => author);

        // const author = 'a8eb6e07bf408713b0979f337a3cd978f622e0d41709f3b74b48fff43dbfcd2b';
        // setFeautredAuthor(() => author);

        // const author = '88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079';
        // setFeautredAuthor(() => author);

        // const author = 'fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52';
        // setFeautredAuthor(() => author);

        // const author = '3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24';
        // setFeautredAuthor(() => author);

        setFeautredAuthor(() => authors[Math.floor(Math.random() * authors.length)]);
      },
      onEose: () => {
        setIsFetchingAuthors(() => false);
        unsub();
      }
    })
    setIsFetchingAuthors(() => true);
    getFeaturedAuthors(subId);
  }

  const getAuthorData = async (pubkey: string) => {
    const userNpub = account?.publicKey || minKnownProfiles.names['primal'];
    if (!userNpub || !pubkey) return;

    const subId = `reads_fpi_${APP_ID}`;

    setIsFetching(() => true);

    const profile = await fetchUserProfile(userNpub, pubkey, subId);

    setIsFetching(() => false);

    reads?.actions.setFeaturedAuthor(profile);
  };

  onMount(() => {
    if (account?.isKeyLookupDone && reads?.recomendedReads.length === 0) {
      reads.actions.doSidebarSearch('');
    }

    if (account?.isKeyLookupDone) {
      getTopics();
      getFeaturedAuthor();
    }
  });

  createEffect(() => {
    if (!reads) return;
    const pubkey = featuredAuthor();
    if (!pubkey) return;

    getAuthorData(pubkey);
  });


  // createEffect(() => {
  //   const rec = reads?.recomendedReads || [];

  //   if (rec.length > 0 && !got()) {
  //     setGot(() => true);
  //     let randomIndices = getRandomIntegers(0, rec.length, 3);

  //     const reads = [ ...randomIndices ].map(i => rec[i]);

  //     getRecomendedArticles(reads)
  //   }
  // });

  // const getRecomendedArticles = async (ids: string[]) => {
  //   if (!reads) return;
  //   if (reads.topPicks.length > 0) return;

  //   const subId = `reads_picks_${APP_ID}`;

  //   setIsFetching(() => true);

  //   const articles = await fetchArticles(ids,subId);

  //   setIsFetching(() => false);

  //   reads.actions.setTopPicks(articles);
  // };

  return (
    <div id={props.id} class={styles.readsSidebar}>
      <Show when={account?.isKeyLookupDone}>
        <div class={styles.headingPicks}>
          Featured Author
        </div>

        <div class={styles.section}>
          <AuthorSubscribe author={reads?.featuredAuthor} />
        </div>

        <div class={styles.headingPicks}>
          Featured Reads
        </div>

        <div class={styles.sectionTopPicks}>

        <Transition name="slide-fade">
          <Show
            when={reads && reads.topPicks.length > 0}
            fallback={
              <Show when={!reads || reads.topPicks.length === 0}>
                <div>
                  <For each={Array(3)}>
                    {() => <div class="animated"><ArticlePreviewSidebarSkeleton /></div>}
                  </For>
                </div>
              </Show>
            }
          >
            <div>
              <For
                each={reads?.topPicks}
              >
                {(note) =>
                  <div class="animated">
                    <ArticleShort article={note} />
                  </div>
                }
              </For>
            </div>
          </Show>
        </Transition>
        </div>


        <div class={styles.headingPicks}>
          Topics
        </div>

        <div class={styles.sectionTopics}>
          <Transition name="slide-fade">
            <Show
              when={reads && reads.topics.length > 0}
              fallback={
                <Show when={!reads || reads.topics.length === 0}>
                  <div class="animated">
                    <ReadsFeaturedTopicsSkeleton />
                  </div>
                </Show>
              }
            >
              <div>
                <For
                  each={reads?.topics}
                >
                  {(topic) => <A href={`/reads/${topic}`} class={styles.topic}>{topic}</A>}
                </For>
              </div>
            </Show>
          </Transition>
        </div>

      </Show>
    </div>
  );
}

export default hookForDev(ReadsSidebar);
