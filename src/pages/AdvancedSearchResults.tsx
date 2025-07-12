import { A, useNavigate, useParams } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';
import Loader from '../components/Loader/Loader';
import Note from '../components/Note/Note';
import PageTitle from '../components/PageTitle/PageTitle';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import styles from './FeedsTest.module.scss';
import { useAdvancedSearchContext } from '../contexts/AdvancedSearchContext';
import { Kind } from '../constants';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import Paginator from '../components/Paginator/Paginator';
import { TextField } from '@kobalte/core/text-field';
import ButtonLink from '../components/Buttons/ButtonLink';
import SaveFeedDialog from '../components/SaveFeedDialog/SaveFeedDialog';
import { setAdvSearchState } from './AdvancedSearch';
import AdvancedSearchCommadTextField from '../components/AdvancedSearch/AdvancedSearchCommadTextField';
import { useAccountContext } from '../contexts/AccountContext';


const AdvancedSearchResults: Component = () => {
  const params = useParams()
  const search = useAdvancedSearchContext();
  const navigate = useNavigate();
  const account = useAccountContext();

  const [openAddFeedDialog, setAddFeedDialog] = createSignal<boolean>(false);
  const [allowCommandChange, setAllowCommandChange] = createSignal(false);
  const [queryString, setQueryString] = createSignal('');

  const isPremium = () => ['premium', 'premium-legend'].includes(account?.membershipStatus.tier || '');

  createEffect(on(() => params.query, (v, p) => {
    if (!v || v === p) return;

    let q = decodeURIComponent(params.query);

    if (!q.includes(' pas:1')) {
      q += ' pas:1';
    }

    setQueryString(() => q);
    search?.actions.clearSearch();
    search?.actions.findContent(q);
  }));

  const kind = () => {
    const isRead = queryString().search(/kind:30023/) >= 0;

    if (isRead) return Kind.LongForm;

    return 1;
  }

  createEffect(on(() => params.query, (v, p) => {
    if (!v || v === p) return;

    setAdvSearchState('command', () => v);
  }))

  const feedType = () => [Kind.LongForm].includes(kind()) ?
  'reads' : 'home';

  const submitCommandChange = (command: string) => {
    if (command === queryString()) {
      search?.actions.clearSearch();
      search?.actions.findContent(command);
      return false;
    }

    navigate(`/asearch/${encodeURIComponent(queryString())}`);
  }

  return (
    <>
      <PageTitle title="Összetett keresés eredmények"/>

        <div class={styles.advancedSerchResultsHeader}>
          <div class={styles.caption}>
            <div>keresés eredmények</div>
          </div>
          <div class={styles.actions}>

            <SaveFeedDialog
              open={openAddFeedDialog()}
              setOpen={setAddFeedDialog}
              query={queryString()}
              feedType={feedType()}
            />

            <ButtonLink
              onClick={() => navigate('/asearch', { state: { query: queryString() } })}
            >
              Vissza az összetett kereséshez
            </ButtonLink>
          </div>
        </div>

      <StickySidebar>
        <AdvancedSearchCommadTextField
          command={queryString()}
          onCommandChange={setQueryString}
          submitCommandChange={submitCommandChange}
        />
      </StickySidebar>

      <div class={styles.list}>
        <Switch>
          <Match when={[Kind.LongForm, Kind.LongFormShell].includes(kind())}>
            <For each={search?.reads} >
              {article => <ArticlePreview article={article} />}
            </For>
          </Match>
          <Match when={[Kind.Text].includes(kind())}>
            <For each={search?.notes} >
              {note => <Note note={note} shorten={true} />}
            </For>
          </Match>
          <Match when={!search?.isFetchingContent && (search?.notes.length === 0 || search?.reads.length === 0)}>
            <div class={styles.noResults}>
              Nincs találat

              <For each={search?.errors}>
                {error => <div class={styles.error}>{error}</div>}
              </For>
            </div>
          </Match>
        </Switch>

        <Show when={search?.isFetchingContent}><Loader /></Show>

        <Show when={!isPremium()}>
          <div class={styles.moreSearchInfo}>
            <div>
              <div class={styles.moreSearchCaption}>
                Ez egy Primal Premium hírfolyam.
              </div>
              <div class={styles.moreSearchDescription}>
                Vásárolj előfizetést, hogy Noszter power user legyél és támogasd a munkánkat:
              </div>
            </div>

            <A href='/premium' class={styles.premiumLink}>Legyél Primal Premium előfizető</A>
          </div>
        </Show>
      </div>

      <Paginator loadNextPage={() => search?.actions.fetchContentNextPage(queryString())} />
    </>
  )
}

export default AdvancedSearchResults;
