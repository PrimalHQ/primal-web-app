import { useIntl } from '@cookbook/solid-intl';
import { useSearchParams } from '@solidjs/router';
import { nip19 } from '../lib/nTools';
import { Component, createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { APP_ID } from '../App';
import Loader from '../components/Loader/Loader';
import NotificationItem from '../components/Notifications/NotificationItem';
import NotificationItemOld from '../components/Notifications/NotificationItemOld';
import NotificationsSidebar from '../components/NotificatiosSidebar/NotificationsSidebar';
import Paginator from '../components/Paginator/Paginator';
import Search from '../components/Search/Search';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import Wormhole from '../components/Wormhole/Wormhole';
import { Kind, minKnownProfiles, NotificationType, notificationTypeUserProps } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { notifSince, setNotifSince, useNotificationsContext } from '../contexts/NotificationsContext';
import { getNotifications, getOldNotifications, setLastSeen, truncateNumber } from '../lib/notifications';
import { subsTo } from '../sockets';
import { convertToArticles, convertToNotes } from '../stores/note';
import { convertToUser, emptyUser } from '../stores/profile';
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NostrUserStatsContent, NoteActions, NotificationGroup, PrimalArticle, PrimalNote, PrimalNotification, PrimalNotifUser, PrimalUser, SortedNotifications } from '../types/primal';
import { notifications as t } from '../translations';
import { Tabs } from "@kobalte/core/tabs";

import styles from './Notifications.module.scss';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { isPhone, timeNow } from '../utils';
import { logError } from '../lib/logger';
import { StreamingData } from '../lib/streaming';



const Notifications: Component = () => {

  const account = useAccountContext();
  const notifications = useNotificationsContext();
  const intl = useIntl();

  const [queryParams, setQueryParams] = useSearchParams();

  const [gotLastSeen, setGotLastSeen] = createSignal(false);

  const [sortedNotifications, setSortedNotifications] = createStore<SortedNotifications>({});

  const [users, setUsers] = createStore<Record<string, NostrUserContent>>({});

  const [userStats, setUserStats] = createStore<Record<string, { followers_count: number }>>({});

  const [allSet, setAllSet] = createSignal(false);
  const [fetchingOldNotifs, setfetchingOldNotifs] = createSignal(false);

  const [notificationGroup, setNotificationGroup] = createSignal<NotificationGroup>('all');

  const newNotifCount = () => {
    if (!notifications?.notificationCount) {
      return 0;
    }

    if (notifications.notificationCount > 100) {
      return 100;
    }

    return notifications.notificationCount;
  };

  type NotificationStore = {
    notes: PrimalNote[],
    reads: PrimalArticle[],
    highlights: any[],
    users: PrimalUser[],
    page: FeedPage & { highlights: any[], streams: StreamingData[]},
    reposts: Record<string, string> | undefined,
    streams: StreamingData[],
  }

  type OldNotificationStore = {
    notes: PrimalNote[],
    reads: PrimalArticle[],
    highlights: any[],
    users: Record<string, PrimalUser>,
    userStats: Record<string, { followers_count: number }>,
    page: FeedPage & { notifications: PrimalNotification[], highlights: any[], streams: StreamingData[]},
    reposts: Record<string, string> | undefined,
    notifications: PrimalNotification[],
    streams: StreamingData[],
  }

  const [relatedNotes, setRelatedNotes] = createStore<NotificationStore>({
    notes: [],
    reads: [],
    highlights: [],
    users: [],
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
      highlights: [],
      streams: [],
    },
    reposts: {},
    streams: [],
  })

  const [oldNotifications, setOldNotifications] = createStore<OldNotificationStore>({
    notes: [],
    reads: [],
    highlights: [],
    users: {},
    userStats: {},
    page: {
      messages: [],
      users: {},
      postStats: {},
      notifications: [],
      mentions: {},
      noteActions: {},
      topZaps: {},
      highlights: [],
      streams: [],
    },
    reposts: {},
    notifications: [],
    streams: []
  })

  const hasNewNotifications = createMemo(() => {
    return Object.keys(sortedNotifications).length > 0;
  });

  const publicKey = () => {
    const user = queryParams.user;
    if (user) {
      if (minKnownProfiles.names[user]) {
        return minKnownProfiles.names[user];
      }

      if (user.startsWith('npub')) {
        return nip19.decode(user).data;
      }

      return user;
    }

    return account?.publicKey;
  }

  createEffect(() => {
    if (account?.hasPublicKey() && publicKey() === account.publicKey) {
      const subid = `notif_sls_${APP_ID}`;

      const unsub = subsTo(subid, {
        onEose: () => {
          unsub();
        },
        onNotice: () => {
          logError('Error setting notifications lats seen');
          unsub();
        }
      });

      setTimeout(() => {
        setLastSeen(subid, timeNow());
      }, 1_000);

    }
  });

  let newNotifs: Record<string, PrimalNotification[]> = {};

  // Fetch new notifications
  const fetchNewNotifications = (pk: string, group: NotificationGroup) => {
    const subid = `notif_${APP_ID}`

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (content.kind === Kind.LiveEvent) {
          const stream: StreamingData = {
            id: (content.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
            url: (content.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
            image: (content.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
            status: (content.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
            starts: parseInt((content.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
            summary: (content.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
            title: (content.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
            client: (content.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
            currentParticipants: parseInt((content.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
            pubkey: content.pubkey,
            hosts: (content.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
            participants: (content.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
            event: {...content },
          }

          setRelatedNotes('page',  'streams',
            (streams) => [...streams, { ...stream }]
          );
          return;
        }
        if (!content) return;

        if (content.kind === Kind.Notification) {

          const notif = JSON.parse(content.content) as PrimalNotification;

          // Skip unknown notification types
          if (!Object.values(NotificationType).includes(notif.type)) {
            return;
          }

          if (newNotifs[notif.type]) {
            newNotifs[notif.type].push(notif);
          }
          else {
            newNotifs[notif.type] = [notif];
          }

          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          setUsers((usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));

          setRelatedNotes('page', 'users',
            (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
          );
          return;
        }

        if (content.kind === Kind.UserStats) {
          const stat = content as NostrUserStatsContent;
          const statContent = JSON.parse(content.content);

          setUserStats((stats) => ({ ...stats, [stat.pubkey]: { ...statContent } }));
          return;
        }

        if ([Kind.Text, Kind.Repost].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setRelatedNotes('page', 'messages',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if ([Kind.LongForm].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setRelatedNotes('page', 'messages',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if ([Kind.Highlight].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setRelatedNotes('page', 'highlights',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if (content.kind === Kind.NoteStats) {
          const statistic = content as NostrStatsContent;
          const stat = JSON.parse(statistic.content);

          setRelatedNotes('page', 'postStats',
            (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
          );
          return;
        }

        if (content.kind === Kind.Mentions) {
          const mentionContent = content as NostrMentionContent;
          const mention = JSON.parse(mentionContent.content);

          setRelatedNotes('page', 'mentions',
            (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
          );
          return;
        }

        if (content.kind === Kind.NoteActions) {
          const noteActionContent = content as NostrNoteActionsContent;
          const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

          setRelatedNotes('page', 'noteActions',
            (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
          );
          return;
        }
      },
      onEose: () => {
        setSortedNotifications(() => newNotifs);

        setRelatedNotes('notes', () => [...convertToNotes(relatedNotes.page)])

        // Convert related highlights
        setRelatedNotes('highlights', (h) => [...h, ...relatedNotes.page.highlights])

        // Convert related articles
        setRelatedNotes('reads', () => [...convertToArticles(relatedNotes.page)])

        setRelatedNotes('streams', (streams) => [...streams, ...relatedNotes.page.streams])

        setAllSet(true);
        setNotifSince(timeNow());
        unsub();
      },
    });

    const since = queryParams.ignoreLastSeen ? 0 : notifSince;

    newNotifs = {};
    setSortedNotifications(reconcile({}));
    getNotifications(account?.publicKey, pk as string, subid, group, since);

  };

  createEffect(() => {
    const pk = publicKey();

    if (!pk) {
      return;
    }
    const notifGroup = notificationGroup();

    setTimeout(() => {
      fetchNewNotifications(pk as string, notifGroup);
    }, 10)
  });

  const resetNotifContent = () => {
    setLastNotification(undefined);
    setOldNotifications('notifications', []);
    setOldNotifications('page', () => ({ messages: [], users: {}, postStats: {}, notifications: [] }));
    setSortedNotifications({})

  };

  onMount(() => {
    notifications?.actions.resetNotificationCounter();
  });

  onCleanup(() => {
    setLastNotification(undefined);
    setOldNotifications('notifications', []);
    setOldNotifications('page', () => ({ messages: [], users: {}, postStats: {}, notifications: [] }));
    setSortedNotifications({})
  });

  const sortNotifByRecency = (notifs: PrimalNotification[]) => {
    return notifs.sort((a: PrimalNotification, b: PrimalNotification) => {
      return b.created_at - a.created_at;
    });
  }

  const fetchOldNotifications = (until: number, group: NotificationGroup) => {
    const subid = `notif_old_${APP_ID}`

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (content.kind === Kind.LiveEvent) {
          const stream: StreamingData = {
            id: (content.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
            url: (content.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
            image: (content.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
            status: (content.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
            starts: parseInt((content.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
            summary: (content.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
            title: (content.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
            client: (content.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
            currentParticipants: parseInt((content.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
            pubkey: content.pubkey,
            hosts: (content.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
            participants: (content.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
            event: {...content },
          }

          setOldNotifications('page',  'streams',
            (streams) => [...streams, { ...stream }]
          );
          return;
        }

        if (!content?.content) {
          return;
        }

        if (content.kind === Kind.Notification) {
          const notif = JSON.parse(content.content) as PrimalNotification;

          // Ignore unsupported notification types
          const isSupportedNotification = Object.values(NotificationType).includes(notif.type);
          if (!isSupportedNotification) return;

          const isLastNotif =
            lastNotification()?.created_at === notif.created_at &&
            lastNotification()?.type === notif.type;

          if (!isLastNotif) {
            setOldNotifications('page', 'notifications',
              (notifs) => notifs ? [ ...notifs, notif] : [notif],
            );
          }

          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          setOldNotifications('page', 'users', (usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
          return;
        }

        if (content.kind === Kind.UserStats) {
          const stat = content as NostrUserStatsContent;
          const statContent = JSON.parse(content.content);

          setOldNotifications('userStats', (stats) => ({ ...stats, [stat.pubkey]: { ...statContent } }));
          return;
        }

        if ([Kind.Text, Kind.Repost].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setOldNotifications('page', 'messages',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if ([Kind.LongForm].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setOldNotifications('page', 'messages',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if ([Kind.Highlight].includes(content.kind)) {
          const message = content as NostrNoteContent;

          setOldNotifications('page', 'highlights',
            (msgs) => [ ...msgs, { ...message }]
          );

          return;
        }

        if (content.kind === Kind.NoteStats) {
          const statistic = content as NostrStatsContent;
          const stat = JSON.parse(statistic.content);

          setOldNotifications('page', 'postStats',
            (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
          );
          return;
        }

        if (content.kind === Kind.Mentions) {
          const mentionContent = content as NostrMentionContent;
          const mention = JSON.parse(mentionContent.content);

          setOldNotifications('page', 'mentions',
            (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
          );
          return;
        }

        if (content.kind === Kind.NoteActions) {
          const noteActionContent = content as NostrNoteActionsContent;
          const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

          setOldNotifications('page', 'noteActions',
            (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
          );
          return;
        }

      },
      onEose: () => {
        // Sort notifications
        const notifs = [...oldNotifications.page.notifications];

        const sorted = sortNotifByRecency(notifs);

        setOldNotifications('notifications', (notifs) => [ ...notifs, ...sorted])

        // Convert related notes
        setOldNotifications('notes', (notes) => [...notes, ...convertToNotes(oldNotifications.page)])

        // Convert related highlights
        setOldNotifications('highlights', (high) => [...high, ...oldNotifications.page.highlights])

        // Convert related articles
        setOldNotifications('reads', (reads) => [...reads, ...convertToArticles(oldNotifications.page)])

        setOldNotifications('streams', (streams) => [...streams, ...oldNotifications.page.streams])

        const pageUsers = oldNotifications.page.users;

        const newUsers = Object.keys(pageUsers).reduce((acc, key) => {
          return { ...acc, [pageUsers[key].pubkey]: { ...convertToUser(pageUsers[key], key)}};
        },  {});

        setOldNotifications('users', (users) => ({ ...users, ...newUsers }));

        setfetchingOldNotifs(false);
        unsub();
      },
    });

    setOldNotifications('page', () => ({ messages: [], users: {}, postStats: {}, notifications: [] }));

    const pk = publicKey();

    if (pk) {
      setfetchingOldNotifs(true);
      getOldNotifications(account?.publicKey, pk as string, subid, group, until);
    }

  }

  // Fetch old notifications
  createEffect(() => {
    if (account?.hasPublicKey() && !queryParams.ignoreLastSeen) {
      const notifGroup = notificationGroup();
      setTimeout(() => {
        fetchOldNotifications(notifSince || 0, notifGroup);
      }, 10);
    }
  });

  const getUsers = (
    notifs: PrimalNotification[],
    type: NotificationType,
  ) => {
    const knownUsers = Object.keys(users);
    const userProp = notificationTypeUserProps[type];

    const pks = notifs.reduce<string[]>((acc, n) => {
      // @ts-ignore
      const pubkey = n[userProp];

      if (!pubkey) {
        return acc;
      }
      return acc.includes(pubkey) ? acc : [...acc, pubkey];
    }, []);

    return pks.map((pk) => {
      const user = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      return { ...user, ...userStats[pk]} as PrimalNotifUser;
    });
  }

  const groupBy = (notifs: PrimalNotification[], keyName: string) => {
    return notifs.reduce<Record<string, PrimalNotification[]>>(
      (group: Record<string, PrimalNotification[]>, notif) => {
        // @ts-ignore
        const key: string = notif[keyName] || 'none';

        group[key] = group[key] ?? [];
        group[key].push(notif);

        return group;
      },
      {},
    );
  };

  const liveEventStarted = () => {
    const type = NotificationType.LIVE_EVENT_HAPPENING;
    const notifs = sortedNotifications[type];

    if (!notifs) {
      return;
    }
    const grouped = groupBy(notifs, 'live_event_id');

    const keys = Object.keys(grouped);

    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={getUsers(grouped[key], type)}
            streams={relatedNotes.streams}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const newUserFollowedYou = () => {
    const type = NotificationType.NEW_USER_FOLLOWED_YOU;
    const notifs = sortedNotifications[type];

    if (!notifs) {
      return;
    }

    return <NotificationItem
      type={type}
      users={getUsers(notifs, type)}
    />
  };

  const userUnfollowedYou = () => {
    const type = NotificationType.USER_UNFOLLOWED_YOU;
    const notifs = sortedNotifications[type];

    if (!notifs) {
      return;
    }

    return <NotificationItem
      type={type}
      users={getUsers(notifs, type)}
    />
  };

  const yourPostWasLiked = () => {
    const type = NotificationType.YOUR_POST_WAS_LIKED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'your_post');

    const keys = Object.keys(grouped);

    return <For each={notifs}>
      {notif => {
        return (
        <NotificationItem
          type={type}
          notification={notif}
          users={getUsers(grouped[notif.your_post || ''], type)}
          note={relatedNotes.notes.find(n => n.post.id === notif.your_post)}
          read={relatedNotes.reads.find(n => n.id === notif.your_post)}
        />
      )}}
    </For>
  };

  //
  const yourPostWasReposted = () => {
    const type = NotificationType.YOUR_POST_WAS_REPOSTED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'your_post');

    const keys = Object.keys(grouped);

    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={getUsers(grouped[key], type)}
            note={relatedNotes.notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const yourPostWasRepliedTo = () => {
    const type = NotificationType.YOUR_POST_WAS_REPLIED_TO;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'reply');

    const keys = Object.keys(grouped);


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={getUsers(grouped[key], type)}
            note={relatedNotes.notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };


  const yourThreadWasRepliedTo = () => {
    const type = NotificationType.REPLY_TO_REPLY;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'reply');

    const keys = Object.keys(grouped);


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={getUsers(grouped[key], type)}
            note={relatedNotes.notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const yourPostWasZapped = () => {
    const type = NotificationType.YOUR_POST_WAS_ZAPPED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'your_post');

    const keys = Object.keys(grouped);

    return <For each={keys}>
      {key => {
        const sats = grouped[key].reduce((acc, n) => {
          return n.satszapped ? acc + n.satszapped : acc;
        },0);

        return (
          <NotificationItem
            type={type}
            users={getUsers(grouped[key], type)}
            note={relatedNotes.notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            iconInfo={`${truncateNumber(sats)}`}
            iconTooltip={`${sats} sats`}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const youWereMentioned = () => {
    const type = NotificationType.YOU_WERE_MENTIONED_IN_POST;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'you_were_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const yourPostWasMentioned = () => {
    const type = NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'your_post_were_mentioned_in');

    const keys = Object.keys(grouped);


    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            read={relatedNotes.reads.find(n => n.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYouWereMentionedInWasLiked = () => {
    const type = NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_you_were_mentioned_in');

    const keys = Object.keys(grouped);


    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYouWereMentionedInWasZapped = () => {
    const type = NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_you_were_mentioned_in');

    const keys = Object.keys(grouped);


    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        const sats = grouped[key].reduce((acc, n) => {
          return n.satszapped ? acc + n.satszapped : acc;
        },0);
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            iconInfo={`${truncateNumber(sats)}`}
            iconTooltip={`${sats} sats`}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYouWereMentionedInWasReposted = () => {
    const type = NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_you_were_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYouWereMentionedInWasRepliedTo = () => {
    const type = NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'reply');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };


  const postYourPostWasMentionedInWasLiked = () => {
    const type = NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_your_post_was_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYourPostWasMentionedInWasZapped = () => {
    const type = NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_your_post_was_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));
    const reads = relatedNotes.notes.filter(n => keys.includes(n.id));

    if (notes.length === 0 && reads.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        const sats = grouped[key].reduce((acc, n) => {
          return n.satszapped ? acc + n.satszapped : acc;
        },0);
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            read={reads.find(n => n.id === key)}
            iconInfo={`${truncateNumber(sats)}`}
            iconTooltip={`${sats} sats`}
            notification={notifs[0]}
            sats={sats}
          />
        )}
      }
    </For>
  };

  const postYourPostWasMentionedInWasReposted = () => {
    const type = NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_your_post_was_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };

  const postYourPostWasMentionedInWasRepliedTo = () => {
    const type = NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'reply');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notes.reduce((acc, note) => {
      const pk: string = note.user.pubkey;

      const rUser: PrimalUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [note.post.id]: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };


  const articleWasHighlighted = () => {
    const type = NotificationType.YOUR_POST_WAS_HIGHLIGHTED;
    const notifs = sortedNotifications[type] || [];

    const reads = relatedNotes.reads;
    const highlights = relatedNotes.highlights;

    if (reads.length === 0 || highlights.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers = notifs.reduce<Record<string, PrimalNotifUser[]>>((acc, notif) => {
      const pk = notif.who_highlighted_it;

      if (!pk) return acc;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [notif.id]: usrs};

    }, {});

    return <For each={notifs}>
      {notif => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[notif.id || '']}
            read={reads.find(n => n.id === notif.your_post)}
            highlight={highlights.find(n => n.id === notif.highlight)}
            notification={notif}
          />
        )}
      }
    </For>
  };


  const postWasBookmarked = () => {
    const type = NotificationType.YOUR_POST_WAS_BOOKMARKED;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'your_post');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers: Record<string, PrimalNotifUser[]> = notifs.reduce((acc, notif) => {
      const pk: string = notif.who_bookmarked_it;

      if (!pk) return acc;

      const rUser: PrimalUser = knownUsers.includes(pk) ?
        convertToUser(users[pk], pk) :
        emptyUser(pk);

      const usrs = [{...rUser, ...userStats[pk]}];

      return { ...acc, [notif.your_post || 'none']: usrs};

    }, {});


    return <For each={keys}>
      {key => {
        return (
          <NotificationItem
            type={type}
            users={rUsers[key]}
            note={notes.find(n => n.post.id === key)}
            notification={notifs[0]}
          />
        )}
      }
    </For>
  };


  const [lastNotification, setLastNotification] = createSignal<PrimalNotification>();

  const fetchMoreNotifications = () => {
    const lastNotif = oldNotifications.notifications[oldNotifications.notifications.length - 1];

    if (!lastNotif || lastNotif.created_at === lastNotification()?.created_at) {
      return;
    }

    setLastNotification(lastNotif);

    const until = lastNotif.created_at;

    if (until > 0) {
      fetchOldNotifications(until, notificationGroup());
    }
  }

  const copyNewNotifsToOld = () => {
    const keys = Object.keys(newNotifs);

    let notifs: PrimalNotification[] = []

    for (let i=0;i<keys.length;i++) {
      notifs = [...notifs, ...newNotifs[keys[i]]];
    }

    const sorted = sortNotifByRecency(notifs);

    setOldNotifications('notifications', (old) => [ ...sorted, ...old ]);
    setOldNotifications('notes', (old) => [ ...relatedNotes.notes, ...old ]);
    setOldNotifications('reads', (old) => [ ...relatedNotes.reads, ...old ]);
    setOldNotifications('highlights', (old) => [ ...relatedNotes.highlights, ...old ]);
    setOldNotifications('reposts', () => ({ ...relatedNotes.reposts }));

    const users = relatedNotes.users.reduce((acc, u) => ({ ...acc, [u.pubkey]: u }), {});

    setOldNotifications('users', () => ({ ...users }));
  }

  const loadNewContent = () => {
    copyNewNotifsToOld();

    notifications?.actions.resetNotificationCounter();
    setLastSeen(`notif_sls_${APP_ID}`, timeNow());

    if (notificationGroup() !== 'all') {
      resetNotifContent();
      setNotificationGroup('all');
    }
    else {
      fetchNewNotifications(publicKey() as string, notificationGroup());
    }
  }

  return (
    <div>
      <PageTitle title={
        intl.formatMessage(t.title)}
      />

      <Show when={!isPhone()}>
        <Wormhole
          to="search_section"
        >
          <Search />
        </Wormhole>
        <StickySidebar>
          <NotificationsSidebar
            notifications={sortedNotifications}
            getUsers={getUsers}
          />
        </StickySidebar>
      </Show>

      <PageCaption title={intl.formatMessage(t.title)} />

      <Show when={newNotifCount() > 0 && !account?.showNewNoteForm}>
        <div class={styles.newContentNotification}>
          <button
            onClick={loadNewContent}
          >
            <div class={styles.counter}>
              {intl.formatMessage(
                t.newNotifs,
                {
                  number: newNotifCount(),
                })}
            </div>
          </button>
        </div>
      </Show>

      <Tabs
        value={notificationGroup()}
        onChange={(group: string) => {
          resetNotifContent();
          setNotificationGroup(group as NotificationGroup);
        }}
      >
        <Tabs.List class={styles.notificationTabs}>
          <Tabs.Trigger class={styles.notificationTab} value="all">
            {intl.formatMessage(t.all)}
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.notificationTab} value="zaps">
            {intl.formatMessage(t.zaps)}
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.notificationTab} value="replies">
            {intl.formatMessage(t.replies)}
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.notificationTab} value="mentions">
            {intl.formatMessage(t.mentions)}
          </Tabs.Trigger>

          <Tabs.Trigger class={styles.notificationTab} value="reposts">
            {intl.formatMessage(t.reposts)}
          </Tabs.Trigger>

          <Tabs.Indicator class={styles.notificationTabIndicator} />
        </Tabs.List>

        <Tabs.Content class={styles.notificationTabContent} value="all">
          <Show
            when={publicKey() && allSet()}
            fallback={
              <div class={styles.loader}>
                <Loader />
              </div>
            }
          >
            {liveEventStarted()}

            {newUserFollowedYou()}
            {userUnfollowedYou()}

            {yourPostWasZapped()}

            {yourPostWasRepliedTo()}
            {yourThreadWasRepliedTo()}
            {yourPostWasReposted()}
            {yourPostWasLiked()}

            {youWereMentioned()}
            {yourPostWasMentioned()}

            {articleWasHighlighted()}
            {postWasBookmarked()}


            {postYouWereMentionedInWasZapped()}
            {postYouWereMentionedInWasRepliedTo()}
            {postYouWereMentionedInWasReposted()}
            {postYouWereMentionedInWasLiked()}

            {postYourPostWasMentionedInWasZapped()}
            {postYourPostWasMentionedInWasRepliedTo()}
            {postYourPostWasMentionedInWasReposted()}
            {postYourPostWasMentionedInWasLiked()}

            <Show when={fetchingOldNotifs()}>
              <div class={styles.loader}>
                <Loader />
              </div>
            </Show>

            <Show when={oldNotifications.notifications.length > 0}>
              <div class={styles.oldNotifications}>
                <For each={oldNotifications.notifications}>
                  {notif => (
                    <NotificationItemOld
                      notification={notif}
                      users={oldNotifications.users}
                      userStats={oldNotifications.userStats}
                      notes={oldNotifications.notes}
                      reads={oldNotifications.reads}
                      highlights={oldNotifications.highlights}
                      streams={oldNotifications.streams}
                    />
                  )}
                </For>
                <Paginator loadNextPage={fetchMoreNotifications} />
              </div>
            </Show>

          </Show>
        </Tabs.Content>

        <For each={['zaps', 'replies', 'mentions', 'reposts']}>
          {group =>
            <Tabs.Content class={styles.notificationTabContent} value={group}>
              <Show
                when={oldNotifications.notifications.length > 0}
                fallback={
                  <div class={styles.loader}>
                    <Loader />
                  </div>
                }
              >
                <div class={styles.oldNotifications}>
                  <For each={oldNotifications.notifications}>
                    {notif => (
                      <NotificationItemOld
                        notification={notif}
                        users={oldNotifications.users}
                        userStats={oldNotifications.userStats}
                        notes={oldNotifications.notes}
                        reads={oldNotifications.reads}
                        highlights={oldNotifications.highlights}
                      />
                    )}
                  </For>
                  <Paginator loadNextPage={fetchMoreNotifications} />
                </div>
              </Show>
            </Tabs.Content>
          }
        </For>

      </Tabs>
    </div>
  );
}

export default Notifications;
