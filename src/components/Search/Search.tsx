import { useIntl } from '@cookbook/solid-intl';
import { A, useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSearchContext } from '../../contexts/SearchContext';
import { hexToNpub } from '../../lib/keys';
import { truncateNumber } from '../../lib/notifications';
import { truncateNpub } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';

import styles from './Search.module.scss';


const Search: Component = () => {

  const toaster = useToastContext();
  const search = useSearchContext();
  const account = useAccountContext();
  const navigate = useNavigate();
  const intl = useIntl();

  const [query, setQuery] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);
  const [isDebouncing, setIsDebouncing] = createSignal(false);

  const onSearch = (e: Event) => {
    e.preventDefault();
    if (isDebouncing()) {
      return;
    }

    if (query().length >0) {
      navigate(`/search/${query()}`);
      onBlur();
    }
    else {
      toaster?.sendInfo(intl.formatMessage({
        id: 'search.invalid',
        defaultMessage: 'Please enter search term.',
        description: 'Alert letting the user know that the search term is empty',
      }))
    }
  }

  const onInput = (e: InputEvent) => {
    setIsDebouncing(true);
    setIsFocused(true);
    debounce(() => {
      // @ts-ignore
      setQuery(e.target?.value || '');
      setIsDebouncing(false);
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
    if (isFocused()) {
      search?.actions.findUsers(query(), account?.publicKey);
    }
  });

  return (
    <div class={styles.searchHolder}>
      <form class={styles.search} onsubmit={onSearch}>
        <div class={styles.searchIcon}></div>
        <input
          type='text'
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
              <div class={styles.userResult}>
                <div class={styles.userAvatar}>
                  <div class={styles.searchIcon}></div>
                </div>
                <div class={styles.userInfo}>
                  <div class={styles.userName}>
                    type in a term to
                  </div>
                  <div class={styles.verification}>
                    search nostr
                  </div>
                </div>
              </div>
            }
          >
            <A
              href={`/search/${query()}`}
              class={styles.userResult}
              tabIndex={0}
              onFocus={onFocus}
            >
              <div class={styles.userAvatar}>
                <div class={styles.searchIcon}></div>
              </div>
              <div class={styles.userInfo}>
                <div class={styles.userName}>
                  {query()}
                </div>
                <div class={styles.verification}>
                  search nostr
                </div>
              </div>
            </A>
          </Show>

          <For each={search?.users}>
            {(user) => (
              <A
                href={`/profile/${user.npub}`}
                class={styles.userResult}
                tabIndex={0}
                onFocus={onFocus}
              >
                <div class={styles.userAvatar}>
                  <Avatar src={user.picture} size="xs" />
                </div>
                <div class={styles.userInfo}>
                  <div class={styles.userName}>
                    {userName(user)}
                  </div>
                  <Show when={user.nip05.length > 0}>
                    <div class={styles.verification} title={user.nip05}>
                      {truncateNpub(user.nip05)}
                    </div>
                  </Show>
                </div>
                <div class={styles.userStats}>
                  <div class={styles.followerNumber}>
                    {truncateNumber(search?.scores[user.pubkey] || 0)}
                  </div>
                  <div class={styles.followerLabel}>
                    {intl.formatMessage({
                      id: 'search.users.followers',
                      defaultMessage: 'followers',
                      description: 'Followers label for user search results',
                    })}
                  </div>
                </div>
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>

  )
}

export default Search;
