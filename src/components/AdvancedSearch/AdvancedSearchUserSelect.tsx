import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useSearchContext } from '../../contexts/SearchContext';
import { nip05Verification, userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import { useToastContext } from '../Toaster/Toaster';
import { placeholders, search as t } from '../../translations';

import styles from './AdvancedSearch.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useProfileContext } from '../../contexts/ProfileContext';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import SearchOption from '../Search/SearchOption';


const AdvancedSearchUserSelect: Component<{
  userList: PrimalUser[],
  onUserSelect: (user: PrimalUser | string) => void,
  onRemoveUser: (user: PrimalUser) => void,
  id?: string,
}> = (props) => {

  const toaster = useToastContext();
  const search = useSearchContext();
  const navigate = useNavigate();
  const intl = useIntl();
  const profile = useProfileContext();

  const [query, setQuery] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);

  const queryUrl = () => query().replaceAll('#', '%23');

  let input: HTMLInputElement | undefined;

  const onSearch = (e: SubmitEvent) => {
    e.preventDefault();
    return false;
  }

  const onInput = (e: InputEvent) => {
    setIsFocused(true);
    debounce(() => {
      // @ts-ignore
      const value = e.target?.value;

      if (value.startsWith('npub') || value.startsWith('nprofile')) {
        search?.actions.findUserByNupub(value);
        return;
      }

      setQuery(value || '');
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

    if (input) {
      input.value = '';
    }
  };

  const selectUser = (user: PrimalUser) => {
    profile?.actions.addProfileToHistory(user);
    input?.focus();
    if (props.onUserSelect) {
      props.onUserSelect(user);
    }
    resetQuery();
  }

  createEffect(() => {
    if (query().length === 0) {
      search?.actions.getRecomendedUsers(profile?.profileHistory.profiles || []);
      return;
    }

    search?.actions.findUsers(query());
  });

  const onOpen = (open: boolean) => {
    if (open) {
      setTimeout(() => {
        input?.focus()
      }, 10)
    } else {
      setQuery('');
    }
  }

  let dropdownMenu: HTMLDivElement | undefined;

  const freeHeight = () => {
    return window.innerHeight - 22;
  }

  return (

    <div class={styles.userSelector}>
      <div class={styles.userList}>
        <For each={props.userList}>
          {user => (
            <div class={styles.userPill} onClick={() => props.onRemoveUser(user)} >
              <Avatar size="xs" user={user} />
              <div class={styles.remove}>
                <div class={styles.excludeIcon}></div>
              </div>
            </div>
          )}
        </For>
      </div>
      <DropdownMenu
        gutter={2}
        flip={true}
        sameWidth={true}
        preventScroll={false}
        onOpenChange={onOpen}
        fitViewport={true}
      >
        <DropdownMenu.Trigger class={styles.dropdownMenuTrigger}>
          <div class={styles.selctionLabel}>
            <Show when={props.userList.length === 0}>
              Anyone
            </Show>
          </div>
          <div class={styles.chevronIcon}></div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class={styles.dropdownMenuContent}>
            <div
              id={props.id}
              class={`${styles.searchHolder} ${isFocused() ? styles.focused : ''} ${styles.userSearch}`}
              style={`max-height: ${freeHeight()}px`}
            >
              <form
                class={styles.search}
                onsubmit={onSearch}
                autocomplete="off"
              >
                <div class={styles.searchIcon}></div>
                <input
                  type='text'
                  name='searchQuery'
                  ref={input}
                  placeholder={
                    intl.formatMessage(placeholders.search)
                  }
                  value={query()}
                  onInput={onInput}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onClick={onFocus}
                />
              </form>

              <div class={`${styles.searchSuggestions} ${styles.floating}`}>
                <Show when={search?.isFetchingUsers && query().length > 0}>
                  <div class={styles.loadingOverlay}>
                    <div>
                      <Loader />
                    </div>
                  </div>
                </Show>

                <For each={search?.users}>
                  {(user) => (
                    <SearchOption
                      href={undefined}
                      title={userName(user)}
                      description={nip05Verification(user)}
                      icon={<Avatar user={user} size="vvs" />}
                      statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
                      statLabel={intl.formatMessage(t.followers)}
                      onClick={() => selectUser(user)}
                    />
                  )}
                </For>
              </div>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    </div>

  )
}

export default hookForDev(AdvancedSearchUserSelect);
