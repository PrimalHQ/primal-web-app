import { useIntl } from "@cookbook/solid-intl";
import { Tabs } from "@kobalte/core";
import { Component, For, Match, onMount, Switch } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { hookForDev } from "../../lib/devTools";
import { humanizeNumber } from "../../lib/stats";
import { userName } from "../../stores/profile";
import { profile as t, actions as tActions } from "../../translations";
import Loader from "../Loader/Loader";
import Note from "../Note/Note";
import Paginator from "../Paginator/Paginator";
import ProfileContact from "../ProfileContact/ProfileContact";

import styles from  "./ProfileTabs.module.scss";


const ProfileTabs: Component<{
  id?: string,
  setProfile?: (pk: string) => void,
}> = (props) => {

  const intl = useIntl();
  const profile = useProfileContext();
  const account = useAccountContext();

  const addToAllowlist = async () => {
    const pk = profile?.profileKey;
    const setP = props.setProfile;
    if (pk && setP) {
      account?.actions.addToAllowlist(pk, () => { setP(pk) });
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
    const setP = props.setProfile;

    if (!account || !pk || !setP) {
      return;
    }

    account.actions.removeFromMuteList(pk, () => setP(pk));
  };

  const onContactAction = (remove: boolean, pubkey: string) => {
    if (remove) {
      profile?.actions.removeContact(pubkey);
    }
    else {
      profile?.actions.addContact(pubkey, profile.followers);
    }
  };

  const contacts = () => {
    const cts = [...(profile?.contacts || [])];

    cts.sort((a, b) => {
      const aFollowers = profile?.profileStats[a.pubkey] || 0;
      const bFollowers = profile?.profileStats[b.pubkey] || 0;

      const c = bFollowers >= aFollowers ? 1 : -1;

      return c;

    });

    return cts;
  }

  const followers = () => {
    const fls = [...(profile?.followers || [])];

    fls.sort((a, b) => {
      const aFollowers = profile?.profileStats[a.pubkey] || 0;
      const bFollowers = profile?.profileStats[b.pubkey] || 0;

      const c = bFollowers >= aFollowers ? 1 : -1;

      return c;

    });

    return fls;
  }

  return (
    <Tabs.Root aria-label="Main navigation">
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

        <Tabs.Trigger class={styles.profileTab} value="follows">
          <div class={styles.stat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.contacts.length || profile?.userStats?.follows_count || 0)}
            </div>
            <div class={styles.statName}>
              {intl.formatMessage(t.stats.follow)}
            </div>
          </div>
        </Tabs.Trigger>

        <Tabs.Trigger class={styles.profileTab} value="followers">
          <div class={styles.stat}>
            <div class={styles.statNumber}>
              {humanizeNumber(profile?.followers.length || profile?.userStats?.followers_count || 0)}
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
        <For each={contacts()}>
          {contact =>
            <div>
              <ProfileContact
                profile={contact}
                profileStats={profile?.profileStats[contact.pubkey]}
                postAction={onContactAction}
              />
            </div>}
        </For>
      </Tabs.Content>

      <Tabs.Content class={styles.tabContent} value="followers">
        <For each={followers()}>
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
      </Tabs.Content>
    </Tabs.Root>
  );
}

export default hookForDev(ProfileTabs);
