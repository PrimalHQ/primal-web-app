import { useIntl } from "@cookbook/solid-intl";
import { Tabs } from "@kobalte/core/tabs";
import { A } from "@solidjs/router";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import { Component, createEffect, createSignal, For, Match, onMount, Show, Switch } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { imageRegex, imageRegexG, Kind, profileContactListPage } from "../../constants";
import { useAccountContext } from "../../contexts/AccountContext";
import { useMediaContext } from "../../contexts/MediaContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { date } from "../../lib/dates";
import { hookForDev } from "../../lib/devTools";
import { humanizeNumber } from "../../lib/stats";
import { store } from "../../services/StoreService";
import { userName } from "../../stores/profile";
import { profile as t, actions as tActions } from "../../translations";
import { PrimalUser, PrimalZap } from "../../types/primal";
import ArticlePreview from "../ArticlePreview/ArticlePreview";
import Avatar from "../Avatar/Avatar";
import ButtonCopy from "../Buttons/ButtonCopy";
import Loader from "../Loader/Loader";
import Note from "../Note/Note";
import NoteImage from "../NoteImage/NoteImage";
import Paginator from "../Paginator/Paginator";
import ProfileContact from "../ProfileContact/ProfileContact";

import styles from  "./ProfileTabs.module.scss";
import NoteGallery from "../Note/NoteGallery";
import ProfileNoteZap from "../ProfileNoteZap/ProfileNoteZap";
import FeedNoteSkeleton from "../Skeleton/FeedNoteSkeleton";
import ArticlePreviewSkeleton from "../Skeleton/ArticlePreviewSkeleton";
import { Transition, TransitionGroup } from "solid-transition-group";
import ZapSkeleton from "../Skeleton/ZapSkeleton";


const ProfileTabs: Component<{
  id?: string,
  setProfile?: (pk: string) => void,
}> = (props) => {

  const intl = useIntl();
  const profile = useProfileContext();
  const account = useAccountContext();
  const media = useMediaContext();

  const [currentTab, setCurrentTab] = createSignal<string>('notes');

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

    account.actions.removeFromMuteList(pk, () => {
      props.setProfile && props.setProfile(pk);
      onChangeValue(currentTab());
    });
  };

  const onContactAction = (remove: boolean, pubkey: string) => {
    if (remove) {
      profile?.actions.removeContact(pubkey);
    }
    else {
      profile?.actions.addContact(pubkey, profile.followers);
    }
  };

  // We have a client side paginataion
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
    if (!profile) return;

    setCurrentTab(() => value);

    switch(value) {
      case 'articles':
        profile.articles.length === 0 && profile.actions.fetchArticles(profile.profileKey);
        break;
      case 'notes':
        profile.notes.length === 0 && profile.actions.fetchNotes(profile.profileKey);
        break;
      case 'replies':
        profile.replies.length === 0 && profile.actions.fetchReplies(profile.profileKey);
        break;
      case 'gallery':
        profile.gallery.length === 0 && profile.actions.fetchGallery(profile.profileKey);
        break;
      case 'follows':
        profile.contacts.length === 0 && profile.actions.fetchContactList(profile.profileKey);
        break;
      case 'followers':
        profile.followers.length === 0 && profile.actions.fetchFollowerList(profile.profileKey);
        break;
      case 'zaps':
        profile.zaps.length === 0 && profile.actions.fetchZapList(profile.profileKey);
        break;
      case 'relays':
        Object.keys(profile.relays || {}).length === 0 && profile.actions.fetchRelayList(profile.profileKey);
        break;
    }
  };

  const galleryImages = () => {
    return profile?.gallery.filter(note => {
      const test = (imageRegex).test(note.content);
      return test;
    });
  };

  const getZapSubject = (zap: PrimalZap) => {
    if (zap.zappedKind === Kind.Text) {
      return profile?.zappedNotes.find(n => n.id === zap.zappedId);
    }

    if (zap.zappedKind === Kind.LongForm) {
      return profile?.zappedArticles.find(a => [a.noteId, a.id].includes(zap.zappedId || ''));
    }


    return undefined;
  }

  return (
    <Show
      when={profile && profile.fetchedUserStats}
      fallback={<div class={styles.profileTabsPlaceholder}></div>}
    >
      <Tabs onChange={onChangeValue}>
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

          <Tabs.Trigger class={styles.profileTab} value="articles">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.long_form_note_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.articles)}
              </div>
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.profileTab} value="gallery">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats.media_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.gallery)}
              </div>
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.profileTab} value="zaps">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.total_zap_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.zaps)}
              </div>
            </div>
          </Tabs.Trigger>

          {/* <Tabs.Trigger class={styles.profileTab} value="follows">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.follows_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.follow)}
              </div>
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.profileTab} value="followers">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.followers_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.followers)}
              </div>
            </div>
          </Tabs.Trigger> */}

          <Tabs.Trigger class={styles.profileTab} value="relays">
            <div class={styles.stat}>
              <div class={styles.statNumber}>
                {humanizeNumber(profile?.userStats?.relay_count || 0)}
              </div>
              <div class={styles.statName}>
                {intl.formatMessage(t.stats.relays)}
              </div>
            </div>
          </Tabs.Trigger>


          <Tabs.Indicator class={styles.profileTabIndicator} />
        </Tabs.List>

        <Tabs.Content class={styles.tabContent} value="articles">
          <div class={styles.profileNotes}>
            <Switch>
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


              <Match when={true}>
                <TransitionGroup name="slide-fade">
                  <div>
                    <Show when={profile && profile.isFetching && profile.articles.length === 0}>
                      <div>
                        <For each={new Array(10)}>
                          {() => <ArticlePreviewSkeleton />}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <Show when={profile && profile.articles.length === 0 && !profile.isFetching}>
                      <div class={styles.mutedProfile}>
                        {intl.formatMessage(
                          t.noArticles,
                          { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.articles.length > 0}>
                    <div>
                      <For each={profile?.articles}>
                        {article => (
                          <div class="animated"><ArticlePreview article={article} /></div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.fetchNextArticlesPage();
                        }}
                        isSmall={true}
                      />
                    </div>
                  </Show>
                </TransitionGroup>
              </Match>
            </Switch>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="notes">
          <div class={styles.profileNotes}>
            <Switch>
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

              <Match when={true}>
                <TransitionGroup name="slide-fade">
                  <div>
                    <Show when={profile && profile.isFetching && profile.notes.length === 0}>
                      <div>
                        <For each={new Array(10)}>
                          {() => <FeedNoteSkeleton />}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <Show when={profile && profile.notes.length === 0 && !profile.isFetching}>
                      <div class={styles.mutedProfile}>
                        {intl.formatMessage(
                          t.noNotes,
                          { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.notes.length > 0}>
                    <div>
                      <For each={profile?.notes}>
                        {note => (
                          <div class="animated"><Note note={note} shorten={true} /></div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.fetchNextPage();
                        }}
                        isSmall={true}
                      />
                    </div>
                  </Show>
                </TransitionGroup>
              </Match>
            </Switch>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="replies">
          <div class={styles.profileNotes}>
            <Switch>
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

              <Match when={true}>
                <TransitionGroup name="slide-fade">
                  <div>
                    <Show when={profile && profile.isFetchingReplies && profile.replies.length === 0}>
                      <div>
                        <For each={new Array(10)}>
                          {() => <FeedNoteSkeleton />}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <Show when={profile && profile.replies.length === 0 && !profile.isFetchingReplies}>
                      <div class={styles.mutedProfile}>
                        {intl.formatMessage(
                          t.noReplies,
                          { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.replies.length > 0}>
                    <div>
                      <For each={profile?.replies}>
                        {reply => (
                          <div class="animated"><Note note={reply} shorten={true} /></div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.fetchNextRepliesPage();
                        }}
                        isSmall={true}
                      />
                    </div>
                  </Show>
                </TransitionGroup>
              </Match>
            </Switch>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="gallery">
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
              <Match when={profile && profile.gallery.length === 0 && !profile.isFetchingGallery}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.noReplies,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                  )}
                </div>
              </Match>
              <Match when={profile && profile.gallery.length > 0}>
                <div class={styles.galleryGrid}>
                  <div class={styles.galleryColumn}>
                    <For each={galleryImages()}>
                      {(note, index) => (
                        <Show when={index()%3 === 1}>
                          <NoteGallery note={note} />
                        </Show>
                      )}
                    </For>
                  </div>
                  <div class={styles.galleryColumn}>
                    <For each={galleryImages()}>
                      {(note, index) => (
                        <Show when={index()%3 === 2}>
                          <NoteGallery note={note} />
                        </Show>
                      )}
                    </For>
                  </div>
                  <div class={styles.galleryColumn}>
                    <For each={galleryImages()}>
                      {(note, index) => (
                        <Show when={index()%3 === 0}>
                          <NoteGallery note={note} />
                        </Show>
                      )}
                    </For>
                  </div>
                </div>
                <Paginator
                  loadNextPage={() => {
                    profile?.actions.fetchNextGalleryPage();
                  }}
                />
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
              <Paginator loadNextPage={loadMoreFollows} isSmall={true} />
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
                    />
                  </div>
                }
              </For>
              <Paginator loadNextPage={loadMoreFollowers} isSmall={true} />
            </Show>
          </div>
        </Tabs.Content>

        <Tabs.Content class={styles.tabContent} value="zaps">
          <div class={styles.profileNotes}>
            <TransitionGroup name="slide-fade">
              <div>
                <Show when={profile && profile.isFetchingZaps && profile.zaps.length === 0}>
                  <div>
                    <For each={new Array(10)}>
                      {() => <ZapSkeleton />}
                    </For>
                  </div>
                </Show>
              </div>
              <div>
                <Show when={profile && !profile.isFetchingZaps && profile.zaps.length === 0}>
                  <div class={styles.mutedProfile}>
                    {intl.formatMessage(
                      t.noZaps,
                      { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                    )}
                  </div>
                </Show>
              </div>

              <Show when={profile && profile.zaps.length > 0}>
                <div>
                  <For each={profile?.zaps}>
                    {zap =>
                      <div class="animated">
                        <ProfileNoteZap
                          zap={zap}
                          subject={getZapSubject(zap)}
                        />
                      </div>
                    }
                  </For>
                  <Paginator loadNextPage={profile?.actions.fetchNextZapsPage} isSmall={true} />
                </div>
              </Show>
            </TransitionGroup>
          </div>
        </Tabs.Content>


        <Tabs.Content class={styles.tabContent} value="relays">
          <div class={styles.profileRelays}>
            <Show
              when={!profile?.isFetchingRelays}
              fallback={
                <div style="margin-top: 40px;">
                  <Loader />
                </div>
              }
            >
              <For
                each={Object.keys(profile?.relays || {})}

                fallback={
                  <div class={styles.mutedProfile}>
                    {intl.formatMessage(
                      t.noRelays,
                      { name: profile?.userProfile ? userName(profile?.userProfile) : profile?.profileKey },
                    )}
                  </div>
                }
              >
                {relayUrl => (
                  <div class={styles.profileRelay}>
                    <div class={styles.relayIcon}></div>
                    <div class={styles.relayUrl}>
                      {relayUrl}
                    </div>
                    <ButtonCopy
                      copyValue={relayUrl}
                      label={intl.formatMessage(tActions.copy)}
                    />
                  </div>
                )}
              </For>
            </Show>
          </div>
        </Tabs.Content>
      </Tabs>
    </Show>
  );
}

export default hookForDev(ProfileTabs);
