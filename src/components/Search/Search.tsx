import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useSearchContext } from '../../contexts/SearchContext';
import { hexToNpub } from '../../lib/keys';
import { truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';

import styles from './Search.module.scss';
import SearchOption from './SearchOption';


const Search: Component = () => {

  const toaster = useToastContext();
  const search = useSearchContext();
  const navigate = useNavigate();
  const intl = useIntl();

  const [query, setQuery] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);

  const queryUrl = () => query().replaceAll('#', '%23');

  const onSearch = (e: SubmitEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;

    const data = new FormData(form);

    const q = data.get('searchQuery') as string || '';


    if (q.length > 0) {
      navigate(`/search/${q}`);
      onBlur();
      resetQuery();
    }
    else {
      toaster?.sendInfo(intl.formatMessage({
        id: 'search.invalid',
        defaultMessage: 'Please enter search term.',
        description: 'Alert letting the user know that the search term is empty',
      }))
    }
    return false;
  }

  const onInput = (e: InputEvent) => {
    setIsFocused(true);
    debounce(() => {
      // @ts-ignore
      setQuery(e.target?.value || '');
    }, 500);
  };

  const onFocus = (e: FocusEvent) => {
    setIsFocused(true);
  }

  const onBlur = (e?: FocusEvent) => {
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  }

  const resetQuery = () => {
    setQuery('');
  };

  const userName = (user: PrimalUser) => {
    return truncateNpub(
      // @ts-ignore
      user.display_name ||
      user.displayName ||
      user.name ||
      user.npub ||
      hexToNpub(user.pubkey) || '');
  };

  createEffect(() => {
    if (!isFocused()) {
      return;
    }

    if (query().length === 0) {
      search?.actions.getRecomendedUsers();
      return;
    }

    search?.actions.findUsers(query());
  });

  return (
    <div class={styles.searchHolder}>
      <form
        class={styles.search}
        onsubmit={onSearch}
        autocomplete="off"
      >
        <div class={styles.searchIcon}></div>
        <input
          type='text'
          name='searchQuery'
          placeholder={
            intl.formatMessage(
              {
                id: 'placeholders.search',
                defaultMessage: 'search',
                description: 'Search input placeholder',
              }
            )
          }
          value={query()}
          onInput={onInput}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onFocus}
        />
      </form>

      <Show when={isFocused()}>
        <div class={styles.searchSuggestions}>
          <Show when={search?.isFetchingUsers}>
            <div class={styles.loadingOverlay}>
              <Loader />
            </div>
          </Show>
          <Show
            when={query().length > 0}
            fallback={
              <SearchOption
                title={intl.formatMessage({
                  id: 'search.emptyQueryResult',
                  defaultMessage: 'type to',
                  description: 'Label shown is search resuls when no term is provided',
                })}
                description={intl.formatMessage({
                  id: 'search.description',
                  defaultMessage: 'search nostr',
                  description: 'Label explaining full search action',
                })}
                icon={<div class={styles.searchIcon}></div>}
                underline={true}
              />
            }
          >
            <SearchOption
              href={`/search/${queryUrl()}`}
              title={query()}
              description={intl.formatMessage({
                id: 'search.description',
                defaultMessage: 'search nostr',
                description: 'Label explaining full search action',
              })}
              icon={<div class={styles.searchIcon}></div>}
              underline={true}
              onClick={resetQuery}
            />
          </Show>

          <For each={search?.users}>
            {(user) => (
              <SearchOption
                href={`/profile/${user.npub}`}
                title={userName(user)}
                description={user.nip05}
                icon={<Avatar src={user.picture} size="xs" />}
                statNumber={search?.scores[user.pubkey]}
                statLabel={intl.formatMessage({
                  id: 'search.users.followers',
                  defaultMessage: 'followers',
                  description: 'Followers label for user search results',
                })}
                onClick={resetQuery}
              />
            )}
          </For>
        </div>
      </Show>
    </div>

  )
}

export default Search;
