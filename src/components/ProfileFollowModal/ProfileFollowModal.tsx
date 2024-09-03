import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import Modal from '../Modal/Modal';

import styles from './ProfileFollowModal.module.scss';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { Tabs } from '@kobalte/core/tabs';
import { useProfileContext } from '../../contexts/ProfileContext';
import Loader from '../Loader/Loader';
import { profile as t } from "../../translations";
import { profileContactListPage } from '../../constants';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../../types/primal';
import { userName } from '../../stores/profile';
import ProfileContact from '../ProfileContact/ProfileContact';
import Paginator from '../Paginator/Paginator';
import { humanizeNumber } from '../../lib/stats';
import { date } from '../../lib/dates';
import { BeforeLeaveEventArgs, useBeforeLeave } from '@solidjs/router';

const ProfileFollowModal: Component<{
  id?: string,
  open?: 'follows' | 'followers' | false,
  setOpen?: (open: boolean) => void,
  stats?: {
    following: number,
    followers: number,
  }
}> = (props) => {

  const intl = useIntl();
  const profile = useProfileContext();

  const [pk, setPK] = createSignal<string>();
  const [activeTab, setActiveTab] = createSignal<'follows' | 'followers'>('follows');

  createEffect(() => {
    const open = props.open;
    if (open !== undefined && open !== false) {
      setActiveTab(() => open)
    }
  });


  createEffect(() => {
    if (pk() !== profile?.profileKey && props.open) {
      setPK(() => profile?.profileKey);
      fetchContacts();
    }
  });

  const fetchContacts = () => {
    setFollowers(() => []);
    setFollowersOffset(() => 0);
    setContacts(() => []);
    setContactsOffset(() => 0);

    profile?.contacts.length === 0 && profile.actions.fetchContactList(profile.profileKey);

    profile?.followers.length === 0 && profile.actions.fetchFollowerList(profile.profileKey);
  };

  // We have a client side paginataion
  const [contactsOffset, setContactsOffset] = createSignal(0);
  const [contacts, setContacts] = createStore<PrimalUser[]>([]);

  createEffect(() => {
    if (!profile || profile.isFetchingContacts) {
      return;
    }

    const cts = [...(profile.contacts || [])].filter(c => c.pubkey !== profile.profileKey);

    cts.sort((a, b) => {
      const aFollowers: number = profile.profileStats[a.pubkey] || 0;
      const bFollowers: number = profile.profileStats[b.pubkey] || 0;

      return bFollowers >= aFollowers ? 1 : -1;
    });

    setContacts(() => [ ...(cts.slice(0, contactsOffset() + profileContactListPage))]);

  });

  const loadMoreFollows = () => {
    setContactsOffset(contactsOffset() + profileContactListPage);
  }

  // We have a client side paginataion
  const [followersOffset, setFollowersOffset] = createSignal(0);
  const [followers, setFollowers] = createStore<PrimalUser[]>([]);

  createEffect(() => {
    if (!profile || profile.isFetchingFollowers) {
      return;
    }

    const cts = [...(profile.followers || [])].filter(c => c.pubkey !== profile.profileKey);

    cts.sort((a, b) => {
      const aFollowers: number = profile.profileStats[a.pubkey] || 0;
      const bFollowers: number = profile.profileStats[b.pubkey] || 0;

      return bFollowers >= aFollowers ? 1 : -1;
    });

    setFollowers((fs) => [ ...fs, ...(cts.slice(followersOffset(), followersOffset() + profileContactListPage))]);

  });

  const loadMoreFollowers = () => {
    setFollowersOffset(followersOffset() + profileContactListPage);
  }

  const onContactAction = (remove: boolean, pubkey: string) => {
    if (remove) {
      profile?.actions.removeContact(pubkey);
    }
    else {
      profile?.actions.addContact(pubkey, profile.followers);
    }
  };

  useBeforeLeave((e: BeforeLeaveEventArgs) => {
    props.setOpen && props.setOpen(false)
  });

  return (
    <AdvancedSearchDialog
      open={props.open !== false}
      setOpen={props.setOpen}
      triggerClass={styles.hidden}
      title={<div class={styles.dialogTitle}>
        <Tabs value={activeTab()} onChange={setActiveTab}>
          <Tabs.List class={styles.profileTabs}>
            <Tabs.Trigger class={styles.profileTab} value="follows">
              Following{props.stats?.following ? ` (${humanizeNumber(props.stats.following)})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.profileTab} value="followers">
              Followers{props.stats?.followers ? ` (${humanizeNumber(props.stats.followers)})` : ''}
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.profileTabIndicator} />
          </Tabs.List>
        </Tabs>
      </div>}
    >
      <div class={styles.profileFollowModal}>
        <Tabs value={activeTab()} >
          <Tabs.Content value="follows" >
            <div class={styles.tabContent}>
              <Show
                when={!profile?.isFetchingContacts}
                fallback={
                    <div style="margin-top: 40px;">
                      <Loader />
                    </div>
                }
              >
                <For each={contacts} fallback={
                  <div class={styles.mutedProfile}>
                    {intl.formatMessage(
                      t.noFollows,
                      { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                    )}
                  </div>
                }>
                  {contact =>
                    <div>
                      <ProfileContact
                        profile={contact}
                        profileStats={profile?.profileStats[contact.pubkey]}
                        postAction={onContactAction}
                        light={true}
                      />
                    </div>}
                </For>
                <Paginator loadNextPage={loadMoreFollows} isSmall={true} />
              </Show>
            </div>
            <div class={styles.footer}>
              <div class={styles.date}>
                Last updated: {date(profile?.contactListDate || 0).label} ago
              </div>
              <div class={styles.actions}>
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="followers" >
            <div class={styles.tabContent}>
              <Show
                when={!profile?.isFetchingFollowers}
                fallback={
                  <div style="margin-top: 40px;">
                  </div>
                }
              >
                <For
                  each={followers}
                  fallback={
                    <div class={styles.mutedProfile}>
                      {intl.formatMessage(
                        t.noFollowers,
                        { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                      )}
                    </div>
                  }
                >
                  {follower =>
                    <div>
                      <ProfileContact
                        profile={follower}
                        profileStats={profile?.profileStats[follower.pubkey]}
                        postAction={onContactAction}
                        light={true}
                      />
                    </div>
                  }
                </For>
                <Paginator loadNextPage={loadMoreFollowers} isSmall={true} />
              </Show>
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ProfileFollowModal);
