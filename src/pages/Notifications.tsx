import { noteEncode } from 'nostr-tools/nip19';
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../App';
import MissingPage from '../components/MissingPage/MissingPage';
import NotificationItem from '../components/Notifications/NotificationItem';
import NotificationsSidebar from '../components/NotificatiosSidebar/NotificationsSidebar';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { Kind, NotificationType, notificationTypeUserProps } from '../constants';
import { useAccountContext } from '../contexts/AccountContext';
import { getEvents } from '../lib/feed';
import { saveFollowing } from '../lib/localStore';
import { sendContacts } from '../lib/notes';
import { getLastSeen, getNotifications } from '../lib/notifications';
import { subscribeTo } from '../sockets';
import { convertToNotes } from '../stores/note';
import { convertToUser, emptyUser, truncateNpub } from '../stores/profile';
import { FeedPage, NostrNoteContent, NostrStatsContent, NostrUserContent, NostrUserStatsContent, PrimalNote, PrimalNotification, PrimalNotifUser, PrimalUser, SortedNotifications } from '../types/primal';



const Notifications: Component = () => {

  const account = useAccountContext();

  const [notifSince, setNotifSince] = createSignal<number>(0);

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

  const [relatedNotes, setRelatedNotes] = createStore<NotificationStore>({
    notes: [],
    users: [],
    page: { messages: [], users: {}, postStats: {} },
    reposts: {},
  })



  createEffect(() => {
    if (account?.hasPublicKey()) {
      const subid = `notif_ls_${APP_ID}`

      const unsub = subscribeTo(subid, async (type, _, content) => {
        if (type === 'EVENT') {

          console.log('SEEN: ', content);


          unsub();
          return;
        }

      });

      getLastSeen(account.publicKey, subid);
    }
  });

  createEffect(() => {
    if (notifSince() >= 0 && account?.hasPublicKey()) {
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
      getNotifications(account?.publicKey, subid, notifSince());
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

  return (
    <div>
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
      </Show>
    </div>
  );
}

export default Notifications;
