import {
  Component,
  createEffect,
  For,
  Show,
} from 'solid-js';
import Note from '../components/Note/Note';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { useAccountContext } from '../contexts/AccountContext';
import { useIntl } from '@cookbook/solid-intl';
import { isConnected } from '../sockets';
import { useParams } from '@solidjs/router';
import styles from './Search.module.scss';
import { useSearchContext } from '../contexts/SearchContext';
import SearchSidebar from '../components/SearchSidebar/SearchSidebar';
import Loader from '../components/Loader/Loader';
import { useToastContext } from '../components/Toaster/Toaster';
import { useSettingsContext } from '../contexts/SettingsContext';
import { scopeLabels, timeframeLabels } from '../constants';
import SearchComponent from '../components/Search/Search';

const Search: Component = () => {
  const params = useParams();
  const search = useSearchContext();
  const account = useAccountContext();
  const toaster = useToastContext();
  const settings = useSettingsContext();
  const intl = useIntl();

  const query = () => decodeURI(params.query).replaceAll('%23', '#');

  createEffect(() => {
    if (isConnected() && query().length > 0 && search?.contentQuery !== query()) {
      search?.actions.setContentQuery(query());
      search?.actions.findContent(query());
      search?.actions.findContentUsers(query(), account?.publicKey);
    }
  });

  const hasFeedAtHome = () => {
    const hex = `search;${decodeURI(params.query)}`;

    return !!settings?.availableFeeds.find(f => f.hex === hex);
  };

  const addToHomeFeed = () => {
    const q = decodeURI(params.query).replaceAll('%23', '#')
    const hex = `search;${q}`;
    const name = intl.formatMessage(
      {
        id: 'feed.search.label',
        defaultMessage: 'Search: {query}',
        description: 'Label for a search results feed',
      },
      { query: q || '' },
    );

    const feed = { name, hex };

    settings?.actions.addAvailableFeed(feed);

    toaster?.sendSuccess(intl.formatMessage(
      {
        id: 'toasts.addFeedToHome.success',
        defaultMessage: '"{name}" has been added to your home page',
        description: 'Toast message confirming successfull adding of the feed to home to the list of available feeds',
      },
      { name },
    ));
  };

  return (
    <>
      <Wormhole
        to="branding_holder"
      >
        <Branding small={false} />
      </Wormhole>

      <StickySidebar>
        <SearchSidebar users={search?.contentUsers || []} />
      </StickySidebar>

      <Wormhole
        to="search_section"
      >
        <SearchComponent />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div class={styles.caption}>
          {intl.formatMessage(
            {
              id: 'pages.search.title',
              defaultMessage: 'search for "{query}"',
              description: 'Title of the Search page',
            },
            { query: query() || '' },
          )}
        </div>
        <div class={styles.addToFeed}>
          <Show
            when={!hasFeedAtHome()}
            fallback={
              <div class={styles.noAdd}>
                {intl.formatMessage(
                  {
                    id: 'actions.homeFeedAdd.disabled',
                    defaultMessage: 'Available on your home page',
                    description: 'Add feed to home label, when feed is already added',
                  }
                )}
              </div>
            }
          >
            <button
              class={styles.addButton}
              onClick={addToHomeFeed}
            >
              <span>+</span>
              {intl.formatMessage(
                {
                  id: 'actions.homeFeedAdd.generic',
                  defaultMessage: 'add this feed to my home page',
                  description: 'Add feed to home, button label',
                }
              )}
            </button>
          </Show>
        </div>
      </div>

      <div class={styles.searchContent}>
        <Show
          when={!search?.isFetchingContent}
          fallback={<Loader />}
        >
          <Show
            when={search?.notes && search.notes.length > 0}
            fallback={
              <div class={styles.noResults}>
                {
                  intl.formatMessage({
                  id: 'search.noResults',
                  defaultMessage: 'No results found',
                  description: 'Message shown when no search results were found'
                })
                }
              </div>
            }
          >
            <For each={search?.notes} >
              {note => <Note note={note} />}
            </For>
          </Show>
        </Show>
      </div>
    </>
  )
}

export default Search;
