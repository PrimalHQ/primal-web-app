import { useIntl } from "@cookbook/solid-intl";
import { Tabs } from "@kobalte/core";
import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { profileContactListPage } from "../../constants";
import { useAccountContext } from "../../contexts/AccountContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { hookForDev } from "../../lib/devTools";
import { humanizeNumber } from "../../lib/stats";
import { userName } from "../../stores/profile";
import { profile as t, actions as tActions } from "../../translations";
import { PrimalUser } from "../../types/primal";
import Loader from "../Loader/Loader";
import Note from "../Note/Note";
import Paginator from "../Paginator/Paginator";
import ProfileContact from "../ProfileContact/ProfileContact";

import styles from  "./ProfileTabs.module.scss";


const ProfileTabs: Component<{
  id?: string,
  profile: PrimalUser | undefined,
  setProfile?: (pk: string) => void,
}> = (props) => {

  const intl = useIntl();
  const profile = useProfileContext();
  const account = useAccountContext();

  const addToAllowlist = async () => {
    const pk = profile?.profileKey;
    if (pk) {
      account?.actions.addToAllowlist(pk);
    }
  };

  const isMuted = (pk: string | undefined, ignoreContentCheck = false) => {
    const isContentMuted = account?.mutelists.find(x => x.pubkey === account.publicKey)?.content;

    return pk &&
      account?.muted.includes(pk) &&
      (ignoreContentCheck ? true : isContentMuted);
  };

  const isFiltered = () => {
    return profile?.filterReason !== null;
  };

  const unMuteProfile = () => {
    const pk = profile?.profileKey;

    if (!account || !pk) {
      return;
    }

    account.actions.removeFromMuteList(pk);
  };

  const onContactAction = (remove: boolean, pubkey: string) => {
    if (remove) {
      profile?.actions.removeContact(pubkey);
    }
    else {
      profile?.actions.addContact(pubkey, profile.followers);
    }
  };

  const [contactsOffset, setContactsOffset] = createSignal(0);
  const [contacts, setContacts] = createStore<PrimalUser[]>([]);

  createEffect(() => {
    if (!profile || profile.isFetchingContacts) {
      return;
    }

    const cts = [...(profile.contacts || [])];

    cts.sort((a, b) => {
      const aFollowers: number = profile.profileStats[a.pubkey] || 0;
      const bFollowers: number = profile.profileStats[b.pubkey] || 0;

      return bFollowers >= aFollowers ? 1 : -1;
    });

    setContacts((cs) => [ ...cs, ...(cts.slice(contactsOffset(), contactsOffset() + profileContactListPage))]);

  });

  const loadMoreFollows = () => {
    setContactsOffset(contactsOffset() + profileContactListPage);
  }


  const [followersOffset, setFollowersOffset] = createSignal(0);
  const [followers, setFollowers] = createStore<PrimalUser[]>([]);

  createEffect(() => {
    if (!profile || profile.isFetchingFollowers) {
      return;
    }

    const cts = [...(profile.followers || [])];

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

  const onChangeValue = (value: string) => {
    if (!props.profile) return;

    switch(value) {
      case 'notes':
        profile?.notes.length === 0 &&profile?.actions.fetchNotes(props.profile.pubkey);
        break;
      case 'replies':
        profile?.replies.length === 0 && profile?.actions.fetchReplies(props.profile.pubkey);
        break;
      case 'follows':
        profile?.contacts.length === 0 && profile?.actions.fetchContactList(props.profile.pubkey);
        break;
      case 'followers':
        profile?.followers.length === 0 && profile?.actions.fetchFollowerList(props.profile.pubkey);
        break;
    }
  };

  return (
    <Show when={profile && props.profile && profile.fetchedUserStats}>
      <Tabs.Root onChange={onChangeValue}>
        <Tabs.List class={styles.profileTabs}>
          <Tabs.Trigger class={styles.profileTab} value="notes">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.note_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.notes)}
              </div>
            </div>
          </Tabs.Trigger>

          <div class={styles.separator}></div>

          <Tabs.Trigger class={styles.profileTab} value="replies">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.reply_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.replies)}
              </div>
            </div>
          </Tabs.Trigger>

          <div class={styles.separator}></div>

          <Tabs.Trigger class={styles.profileTab} value="follows">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.follows_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.follow)}
              </div>
            </div>
          </Tabs.Trigger>

          <div class={styles.separator}></div>

          <Tabs.Trigger class={styles.profileTab} value="followers">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.followers_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.followers)}
              </div>
            </div>
          </Tabs.Trigger>

          <Tabs.Indicator class={styles.profileTabIndicator} />
        </Tabs.List>

        <Tabs.Content class={styles.tabContent} value="notes">
          <div class={styles.profileNotes}>
            <Switch
              fallback={
                <div style="margin-top: 40px;">
                  <Loader />
                </div>
            }>
              <Match when={isMuted(profile?.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                  <button
                    onClick={unMuteProfile}
                  >
                    {intl.formatMessage(tActions.unmute)}
                  </button>
                </div>
              </Match>
              <Match when={isFiltered()}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(t.isFiltered)}
                  <button
                    onClick={addToAllowlist}
                  >
                    {intl.formatMessage(tActions.addToAllowlist)}
                  </button>
                </div>
              </Match>
              <Match when={profile && profile.notes.length === 0 && !profile.isFetching}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.noNotes,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                </div>
              </Match>
              <Match when={profile && profile.notes.length > 0}>
                <For each={profile?.notes}>
                  {note => (
                    <Note note={note} />
                  )}
                </For>
                <Paginator loadNextPage={() => {
                  profile?.actions.fetchNextPage();
                }}/>
              </Match>
            </Switch>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="replies">
          <div class={styles.profileNotes}>
            <Switch
              fallback={
                <div style="margin-top: 40px;">
                  <Loader />
                </div>
            }>
              <Match when={isMuted(profile?.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                  <button
                    onClick={unMuteProfile}
                  >
                    {intl.formatMessage(tActions.unmute)}
                  </button>
                </div>
              </Match>
              <Match when={isFiltered()}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(t.isFiltered)}
                  <button
                    onClick={addToAllowlist}
                  >
                    {intl.formatMessage(tActions.addToAllowlist)}
                  </button>
                </div>
              </Match>
              <Match when={profile && profile.replies.length === 0 && !profile.isFetchingReplies}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.noNotes,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                </div>
              </Match>
              <Match when={profile && profile.replies.length > 0}>
                <For each={profile?.replies}>
                  {reply => (
                    <Note note={reply} />
                  )}
                </For>
                <Paginator loadNextPage={() => {
                  profile?.actions.fetchNextRepliesPage();
                }}/>
              </Match>
            </Switch>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="follows">
          <div class={styles.profileNotes}>
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
                    />
                  </div>}
              </For>
              <Paginator loadNextPage={loadMoreFollows}/>
            </Show>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="followers">
          <div class={styles.profileNotes}>
            <Show
              when={!profile?.isFetchingFollowers}
              fallback={
                  <div style="margin-top: 40px;">
                    <Loader />
                  </div>
              }
            >
              <For each={followers} fallback={
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.noFollowers,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                </div>
              }>
                {follower =>
                  <div>
                    <ProfileContact
                      profile={follower}
                      profileStats={profile?.profileStats[follower.pubkey]}
                      postAction={onContactAction}
                    />
                  </div>
                }
              </For>
              <Paginator loadNextPage={loadMoreFollowers}/>
            </Show>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </Show>
  );
}

export default hookForDev(ProfileTabs);
