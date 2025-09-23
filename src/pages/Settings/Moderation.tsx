import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import Avatar from '../../components/Avatar/Avatar';
import CheckBox from '../../components/Checkbox/CheckBox';
import HelpTip from '../../components/HelpTip/HelpTip';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { contentScope, Kind, specialAlgos, trendingScope } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useAppContext } from '../../contexts/AppContext';
import { useSearchContext } from '../../contexts/SearchContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hexToNpub, npubToHex } from '../../lib/keys';
import { getUserProfiles } from '../../lib/profile';
import { subsTo } from '../../sockets';
import { convertToUser, nip05Verification, userName } from '../../stores/profile';
import { settings as t, actions as tActions, placeholders as tPlaceholders } from '../../translations';
import { NostrUserContent, PrimalUser } from '../../types/primal';

import styles from './Settings.module.scss';

const Moderation: Component = () => {
  const intl = useIntl();

  const account = useAccountContext();
  const settings = useSettingsContext();
  const search = useSearchContext();
  const app = useAppContext();

  let searchFilteredAccount: HTMLInputElement | undefined;
  let allowlistInput: HTMLInputElement | undefined;

  const [isSearching, setIsSearching] = createSignal(false);

  const onSearchFilteredAccount = () => {
    const value = searchFilteredAccount?.value || '';

    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      setIsSearching(true);
      search?.actions.findFilteredUserByNpub(value);
      return;
    }

    setIsSearching(false);
  };

  const onAddToAllowlist = () => {
    const value = allowlistInput?.value || '';

    if (value.startsWith('npub') || value.startsWith('nprofile')) {
      account?.actions.addToAllowlist(npubToHex(value));
    }
  };

  const onRemoveFromAllowlist = (pubkey: string) => {
    account?.actions.removeFromAllowlist(pubkey);
  };

  const pubkey = () => account?.publicKey;

  const mutelists = () => {
    return account?.mutelists.filter(m => m.pubkey && m.pubkey !== pubkey());
  };

  const algorithms = () => settings?.contentModeration.filter(x => x.name !== 'my').map(x => ({
    name: x.name,
    content: x.scopes.includes(contentScope),
    trending: x.scopes.includes(trendingScope),
  }));

  const my = () => account?.mutelists.find(x => x.pubkey === pubkey());

  const [users, setUsers] = createStore<Record<string, PrimalUser>>({});

  const reasons = () => search?.filteringReasons || [];

  createEffect(() => {
    const userMutelists = account?.mutelists || [];

    const rand = Math.floor(Math.random()*10_000);

    if (userMutelists.length > 0) {
      const subId = `user_mutelist_${rand}_${APP_ID}`
      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (content?.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            const u = convertToUser(user, content.pubkey);
            setUsers(() => ({ [u.pubkey]: { ...u } }));
          }
        },
        onEose: () => {
          unsub();
        }
      });

      getUserProfiles(userMutelists.map(x => x.pubkey || ''), subId)
    }
  });

  createEffect(() => {
    const allowList = account?.allowlist || [];
    const rand = Math.floor(Math.random()*10_000);

    if (allowList.length > 0) {
      const subId = `user_allowlist_${rand}_${APP_ID}`;

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (!content) return;

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            const u = convertToUser(user, content.pubkey);
            setUsers(() => ({ [u.pubkey]: { ...u } }));
          }

        },
        onEose: () => {
          unsub();
        },
      });

      getUserProfiles(allowList || [], subId)
    }
  });

  createEffect(() => {
    const reasons = search?.filteringReasons.filter(r => !specialAlgos.includes(r)) || [];
    const rand = Math.floor(Math.random()*10_000);

    if (reasons.length > 0) {
      const subId = `user_reasons_${rand}_${APP_ID}`
      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (!content) return;

          if (content.kind === Kind.Metadata) {
            const user = content as NostrUserContent;

            const u = convertToUser(user, content.pubkey);
            setUsers(() => ({ [u.pubkey]: { ...u } }));
            return;
          }
        },
        onEose: () => {
          unsub();
        },
      });

      getUserProfiles(reasons, subId)
    }
  });

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.moderation.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.moderation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          <CheckBox
            id='applyFiltering'
            label=""
            onChange={() => {settings?.actions.setApplyContentModeration(!settings.applyContentModeration)}}
            checked={settings?.applyContentModeration}
          />
          <span>{intl.formatMessage(t.moderation.applyFiltering)}</span>
          <HelpTip zIndex={1_000}>
            <span>
              {intl.formatMessage(t.moderation.description)}
            </span>
          </HelpTip>
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.moderation.shortDescription)}
        </div>
      </div>

      <div class={styles.filterListTable}>
        <Show when={!settings?.applyContentModeration}>
          <div class={styles.veil}></div>
        </Show>

        <div class={styles.filterListHeader}>
          <div>
          {intl.formatMessage(t.moderation.table.mutelists)}
          </div>
          <div>
            {intl.formatMessage(t.moderation.table.content)}
            <HelpTip>
              <span>{intl.formatMessage(t.moderation.table.contentHelp)}</span>
            </HelpTip>
          </div>
          <div>
            {intl.formatMessage(t.moderation.table.trending)}
            <HelpTip>
              <span>{intl.formatMessage(t.moderation.table.trendingHelp)}</span>
            </HelpTip>
          </div>
        </div>

        <div>
          <div class={styles.filterListItem}>
            <div class={styles.filterListName} title={my()?.pubkey}>
              <A href='/p' class={styles.avatar}>
                <Avatar
                  user={account?.activeUser}
                  size='xs'
                />
              </A>
              <A href={'/settings/muted'}>
                {intl.formatMessage(t.moderation.algos.my)}
              </A>
            </div>
            <div class={styles.filterListCheck}>
              <CheckBox
                id={`${my()?.pubkey}_content`}
                onChange={() => account?.actions.updateFilterList(my()?.pubkey, !my()?.content, my()?.trending)}
                checked={my()?.content}
                disabled={true}
              />
            </div>
            <div class={styles.filterListCheck}>
              <CheckBox
                id={`${my()?.pubkey}_trending`}
                onChange={() => account?.actions.updateFilterList(my()?.pubkey, my()?.content, !my()?.trending)}
                checked={my()?.trending}
                disabled={true}
              />
            </div>
          </div>

          <For each={mutelists()}>
            {mutelist => (
              <div class={styles.filterListItem}>
                <div class={styles.filterListName} title={mutelist.pubkey}>
                  <A href={app?.actions.profileLink(mutelist.pubkey) || ''} class={styles.avatar}>
                    <Avatar
                      user={users[mutelist.pubkey || '']}
                      size='xs'
                    />
                  </A>
                  <A href={`/mutelist/${users[mutelist.pubkey || '']?.npub}`}>
                    {intl.formatMessage(t.moderation.moderationItem, { name: userName(users[mutelist.pubkey || '']) })}
                  </A>
                </div>
                <div class={styles.filterListCheck}>
                  <CheckBox
                    id={`${mutelist.pubkey}_content`}
                    onChange={() => account?.actions.updateFilterList(mutelist.pubkey, !mutelist.content, mutelist.trending)}
                    checked={mutelist.content}
                  />
                </div>
                <div class={styles.filterListCheck}>
                  <CheckBox
                    id={`${mutelist.pubkey}_trending`}
                    onChange={() => account?.actions.updateFilterList(mutelist.pubkey, mutelist.content, !mutelist.trending)}
                    checked={mutelist.trending}
                  />
                </div>
              </div>
            )}
          </For>
        </div>

        <div class={`${styles.filterListHeader} ${styles.secondFilter}`}>
          <div>
            {intl.formatMessage(t.moderation.table.algos)}
          </div>
          <div>
            {intl.formatMessage(t.moderation.table.content)}
            <HelpTip>
              <span>{intl.formatMessage(t.moderation.table.contentHelp)}</span>
            </HelpTip>
          </div>
          <div>
            {intl.formatMessage(t.moderation.table.trending)}
            <HelpTip>
              <span>{intl.formatMessage(t.moderation.table.trendingHelp)}</span>
            </HelpTip>
          </div>
        </div>

        <div>
          <For each={algorithms()}>
            {algo => (
              <div class={styles.filterListItem}>
                <div class={styles.filterListName} title={algo.name}>
                  <div class={styles.algoLogo}></div>
                  <A href={`/mutelist/${algo.name}`}>
                    {
                      // @ts-ignore
                      intl.formatMessage(t.moderation.algos[algo.name])
                    }
                  </A>
                </div>
                <div class={styles.filterListCheck}>
                  <CheckBox
                    id={`${algo.name}_content`}
                    onChange={() => settings?.actions.modifyContentModeration(algo.name, !algo.content, algo.trending)}
                    checked={algo.content}
                  />
                </div>
                <div class={styles.filterListCheck}>
                  <CheckBox
                    id={`${algo.name}_trending`}
                    onChange={() => settings?.actions.modifyContentModeration(algo.name, algo.content, !algo.trending)}
                    checked={algo.trending}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class={styles.settingsContentBorderless}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.moderation.searchFilteredAccount)}
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.moderation.searchForFiltered)}
        </div>

        <div class={styles.searchFilteredAccount}>
          <div
            class={styles.npubInput}
          >
            <input
              ref={searchFilteredAccount}
              type="text"
              placeholder={intl.formatMessage(tPlaceholders.searchByNpub)}
              class={styles.noIcon}
              onChange={() => onSearchFilteredAccount()}
            />
            <button onClick={() => onSearchFilteredAccount()}>
              <div class={styles.searchIcon}></div>
            </button>
          </div>
        </div>

        <Show when={isSearching()}>
          <Show when={reasons().length > 0}>
            <div class={styles.fiterSearchCaption}>
              This npub is included in:
            </div>
          </Show>
          <div class={styles.filterListTable}>
            <For each={reasons()}
              fallback={
                <div class={styles.fiterSearchCaption}>
                  This npub is not included in any of your filter lists.
                </div>
              }
            >
              {reason => (
                <Show
                  when={specialAlgos.includes(reason)}
                  fallback={(
                    <div class={styles.filterListItem}>
                      <div class={styles.filterListName} title={reason}>
                        <A href={app?.actions.profileLink(reason) || ''} class={styles.avatar}>
                          <Avatar
                            user={users[reason || '']}
                            size='xs'
                          />
                        </A>
                        <span>
                          <Show when={reason !== account?.publicKey} fallback={intl.formatMessage(t.moderation.algos.my)}>
                            {intl.formatMessage(t.moderation.moderationItem, { name: userName(users[reason || '']) })}
                          </Show>
                        </span>
                      </div>
                    </div>
                  )}
                >
                  <div class={styles.filterListItem}>
                    <div class={styles.filterListName} title={reason}>
                      <div class={styles.algoLogo}></div>
                      {
                        // @ts-ignore
                        intl.formatMessage(t.moderation.algos[reason])
                      }
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </Show>

        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.moderation.allowList)}
        </div>

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.moderation.allowListsDescription)}
        </div>

        <div class={styles.searchFilteredAccount}>
          <div
            class={styles.npubInput}
          >
            <input
              ref={allowlistInput}
              type="text"
              placeholder={intl.formatMessage(tPlaceholders.addNpub)}
              class={styles.noIcon}
              onChange={() => onAddToAllowlist()}
            />
            <button onClick={() => onAddToAllowlist()}>
              <div class={styles.addIconBig}></div>
            </button>
          </div>
        </div>

        <div>
          <For each={account?.allowlist}>
            {pubkey => (
              <button class={styles.allowlistItem} onClick={() => onRemoveFromAllowlist(pubkey)}>
                <div class={styles.allowlistEntry}>
                  <div class={styles.allowlistInfo} title={hexToNpub(pubkey)}>
                    <div class={styles.avatar}>
                      <Avatar
                        user={users[pubkey || '']}
                        size='xs'
                      />
                    </div>
                    <div class={styles.allowlistUserInfo}>
                      <div class={styles.firstLine}>
                        <span>
                          {userName(users[pubkey || ''])}
                        </span>

                        <VerificationCheck user={users[pubkey || '']} />

                        <Show
                          when={users[pubkey || '']?.nip05}
                        >
                          <span
                            class={styles.verification}
                            title={users[pubkey || '']?.nip05}
                          >
                            {nip05Verification(users[pubkey || ''])}
                          </span>
                        </Show>
                      </div>
                      <div class={styles.npub}>
                        {hexToNpub(pubkey)}
                      </div>
                    </div>
                  </div>
                </div>
                <div class={styles.remove}>
                  <div class={styles.closeIcon}></div> {intl.formatMessage(tActions.removeRelay)}
                </div>
              </button>
            )}
          </For>
        </div>
      </div>

    </div>);
}

export default Moderation;
