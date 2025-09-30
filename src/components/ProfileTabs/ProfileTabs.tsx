import { useIntl } from "@cookbook/solid-intl";
import { Tabs } from "@kobalte/core/tabs";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { Component, createEffect, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { imageOrVideoRegex, Kind, profileContactListPage } from "../../constants";
import { useAccountContext } from "../../contexts/AccountContext";
import { useMediaContext } from "../../contexts/MediaContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { hookForDev } from "../../lib/devTools";
import { humanizeNumber } from "../../lib/stats";
import { userName } from "../../stores/profile";
import { profile as t, actions as tActions } from "../../translations";
import { PrimalNote, PrimalUser, PrimalZap } from "../../types/primal";
import ArticlePreview from "../ArticlePreview/ArticlePreview";
import ButtonCopy from "../Buttons/ButtonCopy";
import Loader from "../Loader/Loader";
import Note from "../Note/Note";
import Paginator from "../Paginator/Paginator";

import styles from  "./ProfileTabs.module.scss";
import NoteGallery from "../Note/NoteGallery";
import ProfileNoteZap from "../ProfileNoteZap/ProfileNoteZap";
import FeedNoteSkeleton from "../Skeleton/FeedNoteSkeleton";
import ArticlePreviewSkeleton from "../Skeleton/ArticlePreviewSkeleton";
import { TransitionGroup } from "solid-transition-group";
import ZapSkeleton from "../Skeleton/ZapSkeleton";
import ProfileGalleryImageSkeleton from "../Skeleton/ProfileGalleryImageSkeleton";
import { scrollWindowTo } from "../../lib/scroll";
import { nip19 } from "nostr-tools";


const ProfileTabs: Component<{
  id?: string,
  setProfile?: (pk: string) => void,
  profileKey: string,
}> = (props) => {

  const intl = useIntl();
  const profile = useProfileContext();
  const account = useAccountContext();
  const media = useMediaContext();
  const location = useLocation();
  const navigate = useNavigate();

  const hash = () => {
    return (location.hash.length > 1) ? location.hash.substring(1) : 'notes';
  }

  const [currentTab, setCurrentTab] = createSignal<string>(hash());

  const addToAllowlist = async () => {
    const pk = props.profileKey;
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
    const pk = props.profileKey;

    if (!account || !pk) {
      return;
    }

    account.actions.removeFromMuteList(pk, 'user', () => {
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

  createEffect(on(() => props.profileKey, (v,p) => {
    if (!v || v === p) return;
    const value = hash();

    profile?.actions.clearNotes();
    profile?.actions.clearArticles();
    profile?.actions.clearGallery();
    profile?.actions.clearZaps();
    profile?.actions.clearReplies();
    updateTabContent(value);
  }))

  const onChangeValue = (value: string) => {
    setCurrentTab(() => value);

    window.location.hash = value;

    profile?.actions.resetScroll();

    updateTabContent(value);
  };

  const updateTabContent = (value: string) => {
    if (!profile) return;

    switch(value) {
      case 'reads':
        profile.articles.length === 0 && profile.actions.getProfileMegaFeed(props.profileKey, 'reads');
        break;
      case 'notes':
        profile.notes.length === 0 && profile.actions.getProfileMegaFeed(props.profileKey, 'notes');
        break;
      case 'replies':
        profile.replies.length === 0 && profile.actions.getProfileMegaFeed(props.profileKey, 'replies');
        break;
      case 'media':
        profile.gallery.length === 0 && profile.actions.getProfileMegaFeed(props.profileKey, 'media');
        break;
      case 'zaps':
        profile.zaps.length === 0 && profile.actions.fetchZapList(props.profileKey);
        break;
      case 'relays':
        Object.keys(profile.relays || {}).length === 0 && profile.actions.fetchRelayList(props.profileKey);
        break;
    }
  }

  const galleryImages = () => {
    return profile?.gallery.filter(note => {
      const test = (imageOrVideoRegex).test(note.content);
      return test;
    });
  };

  const hasImages = (note: PrimalNote) => {
    const test = (imageOrVideoRegex).test(note.content);
    return test;
  }

  const getZapSubject = (zap: PrimalZap) => {
    if (zap.zappedKind === Kind.Text) {
      return profile?.zappedNotes.find(n => n.id === zap.zappedId);
    }

    if (zap.zappedKind === Kind.LongForm) {
      return profile?.zappedArticles.find(a => [a.noteId, a.id].includes(zap.zappedId || ''));
    }

    if (zap.zappedKind === Kind.Metadata) {
      return zap.reciver
    }


    return undefined;
  }

  createEffect(on(currentTab, (tab, prev) => {
    if (tab === prev) {
      return;
    }

    if (tab === 'notes' && !profile?.isFetching) {
      scrollWindowTo(profile?.scrollTop.notes);
      return;
    }

    if (tab === 'reads' && !profile?.isFetching) {
      scrollWindowTo(profile?.scrollTop.reads);
      return;
    }

    if (tab === 'replies' && !profile?.isFetchingReplies) {
      scrollWindowTo(profile?.scrollTop.replies);
      return;
    }

    if (tab === 'media' && !profile?.isFetchingGallery) {
      scrollWindowTo(profile?.scrollTop.media);
      return;
    }

    if (tab === 'zaps' && !profile?.isFetchingZaps) {
      scrollWindowTo(profile?.scrollTop.zaps);
      return;
    }
  }));

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    const tab = currentTab() as 'reads' | 'notes' | 'media' | 'replies' | 'zaps';

    profile?.actions.updateScrollTop(scrollTop, tab);
  }

  onMount(() => {
    window.addEventListener('scroll', onScroll);
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
  });

  const noteLinkId = (note: PrimalNote) => {
    try {
      return `/e/${note.noteIdShort}`;
    } catch(e) {
      return '/404';
    }
  };

  return (
      <Tabs value={hash()} onChange={onChangeValue} defaultValue={hash()}>
        <Show when={profile && profile.fetchedUserStats}>
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

            <Tabs.Trigger class={styles.profileTab} value="reads">
              <div class={styles.stat}>
                <div class={styles.statNumber}>
                  {humanizeNumber(profile?.userStats?.long_form_note_count || 0)}
                </div>
                <div class={styles.statName}>
                  {intl.formatMessage(t.stats.articles)}
                </div>
              </div>
            </Tabs.Trigger>

            <Tabs.Trigger class={styles.profileTab} value="media">
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
        </Show>

        <Tabs.Content class={styles.tabContent} value="reads">
          <div class={styles.profileNotes}>
            <Switch>
              <Match when={isMuted(props.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
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
                          { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.articles.length > 0}>
                    <div>
                      <For each={profile?.articles}>
                        {article => (
                          <div class="animated">
                            <ArticlePreview
                              article={article}
                              onClick={navigate}
                              onRemove={(id: string) => {
                                profile?.actions.removeEvent(id, 'articles');
                              }}
                            />
                          </div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.getProfileMegaFeedNextPage(props.profileKey, 'reads');
                          // profile?.actions.fetchNextArticlesPage();
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
              <Match when={isMuted(props.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
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
                          { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.notes.length > 0}>
                    <div>
                      <For each={profile?.notes}>
                        {note => (
                          <div class="animated">
                            <Note
                              note={note}
                              shorten={true}
                              onRemove={(id: string, isRepost?: boolean) => {
                                if (note.pubkey !== account?.publicKey) {
                                  profile?.actions.removeEvent(id, 'notes');
                                  return;
                                }
                                profile?.actions.removeEvent(id, 'notes', isRepost);
                              }}
                            />
                          </div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.getProfileMegaFeedNextPage(props.profileKey, 'notes');
                          // profile?.actions.fetchNextPage();
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
              <Match when={isMuted(props.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
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
                          { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.replies.length > 0}>
                    <div>
                      <For each={profile?.replies}>
                        {reply => (
                          <div class="animated">
                            <Note
                              note={reply}
                              shorten={true}
                              onRemove={(id: string) => {
                                profile?.actions.removeEvent(id, 'replies');
                              }}
                            />
                          </div>
                        )}
                      </For>
                      <Paginator
                        loadNextPage={() => {
                          profile?.actions.getProfileMegaFeedNextPage(props.profileKey, 'replies');
                          // profile?.actions.fetchNextRepliesPage();
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

        <Tabs.Content class={styles.tabContent} value="media">
          <div class={styles.profileNotes}>
            <Switch>
              <Match when={isMuted(props.profileKey)}>
                <div class={styles.mutedProfile}>
                  {intl.formatMessage(
                    t.isMuted,
                    { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
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
                  <div>
                    <Show when={profile && profile.isFetchingGallery && profile.gallery.length === 0}>
                      <div class={styles.galleryGrid}>
                        <For each={new Array(24)}>
                          {() => <ProfileGalleryImageSkeleton />}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <Show when={profile && profile.gallery.length === 0 && !profile.isFetchingGallery}>
                      <div class={styles.mutedProfile}>
                        {intl.formatMessage(
                          t.noReplies,
                          { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
                        )}
                      </div>
                    </Show>
                  </div>

                  <Show when={profile && profile.gallery.length > 0}>
                    <div class={styles.galleryGrid}>
                      <For each={galleryImages()}>
                        {(note) => (
                          <Switch>
                            <Match when={hasImages(note)}>
                              <NoteGallery note={note} />
                            </Match>
                            <Match when={!hasImages(note)}>
                              <A href={noteLinkId(note)} class={styles.missingImage}>
                                <NoteGallery note={note} />
                              </A>
                            </Match>
                          </Switch>
                        )}
                      </For>
                    </div>
                    <Paginator
                      loadNextPage={() => {
                        profile?.actions.getProfileMegaFeedNextPage(props.profileKey, 'media');
                        // profile?.actions.fetchNextGalleryPage();
                      }}
                      isSmall={true}
                    />
                  </Show>
              </Match>
            </Switch>
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
                      { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
                    )}
                  </div>
                </Show>
              </div>

              <Show when={profile && profile.zaps.length > 0}>
                <div class={styles.profileZaps}>
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
                      { name: profile?.userProfile ? userName(profile?.userProfile) : props.profileKey },
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
  );
}

export default hookForDev(ProfileTabs);
