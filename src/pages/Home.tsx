import {
  Component,
  createReaction,
  For,
  Match,
  onMount,
  Show,
  Switch
} from 'solid-js';
import Note from '../components/Note/Note';
import styles from './Home.module.scss';
import HomeHeader from '../components/HomeHeader/HomeHeader';
import Loader from '../components/Loader/Loader';
import Paginator from '../components/Paginator/Paginator';
import HomeSidebar from '../components/HomeSidebar/HomeSidebar';
import Branding from '../components/Branding/Branding';
import HomeHeaderPhone from '../components/HomeHeaderPhone/HomeHeaderPhone';
import Wormhole from '../components/Wormhole/Wormhole';
import { scrollWindowTo } from '../lib/scroll';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useHomeContext } from '../contexts/HomeContext';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useAccountContext } from '../contexts/AccountContext';
import { useIntl } from '@cookbook/solid-intl';
import { isConnected } from '../sockets';


const Home: Component = () => {

  const context = useHomeContext();
  const settings = useSettingsContext();
  const account = useAccountContext();
  const intl = useIntl();

  const isPageLoading = () => context?.isFetching;

  // const onConnectionEstablished = createReaction(() => {
  //   context?.actions.selectFeed(settings?.availableFeeds[0]);
  // });


  // const onPubKeyFound = createReaction(() => {
  //   if (!isConnected()) {
  //     onConnectionEstablished(() => isConnected());
  //     return;
  //   }
  //   context?.actions.selectFeed(settings?.availableFeeds[0]);
  // });

  // onMount(() => {
  //   scrollWindowTo(context?.scrollTop);

  //   if (!context?.selectedFeed) {
  //     context?.actions.selectFeed(settings?.availableFeeds[0]);
  //   }
  //   onPubKeyFound(() => account?.publicKey);
  // });

  return (
    <div class={styles.homeContent}>
      <Wormhole
        to="branding_holder"
      >
        <Branding small={false} isHome={true} />
      </Wormhole>

      <div class={styles.normalCentralHeader}>
        <HomeHeader />
      </div>

      <div class={styles.phoneCentralHeader}>
        <HomeHeaderPhone />
      </div>

      <StickySidebar>
        <HomeSidebar />
      </StickySidebar>

      <Show
        when={context?.notes && context.notes.length > 0}
      >
        <For each={context?.notes} >
          {note => <Note note={note} />}
        </For>
      </Show>

      <Switch>
        <Match
          when={!isPageLoading() && context?.notes && context?.notes.length === 0}
        >
          <div class={styles.noContent}>
            <Loader />
          </div>
        </Match>
        <Match
          when={!isPageLoading()}
        >
          <div class={styles.endOfContent}>
            {intl.formatMessage({
              id: 'placeholders.endOfFeed',
              defaultMessage: 'Your reached the end. You are a quick reader',
              description: 'Message displayed when user reaches the end of the feed',
            })}
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
      <Paginator loadNextPage={context?.actions.fetchNextPage}/>
    </div>
  )
}

export default Home;
