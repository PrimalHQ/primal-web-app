import {
  Component,
  createEffect,
  createSignal,
  For,
  on,
  onMount,
  Show,
} from 'solid-js';
import Note from '../components/Note/Note';
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
import SearchComponent from '../components/Search/Search';
import { toast as t, search as tSearch  } from '../translations';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import SaveFeedDialog from '../components/SaveFeedDialog/SaveFeedDialog';
import { useAdvancedSearchContext } from '../contexts/AdvancedSearchContext';
import Paginator from '../components/Paginator/Paginator';

const Search: Component = () => {
  const params = useParams();
  const basicSearch = useSearchContext();
  const search = useAdvancedSearchContext();
  const account = useAccountContext();
  const intl = useIntl();

  const query = () => decodeURI(params.query).replaceAll('%23', '#');

  const [openAddFeedDialog, setAddFeedDialog] = createSignal<boolean>(false);

  createEffect(on(query, (v, p) => {
    if (v === p) return;

    search?.actions.clearSearch();
    search?.actions.findContent(v);
    basicSearch?.actions.findContentUsers(v);
  }));

  return (
    <>
      <PageTitle title={
        intl.formatMessage(
          tSearch.title,
          { query: query() || '' },
        )}
      />

      <StickySidebar>
        <SearchSidebar users={basicSearch?.contentUsers || []} />
      </StickySidebar>

      <Wormhole
        to="search_section"
      >
        <SearchComponent />
      </Wormhole>

      <PageCaption extended={true}>
        <div class={styles.searchHeader}>
          <div class={styles.caption}>
            <div title={intl.formatMessage(
                tSearch.title,
                { query: query() || '' },
              )}>
              {intl.formatMessage(
                tSearch.title,
                { query: query() || '' },
              )}
            </div>
          </div>
          <div class={styles.addToFeed}>
            <SaveFeedDialog
              open={openAddFeedDialog()}
              setOpen={setAddFeedDialog}
              query={query()}
              feedType={'home'}
            />
          </div>
        </div>
      </PageCaption>


      <div class={styles.searchContent}>
        <Show
          when={!search?.isFetchingContent || search.notes.length > 0}
          fallback={<div class={styles.loader}><Loader /></div>}
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
              {note => <Note
                note={note}
                shorten={true}
                onRemove={(id: string) => {
                  search?.actions.removeEvent(id, 'notes');
                }}
              />}
            </For>
          </Show>
        </Show>
        <Paginator
          loadNextPage={() => search?.actions.fetchContentNextPage(query())}
        />
      </div>
    </>
  )
}

export default Search;
