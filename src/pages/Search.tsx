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

const Search: Component = () => {
  const params = useParams();
  const search = useSearchContext();
  const account = useAccountContext();
  const intl = useIntl();

  const query = () => decodeURI(params.query).replaceAll('%23', '#');

  createEffect(() => {
    if (isConnected() && query().length > 0 && search?.contentQuery !== query()) {
      search?.actions.setContentQuery(query());
      search?.actions.findContent(query());
      search?.actions.findContentUsers(query(), account?.publicKey);
    }
  });

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

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(
            {
              id: 'pages.search.title',
              defaultMessage: 'search for "{query}"',
              description: 'Title of the Search page',
            },
            { query: query() || '' },
          )}
        </div>
      </div>

      <div class={styles.searchContent}>
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
      </div>
    </>
  )
}

export default Search;
