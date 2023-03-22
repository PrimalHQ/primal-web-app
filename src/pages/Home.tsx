import { Component, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Home.module.scss';
import { useFeedContext } from '../contexts/FeedContext';
import { Portal } from 'solid-js/web';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import Loader from '../components/Loader/Loader';
import Paginator from '../components/Paginator/Paginator';
import TrendingNotes from '../components/TrendingNotes/TrendingNotes';
import Branding from '../components/Branding/Branding';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';

const Home: Component = () => {

  const context = useFeedContext();

  const [mounted, setMounted] = createSignal(false);

  onMount(async () => {

    setTimeout(() => {
      // Temporary fix for Portal rendering on initial load.
      setMounted(true);

      window.scrollTo({
        top: context?.data.scrollTop,
        left: 0,
        // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
        behavior: 'instant',
      });
    }, 0);
  });

  const isPageLoading = () => context?.data.isFetching;

  return (
    <div class={styles.homeContent}>
      <Show when={mounted()}>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} isHome={true} />
        </Portal>

        <div class={styles.normalCentralHeader}>
          <HomeHeader />
        </div>

        <div class={styles.phoneCentralHeader}>
          <HomeHeaderPhone />
        </div>
        <Portal
          mount={document.getElementById("right_sidebar") as Node}
        >
          <TrendingNotes />
        </Portal>

        <Show
          when={context?.data?.posts && context.data.posts.length > 0}
        >
          <For each={context?.data?.posts} >
            {(note) => {
              return <Note
                note={note}
              />
            }}
          </For>
        </Show>

        <Switch>
          <Match
            when={!isPageLoading() && context?.data?.posts && context.data.posts.length === 0}
          >
            <div class={styles.noContent}>
              <Loader />
            </div>
          </Match>
          <Match
            when={!isPageLoading()}
          >
            <div class={styles.endOfContent}>
              You reached the end. You are a quick reader.
            </div>
          </Match>
          <Match
            when={isPageLoading()}
          >
            <div class={styles.noContent}>
              <Loader />
            </div>
          </Match>
        </Switch>
      </Show>
      <Paginator loadNextPage={context?.actions?.loadNextPage}/>
    </div>
  )
}

export default Home;
