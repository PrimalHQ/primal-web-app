import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { A, useNavigate } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { Kind, urlRegexG } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { ReactionStats, useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { getEventQuotes, getEventQuoteStats, getEventReactions, getEventZaps, parseLinkPreviews, setLinkPreviews } from '../../lib/notes';
import { truncateNumber2 } from '../../lib/notifications';
import { subsTo } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { userName } from '../../stores/profile';
import { actions as tActions, placeholders as tPlaceholders, reactionsModal } from '../../translations';
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalNote } from '../../types/primal';
import { parseBolt11 } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Note from '../Note/Note';
import Paginator from '../Paginator/Paginator';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ReactionsModal.module.scss';
import DOMPurify from 'dompurify';


const ReactionsModal: Component<{
  id?: string,
  noteId: string | undefined,
  stats: ReactionStats;
  onClose?: () => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const navigate = useNavigate();

  const [selectedTab, setSelectedTab] = createSignal('default');

  const [likeList, setLikeList] = createStore<any[]>([]);
  const [zapList, setZapList] = createStore<any[]>([]);
  const [repostList, setRepostList] = createStore<any[]>([]);
  const [quotesList, setQuotesList] = createStore<PrimalNote[]>([]);
  const [quoteCount, setQuoteCount] = createSignal(0);

  const [isFetching, setIsFetching] = createSignal(false);

  let loadedLikes = 0;
  let loadedZaps = 0;
  let loadedReposts = 0;
  let loadedQuotes = 0;

  createEffect(() => {
    const count = quoteCount();

    if (count === 0 && props.stats.quotes > 0) {
      setQuoteCount(props.stats.quotes);
    }
  })

  createEffect(() => {
    if (props.noteId && props.stats.openOn) {
      setSelectedTab(props.stats.openOn);
    }
  });

  createEffect(() => {
    if (props.noteId) {
      getQuoteCount();
    }
  });

  createEffect(() => {
    switch (selectedTab()) {
      case 'likes':
        loadedLikes === 0 && getLikes();
        break;
      case 'zaps':
        loadedZaps === 0 && getZaps();
        break;
      case 'reposts':
        loadedReposts === 0 && getReposts();
        break;
      case 'quotes':
        loadedQuotes === 0 && getQuotes();
        break;
    }
  });

  createEffect(() => {
    if (selectedTab() === 'default') {
      if (props.stats.zaps > 0) {
        setSelectedTab(() => 'zaps');
        return;
      }
      if (props.stats.likes > 0) {
        setSelectedTab(() => 'likes');
        return;
      }
      if (props.stats.reposts > 0) {
        setSelectedTab(() => 'reposts');
        return;
      }
      if (props.stats.quotes > 0) {
        setSelectedTab(() => 'quotes');
        return;
      }
    }
  })

  createEffect(() => {
    if (!props.noteId) {
      setLikeList(() => []);
      setZapList(() => []);
      setRepostList(() => []);
      setSelectedTab(() => 'default');
      setQuotesList(() => []);
      setQuoteCount(() => 0);

      loadedLikes = 0;
      loadedZaps = 0;
      loadedReposts = 0;
      loadedQuotes = 0;
    }
  });

  const getLikes = (offset = 0) => {
    if (!props.noteId) return;

    const subId = `nr_l_${props.noteId}_${APP_ID}`;

    const users: any[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users.push(user);
        }
      },
      onEose: () => {
        setLikeList((likes) => [ ...likes, ...users ]);
        loadedLikes = likeList.length;
        setIsFetching(() => false);
        unsub();
      },
    });

    setIsFetching(() => true);
    getEventReactions(props.noteId, Kind.Reaction, subId, offset);
  };

  const getZaps = (offset = 0) => {
    if (!props.noteId) return;

    const subId = `nr_z_${props.noteId}_${APP_ID}`;

    const users: Record<string, any> = {};
    const zaps: any[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users[content.pubkey] = { ...user };

          return;
        }

        if (content?.kind === Kind.Zap) {
          const zapTag = content.tags.find(t => t[0] === 'description');

          if (!zapTag) return;

          const zapInfo = JSON.parse(zapTag[1] || '{}');

          let amount = '0';

          let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

          if (bolt11Tag) {
            try {
              amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
            } catch (e) {
              const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

              amount = amountTag ? amountTag[1] : '0';
            }
          }

          zaps.push({
            amount,
            pubkey: zapInfo.pubkey,
            message: zapInfo.content,
          })

          return;
        }
      },
      onEose: () => {
        const zapData = zaps.map((zap => ({
          ...zap,
          amount: parseInt(zap.amount || '0'),
          sender: users[zap.pubkey],
        })));

        setZapList((zapItems) => [ ...zapItems, ...zapData ]);
        loadedZaps = zapList.length;
        setIsFetching(() => false);
        unsub();
      },
    });

    setIsFetching(() => true);
    getEventZaps(props.noteId, account?.publicKey, subId, 20, offset);
    // getEventReactions(props.noteId, Kind.Zap, subId, offset);
  };

  const getReposts = (offset = 0) => {
    if (!props.noteId) return;

    const subId = `nr_r_${props.noteId}_${APP_ID}`;

    const users: any[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users.push(user);
        }
      },
      onEose: () => {
        setRepostList((reposts) => [...reposts, ...users]);
        loadedReposts = repostList.length;
        setIsFetching(() => false);
        unsub();
      },
    });

    setIsFetching(() => true);
    getEventReactions(props.noteId, Kind.Repost, subId, offset);
  };

  const getQuotes = (offset = 0) => {
    if (!props.noteId) return;

    const subId = `nr_q_${props.noteId}_${APP_ID}`;

    let page: FeedPage = {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
    };

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          page.users[user.pubkey] = { ...user };

          return;
        }
        if (content?.kind === Kind.Text) {
          const message = content as NostrNoteContent;

          const isAlreadyInPage = page.messages.find(m => m.id === message.id);
          const isAlreadyInTheList = quotesList.find(n => n.id === message.id);

          if (isAlreadyInPage || isAlreadyInTheList) {
            return;
          }

          page.messages.push(message);
          return;
        }

        if (content?.kind === Kind.NoteStats) {
          const statistic = content as NostrStatsContent;
          const stat = JSON.parse(statistic.content);

          page.postStats[stat.event_id] = { ...stat };
          return;
        }

        if (content?.kind === Kind.Mentions) {
          const mentionContent = content as NostrMentionContent;
          const mention = JSON.parse(mentionContent.content);

          if (!page.mentions) {
            page.mentions = {};
          }

          page.mentions[mention.id] = { ...mention };
          return;
        }

        if (content?.kind === Kind.NoteActions) {
          const noteActionContent = content as NostrNoteActionsContent;
          const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

          page.noteActions[noteActions.event_id] = { ...noteActions };

          return;
        }

        if (content?.kind === Kind.LinkMetadata) {
          parseLinkPreviews(JSON.parse(content.content));
          return;
        }
      },
      onEose: () => {
        const pageNotes = convertToNotes(page);

        setQuotesList((notes) => [...notes, ...pageNotes]);
        loadedQuotes = quotesList.length;
        setIsFetching(() => false);
        unsub();
      },
    });

    setIsFetching(() => true);
    getEventQuotes(props.noteId, subId, offset, account?.publicKey);
  };

  const getQuoteCount = () => {
    if (!props.noteId) return;

    const subId = `nr_qc_${props.noteId}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content?.kind === Kind.NoteQuoteStats) {
          const quoteStats = JSON.parse(content.content);

          setQuoteCount(() => quoteStats.count || 0);
        }
      },
      onEose: () => {
        unsub();
      },
    });

    getEventQuoteStats(props.noteId, subId);
  }

  const totalCount = () => props.stats.likes + (quoteCount() || props.stats.quotes || 0) + props.stats.reposts + props.stats.zaps;

  const parseForLinks = (text: string) => {
    const purified = DOMPurify.sanitize(text);

    return purified.replace(urlRegexG, (url) => `<a href="${url}" target="_blank">${url}</a>`);
  };

  return (
    <AdvancedSearchDialog
      open={props.noteId !== undefined}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      title={
        <div class={styles.title}>
          <div class={styles.caption}>
            {intl.formatMessage(tActions.reactions, { count: totalCount() })}
          </div>
        </div>
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.ReactionsModal}>
        <Switch>
          <Match when={!isFetching && totalCount() === 0}>
            {intl.formatMessage(tPlaceholders.noReactionDetails)}
          </Match>
        </Switch>

        <div class={styles.description}>
          <Tabs value={selectedTab()} onChange={setSelectedTab}>
            <Tabs.List class={styles.tabs}>
              <Show when={props.stats.zaps > 0}>
                <Tabs.Trigger class={styles.tab} value={'zaps'} >
                 {intl.formatMessage(reactionsModal.tabs.zaps, { count: props.stats.zaps })}
                </Tabs.Trigger>
              </Show>
              <Show when={props.stats.likes > 0}>
                <Tabs.Trigger class={styles.tab} value={'likes'} >
                 {intl.formatMessage(reactionsModal.tabs.likes, { count: props.stats.likes })}
                </Tabs.Trigger>
              </Show>
              <Show when={props.stats.reposts > 0}>
                <Tabs.Trigger class={styles.tab} value={'reposts'} >
                 {intl.formatMessage(reactionsModal.tabs.reposts, { count: props.stats.reposts })}
                </Tabs.Trigger>
              </Show>
              <Show when={quoteCount() > 0}>
                <Tabs.Trigger class={styles.tab} value={'quotes'} >
                 {intl.formatMessage(reactionsModal.tabs.quotes, { count: quoteCount() })}
                </Tabs.Trigger>
              </Show>

              <Tabs.Indicator class={styles.tabIndicator} />
            </Tabs.List>

            <Tabs.Content class={styles.tabContent} value={'likes'}>
              <For
                each={likeList}
                fallback={
                  <Show when={!isFetching()}>
                    <Show
                      when={totalCount() > 0}
                      fallback={intl.formatMessage(tPlaceholders.noReactionDetails)}
                    >
                      {intl.formatMessage(tPlaceholders.noLikeDetails)}
                    </Show>
                  </Show>
                }
              >
                {admirer =>
                  <A
                    href={app?.actions.profileLink(admirer.npub) || ''}
                    class={styles.likeItem}
                    onClick={props.onClose}
                  >
                    <div class={styles.likeIcon}></div>
                    <Avatar
                      user={admirer}
                      src={admirer.picture}
                      size="vs"
                    />
                    <div class={styles.userName}>
                      <div class={styles.name}>
                        {userName(admirer)}
                      </div>
                      <VerificationCheck user={admirer} />
                    </div>
                  </A>
                }
              </For>

              <Show when={likeList.length < props.stats.likes}>
                <Paginator
                  loadNextPage={() => {
                    const len = likeList.length;
                    if (len === 0) return;
                    getLikes(len+1);
                  }}
                  isSmall={true}
                />
              </Show>

              <Show
                when={isFetching()}
              >
                <Loader />
              </Show>
            </Tabs.Content>

            <Tabs.Content class={styles.tabContent} value={'zaps'}>
              <For
                each={zapList}
                fallback={
                  <Show when={!isFetching()}>
                    <Show
                      when={totalCount() > 0}
                      fallback={intl.formatMessage(tPlaceholders.noReactionDetails)}
                    >
                      {intl.formatMessage(tPlaceholders.noZapDetails)}
                    </Show>
                  </Show>
                }
              >
                {zap =>
                  <A
                    href={app?.actions.profileLink(hexToNpub(zap.pubkey)) || ''}
                    class={styles.zapItem}
                    onClick={props.onClose}
                  >
                    <div class={styles.zapAmount}>
                      <div class={styles.zapIcon}></div>
                      <div class={styles.amount}>{zap.amount < 100_000 ? zap.amount.toLocaleString() : truncateNumber2(zap.amount)}</div>
                    </div>
                    <Avatar
                      user={zap.sender}
                      src={zap.sender?.picture}
                      size="vs"
                    />
                    <div class={styles.zapInfo}>
                      <div class={styles.userName}>
                        <div class={styles.name}>
                          {userName(zap.sender)}
                        </div>
                        <VerificationCheck user={zap} />
                      </div>
                      <div class={styles.zapMessage} innerHTML={parseForLinks(zap.message)}>
                      </div>
                    </div>
                  </A>
                }
              </For>

              <Show when={zapList.length < props.stats.zaps}>
                <Paginator
                  loadNextPage={() => {
                    const len = zapList.length;
                    if (len === 0) return;
                    getZaps(len+1);
                  }}
                  isSmall={true}
                />
              </Show>

              <Show
                when={isFetching()}
              >
                <Loader />
              </Show>
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value={'reposts'}>
              <For
                each={repostList}
                fallback={
                  <Show when={!isFetching()}>
                    <Show
                      when={totalCount() > 0}
                      fallback={intl.formatMessage(tPlaceholders.noReactionDetails)}
                    >
                      {intl.formatMessage(tPlaceholders.noRepostDetails)}
                    </Show>
                  </Show>
                }
              >
                {reposter =>
                  <A
                    href={app?.actions.profileLink(reposter.npub) || ''}
                    class={styles.repostItem}
                    onClick={props.onClose}
                  >
                    <div class={styles.repostIcon}></div>
                    <Avatar
                      user={reposter}
                      src={reposter.picture}
                      size="vs"
                    />
                    <div class={styles.userName}>
                      <div class={styles.name}>
                        {userName(reposter)}
                      </div>
                      <VerificationCheck user={reposter} />
                    </div>
                  </A>
                }
              </For>

              <Show when={repostList.length < props.stats.reposts}>
                <Paginator
                  loadNextPage={() => {
                    const len = repostList.length;
                    if (len === 0) return;
                    getReposts(len+1);
                  }}
                  isSmall={true}
                />
              </Show>

              <Show
                when={isFetching()}
              >
                <Loader />
              </Show>
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value={'quotes'}>
              <For
                each={quotesList}
                fallback={
                  <Show when={!isFetching()}>
                    <Show
                      when={totalCount() > 0}
                      fallback={intl.formatMessage(tPlaceholders.noReactionDetails)}
                    >
                      {intl.formatMessage(tPlaceholders.noQuoteDetails)}
                    </Show>
                  </Show>
                }
              >
                {quote => (
                  <Note
                    note={quote}
                    shorten={true}
                    noteType="reaction"
                    onClick={(note: PrimalNote) => {
                      if (note) {
                        navigate(`/e/${note.noteIdShort}`)
                      }
                      props.onClose && props.onClose();
                    }}
                  />
                )}
              </For>
              <Paginator
                loadNextPage={() => {
                  const len = quotesList.length;
                  if (len === 0) return;
                  getQuotes(len+1);
                }}
                isSmall={true}
              />
            </Tabs.Content>
          </Tabs>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReactionsModal);
