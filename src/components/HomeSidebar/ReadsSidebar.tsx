import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';

import styles from './HomeSidebar.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useReadsContext } from '../../contexts/ReadsContext';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { getFeaturedAuthors, getReadsTopics } from '../../lib/feed';
import { fetchUserProfile } from '../../handleNotes';
import ArticleShort from '../ArticlePreview/ArticleShort';
import AuthorSubscribe from '../AuthorSubscribe/AuthorSubscribe';
import { A } from '@solidjs/router';
import ArticlePreviewSidebarSkeleton from '../Skeleton/ArticlePreviewSidebarSkeleton';
import ReadsFeaturedTopicsSkeleton from '../Skeleton/ReadsFeaturedTopicsSkeleton';
import { Transition } from 'solid-transition-group';
import { minKnownProfiles } from '../../constants';
import { accountStore } from '../../stores/accountStore';


const ReadsSidebar: Component< { id?: string } > = (props) => {

  const reads= useReadsContext();

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
    const userNpub = accountStore.publicKey || minKnownProfiles.names['primal'];
    if (!userNpub || !pubkey) return;

    const subId = `reads_fpi_${APP_ID}`;

    setIsFetching(() => true);

    const profile = await fetchUserProfile(userNpub, pubkey, subId);

    setIsFetching(() => false);

    reads?.actions.setFeaturedAuthor(profile);
  };

  onMount(() => {
    if (accountStore.isKeyLookupDone && reads?.recomendedReads.length === 0) {
      reads.actions.doSidebarSearch('');
    }

    if (accountStore.isKeyLookupDone) {
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

  return (
    <div id={props.id} class={styles.readsSidebar}>
      <Show when={accountStore.isKeyLookupDone}>
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
