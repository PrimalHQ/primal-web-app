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
import SearchComponent from '../components/Search/Search';
import { toast as t, search as tSearch, actions as tActions  } from '../translations';
import PageCaption from '../components/PageCaption/PageCaption';
import AddToHomeFeedButton from '../components/AddToHomeFeedButton/AddToHomeFeedButton';
import PageTitle from '../components/PageTitle/PageTitle';

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
      tSearch.feedLabel,
      { query: q || '' },
    );

    const feed = { name, hex };

    settings?.actions.addAvailableFeed(feed);

    toaster?.sendSuccess(intl.formatMessage(
      t.addFeedToHomeSuccess,
      { name },
    ));
  };

  return (
    <>
      <PageTitle title={
        intl.formatMessage(
          tSearch.title,
          { query: query() || '' },
        )}
      />

      <StickySidebar>
        <SearchSidebar users={search?.contentUsers || []} />
      </StickySidebar>

      <Wormhole
        to="search_section"
      >
        <SearchComponent />
      </Wormhole>

      <PageCaption>
        <div class={styles.caption}>
          {intl.formatMessage(
            tSearch.title,
            { query: query() || '' },
          )}
        </div>
        <AddToHomeFeedButton
          disabled={hasFeedAtHome()}
          onAdd={addToHomeFeed}
          activeLabel={intl.formatMessage(tActions.addFeedToHome)}
          disabledLabel={intl.formatMessage(tActions.disabledAddFeedToHome)}
        />
      </PageCaption>


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
                  intl.formatMessage(tSearch.noResults)
                }
              </div>
            }
          >
            <For each={search?.notes} >
              {note => <Note note={note} shorten={true} />}
            </For>
          </Show>
        </Show>
      </div>
    </>
  )
}

export default Search;
