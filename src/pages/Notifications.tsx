import { useIntl } from '@cookbook/solid-intl';
import { useSearchParams } from '@solidjs/router';
import { decode, noteEncode } from 'nostr-tools/nip19';
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { style } from 'solid-js/web';
import { APP_ID } from '../App';
import Branding from '../components/Branding/Branding';
import MissingPage from '../components/MissingPage/MissingPage';
import NotificationItem from '../components/Notifications/NotificationItem';
import NotificationItem2 from '../components/Notifications/NotificationItem2';
import NotificationsSidebar from '../components/NotificatiosSidebar/NotificationsSidebar';
import Paginator from '../components/Paginator/Paginator';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import Wormhole from '../components/Wormhole/Wormhole';
import { Kind, minKnownProfiles, NotificationType, notificationTypeUserProps } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { getEvents } from '../lib/feed';
import { saveFollowing } from '../lib/localStore';
import { sendContacts } from '../lib/notes';
import { getLastSeen, getNotifications, getOldNotifications, setLastSeen } from '../lib/notifications';
import { subscribeTo } from '../sockets';
import { convertToNotes } from '../stores/note';
import { convertToUser, emptyUser, truncateNpub } from '../stores/profile';
import { FeedPage, NostrNoteContent, NostrStatsContent, NostrUserContent, NostrUserStatsContent, PrimalNote, PrimalNotification, PrimalNotifUser, PrimalUser, SortedNotifications } from '../types/primal';

import styles from './Notifications.module.scss';

const Notifications: Component = () => {

  const account = useAccountContext();
  const intl = useIntl();

  const [queryParams, setQueryParams] = useSearchParams();

  const [notifSince, setNotifSince] = createSignal<number>();

  const [notifications, setNotifications] = createStore<PrimalNotification[]>([]);

  const [sortedNotifications, setSortedNotifications] = createStore<SortedNotifications>({});

  const [users, setUsers] = createStore<Record<string, NostrUserContent>>({});

  const [userStats, setUserStats] = createStore<Record<string, { followers_count: number }>>({});

  const [allSet, setAllSet] = createSignal(false);

  type NotificationStore = {
    notes: PrimalNote[],
    users: PrimalUser[],
    page: FeedPage,
    reposts: Record<string, string> | undefined,
  }

  type OldNotificationStore = {
    notes: PrimalNote[],
    users: Record<string, PrimalUser>,
    userStats: Record<string, { followers_count: number }>,
    page: FeedPage & { notifications: PrimalNotification[]},
    reposts: Record<string, string> | undefined,
    notifications: PrimalNotification[],
  }

  const [relatedNotes, setRelatedNotes] = createStore<NotificationStore>({
    notes: [],
    users: [],
    page: { messages: [], users: {}, postStats: {} },
    reposts: {},
  })

  const [oldNotifications, setOldNotifications] = createStore<OldNotificationStore>({
    notes: [],
    users: {},
    userStats: {},
    page: { messages: [], users: {}, postStats: {}, notifications: [] },
    reposts: {},
    notifications: [],
  })

  const publicKey = () => {
    const user = queryParams.user;
    if (user) {
      if (minKnownProfiles.names[user]) {
        return minKnownProfiles.names[user];
      }

      if (user.startsWith('npub')) {
        return decode(user).data;
      }

      return user;
    }

    return account?.publicKey;
  }

  createEffect(() => {
    const pk = publicKey();
    if (pk) {
      const subid = `notif_ls_${APP_ID}`

      const unsub = subscribeTo(subid, async (type, _, content) => {
        if (type === 'EVENT' && content?.kind === Kind.Timestamp) {

          const timestamp = parseInt(content.content);

          if (!isNaN(timestamp)) {
            setNotifSince(timestamp);
          }

          unsub();
          return;
        }

        if (type === 'EOSE') {
          if (!notifSince()) {
            setNotifSince(0);
          }
        }

      });

      getLastSeen(pk as string, subid);
    }
  });

  createEffect(() => {
    if (account?.hasPublicKey() && publicKey() === account.publicKey) {
      const subid = `notif_sls_${APP_ID}`

      const unsub = subscribeTo(subid, async (type, _, content) => {
        if (type === 'EOSE') {
          unsub();
          return;
        }

        if (type === 'NOTICE') {
          console.log('Error setting notifications lats seen');
          unsub();
          return;
        }

      });

      setTimeout(() => {
        setLastSeen(subid, Math.floor((new Date()).getTime() / 1000));
      }, 10);

    }
  });

  // Fetch new notifications
  createEffect(() => {
    const pk = publicKey();

    if (!pk || notifSince() === undefined) {
      return;
    }

    const subid = `notif_${APP_ID}`

    const unsub = subscribeTo(subid, async (type, _, content) => {
      if (type === 'EVENT') {
        if (!content?.content) {
          return;
        }

        if (content.kind === Kind.Notification) {
          const notif = JSON.parse(content.content) as PrimalNotification;

          setSortedNotifications(notif.type, (notifs) => {
            return notifs ? [ ...notifs, notif] : [notif];
          });

          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          setUsers((usrs) => ({ ...usrs, [user.pubkey]: { ...user } }));
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

        if (content.kind === Kind.NoteStats) {
          const statistic = content as NostrStatsContent;
          const stat = JSON.parse(statistic.content);

          setRelatedNotes('page', 'postStats',
            (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
          );
          return;
        }

      }

      if (type === 'EOSE') {
        setRelatedNotes('notes', () => [...convertToNotes(relatedNotes.page)])
        setAllSet(true)
        unsub();
        return;
      }

    });

    const since = queryParams.ignoreLastSeen ? 0 : notifSince();

    getNotifications(pk as string, subid, since);
  });

  onCleanup(() => {
    setLastNotification(undefined);
    setOldNotifications('notifications', []);
    setOldNotifications('page', () => ({ messages: [], users: {}, postStats: {}, notifications: [] }));
    setNotifSince(0);
    setNotifications([]);
  });

  const sortNotifByRecency = (notifs: PrimalNotification[]) => {
    return notifs.sort((a: PrimalNotification, b: PrimalNotification) => {
      return b.created_at - a.created_at;
    });
  }

  const fetchOldNotifications = (until: number) => {
    const subid = `notif_old_${APP_ID}`

    const unsub = subscribeTo(subid, async (type, _, content) => {
      if (type === 'EVENT') {
        if (!content?.content) {
          return;
        }

        if (content.kind === Kind.Notification) {
          const notif = JSON.parse(content.content) as PrimalNotification;


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

        if (content.kind === Kind.NoteStats) {
          const statistic = content as NostrStatsContent;
          const stat = JSON.parse(statistic.content);

          setOldNotifications('page', 'postStats',
            (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
          );
          return;
        }

      }

      if (type === 'EOSE') {

        // Sort notifications
        const notifs = [...oldNotifications.page.notifications];

        const sorted = sortNotifByRecency(notifs);

        setOldNotifications('notifications', (notifs) => [ ...notifs, ...sorted])

        // Convert related notes
        setOldNotifications('notes', () => [...convertToNotes(oldNotifications.page)])

        const pageUsers = oldNotifications.page.users;

        const newUsers = Object.keys(pageUsers).reduce((acc, key) => {
          return { ...acc, [pageUsers[key].pubkey]: { ...convertToUser(pageUsers[key])}};
        },  {});

        setOldNotifications('users', (users) => ({ ...users, ...newUsers }));

        unsub();
        return;
      }

    });

    setOldNotifications('page', () => ({ messages: [], users: {}, postStats: {}, notifications: [] }));

    const pk = publicKey();

    if (pk) {
      getOldNotifications(pk as string, subid, until);
    }

  }

  // Fetch old notifications
  createEffect(() => {
    if (account?.hasPublicKey() && !queryParams.ignoreLastSeen) {
      setTimeout(() => {
        fetchOldNotifications(notifSince());
      }, 2000);
    }
  });

  const displaySats = (amount: number) => {
    const t = 1000;
    if (amount < t) {
      return `${amount}`;
    }

    if (amount < (t^2)) {
      return `${Math.floor(amount / t)}K`;
    }

    if (amount < (t^3)) {
      return `${Math.floor(amount / (t^2))}M`
    }

    if (amount < (t^4)) {
      return `${Math.floor(amount / (t^4))}B`
    }

    return `1T+`;
  };

  const getUsers = (
    notifs: PrimalNotification[],
    type: NotificationType,
  ) => {
    const knownUsers = Object.keys(users);
    const userProp = notificationTypeUserProps[type];

    const pks = notifs.reduce<string[]>((acc, n) => {
      const pubkey = n[userProp];

      if (!pubkey) {
        return acc;
      }
      return acc.includes(pubkey) ? acc : [...acc, pubkey];
    }, []);

    return pks.map((pk) => {
      const user = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
        emptyUser(pk);

      return { ...user, ...userStats[pk]} as PrimalNotifUser;
    });
  }

  const groupBy = (notifs: PrimalNotification[], keyName: string) => {
    return notifs.reduce<Record<string, PrimalNotification[]>>(
      (group: Record<string, PrimalNotification[]>, notif) => {
        const key: string = notif[keyName] || 'none';
        group[key] = group[key] ?? [];
        group[key].push(notif);
        return group;
      },
      {},
    );
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

    return <For each={keys}>
      {key => {
        return (
        <NotificationItem
          type={type}
          users={getUsers(grouped[key], type)}
          note={relatedNotes.notes.find(n => n.post.id === key)}
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
            iconInfo={`${displaySats(sats)}`}
            iconTooltip={`${sats} sats`}
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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
            iconInfo={`${displaySats(sats)}`}
            iconTooltip={`${sats} sats`}
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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
          />
        )}
      }
    </For>
  };

  const postYouWereMentionedInWasRepliedTo = () => {
    const type = NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_you_were_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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
            iconInfo={`${displaySats(sats)}`}
            iconTooltip={`${sats} sats`}
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

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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
          />
        )}
      }
    </For>
  };

  const postYourPostWasMentionedInWasRepliedTo = () => {
    const type = NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO;
    const notifs = sortedNotifications[type] || [];

    const grouped = groupBy(notifs, 'post_your_post_was_mentioned_in');

    const keys = Object.keys(grouped);

    const notes = relatedNotes.notes.filter(n => keys.includes(n.post.id));

    if (notes.length === 0) {
      return;
    }

    const knownUsers = Object.keys(users);

    const rUsers = notes.reduce((acc, note) => {
      const pk = note.user.pubkey;

      const rUser = knownUsers.includes(pk) ?
        convertToUser(users[pk]) :
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
      fetchOldNotifications(until);
    }
  }

  return (
    <div>
      <Wormhole to="branding_holder">
        <Branding small={false} />
      </Wormhole>

      <div id="central_header" class={styles.fullHeader}>
        <div>
          {intl.formatMessage(
            {
              id: 'pages.notifications.title',
              defaultMessage: 'Notifications',
              description: 'Title of the notifications page',
            }
          )}
        </div>
      </div>


      <StickySidebar>
        <NotificationsSidebar notifications={sortedNotifications} />
      </StickySidebar>

      <Show when={account?.activeUser}>
        <Show when={allSet()}>
          {newUserFollowedYou()}
          {userUnfollowedYou()}

          {yourPostWasLiked()}

          {youWereMentioned()}

          {yourPostWasReposted()}
          {yourPostWasRepliedTo()}
          {yourPostWasZapped()}
          {yourPostWasMentioned()}

          {postYouWereMentionedInWasLiked()}
          {postYouWereMentionedInWasZapped()}
          {postYouWereMentionedInWasReposted()}
          {postYouWereMentionedInWasRepliedTo()}

          {postYourPostWasMentionedInWasLiked()}
          {postYourPostWasMentionedInWasZapped()}
          {postYourPostWasMentionedInWasReposted()}
          {postYourPostWasMentionedInWasRepliedTo()}
        </Show>

        <Show when={oldNotifications.notifications.length > 0}>
          <div class={styles.separator}></div>

          <div class={styles.oldNotifications}>
            <For each={oldNotifications.notifications}>
              {notif => (
                <NotificationItem2
                  notification={notif}
                  users={oldNotifications.users}
                  userStats={oldNotifications.userStats}
                  notes={oldNotifications.notes}
                />
              )}
            </For>
            <Paginator loadNextPage={fetchMoreNotifications} />
          </div>
        </Show>

      </Show>
    </div>
  );
}

export default Notifications;
