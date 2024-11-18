import { Component, createEffect, For, Match, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import Search from '../Search';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { useIntl } from '@cookbook/solid-intl';

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, Kind, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';
import { isConnected, socket, subsTo } from '../../sockets';
import { getContactListHistory, getContentBroadcastStaus, getContentDownloadData, getContentListHistory } from '../../lib/premium';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { createStore } from 'solid-js/store';
import { emptyPaging, PaginationInfo } from '../../megaFeeds';
import { longDate } from '../../lib/dates';
import Paginator from '../../components/Paginator/Paginator';
import { NostrContactsContent } from '../../types/primal';
import { sendContacts } from '../../lib/notes';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import pako from 'pako';
import { useToastContext } from '../../components/Toaster/Toaster';

export type ContentItem = {
  cnt: number,
  kind: number,
};

export type ContentStore = {
  stats: ContentItem[],
  isDownloading: number | undefined,
  isBroadcasting: boolean,
};

export const kindNames = {
  0: 'Profile Metadata',
  1: 'Notes',
  3: 'Contacts',
  4: 'Encrypted Direct Messages',
  5: 'Event Deletions',
  6: 'Reposts',
  7: 'Reactions',
  40: 'Channel Creations',
  41: 'Channel Metadata',
  42: 'Channel Messages',
  43: 'Channel Hide Messages',
  44: 'Channel Mute Users',
  7_000: 'Job Feedback',
  7_001: 'Subscribtions',
  7_002: 'Unsubscribes',
  9_802: 'Highlights',
  9_735: 'Zaps',

  10_000: 'Mute Lists',
  10_002: 'Relay Lists',
  10_003: 'Bookmarks',
  10_063: 'User server list',
  17_000: 'Tier Lists',

  30_000: 'Categorized People',
  30_023: 'Reads',
  30_078: 'Settings',
  31_990: 'DVMs',
  37_001: 'Tier',
};


const PremiumContentBackup: Component<{
  data: PremiumStore,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();
  const account = useAccountContext();
  const toast = useToastContext();

  const [store, updateStore] = createStore<ContentStore>({
    stats: [],
    isDownloading: undefined,
    isBroadcasting: false,
  });

  createEffect(() => {
    if (isConnected() &&  account?.isKeyLookupDone && account.publicKey) {
      getContentList(account.publicKey)
    }
  });

  const getContentList = (pubkey: string, until = 0, offset = 0) => {
    const ws = socket();

    if (!ws) return;

    const subId = `premium_content_list_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.ContentStats) {
          const stats = JSON.parse(content.content)

          updateStore('stats', () => [ ...stats ]);
        }
      },
      onEose: () => {
        unsub();
      }
    })

    getContentListHistory(pubkey, subId, ws);
  }

  const getKindName = (kind: number) => {
    if (kind >= 5_000 && kind < 6_000) {
      return 'Job Request';
    }
    if (kind >= 6_000 && kind < 7_000) {
      return 'Job Result';
    }

    // @ts-ignore
    return kindNames[kind] || kind;
  };

  const totalCount = () => {
    return store.stats.reduce<number>((acc, i) => acc + i.cnt, 0);
  }

  const onDownload = (kind: number) => {
    const ws = socket();
    const pubkey = account?.publicKey;

    if (!ws || !pubkey) return;

    updateStore('isDownloading', () => kind);

    const subId = `premium_content_backup_${APP_ID}`;

    let data = '';

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        data += `${JSON.stringify(content)}\n`;
      },
      onEose: () => {
        unsub();

        if (data.length === 0) {
          toast?.sendWarning('Failed to fetch events. Please try again.');
          updateStore('isDownloading', () => undefined);
          return;
        }

        const kindName = kind >= 0 ? `${kind}` : 'all';
        const userId = account.activeUser?.nip05 || account.publicKey;
        const date = (new Date()).toISOString().split('T')[0];

        var a = window.document.createElement('a');
        const content = pako.gzip(data);
        a.href = window.URL.createObjectURL(new Blob([content], {type: 'application/x-gzip-compressed'}));
        a.download = `nostr-content-${kindName}-${userId}-${date}.txt.gzip`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);

        updateStore('isDownloading', () => undefined);
      }
    })

    const kinds = kind > -1 ? [kind] : [];

    getContentDownloadData(pubkey, kinds, subId, ws);
  }

  const onBroadcast = (kind: number) => {
    const ws = socket();
    const pubkey = account?.publicKey;

    if (!ws || !pubkey) return;

    updateStore('isBroadcasting', () => true);

    const subId = `premium_content_broadcast_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
      },
      onEose: () => {
        unsub();

        // startListeningForBroadcastStatus()
        updateStore('isBroadcasting', () => false);
      }
    })

    const kinds = kind > -1 ? [kind] : [];

    getContentDownloadData(pubkey, kinds, subId, ws);
  }

  const startListeningForBroadcastStatus = () => {
    // const ws = socket();
    // const pubkey = account?.publicKey;

    // if (!ws || !pubkey) return;

    // const subId = `premium_broadcast_status_${APP_ID}`;

    // let prog = 0;

    // const unsub = subsTo(subId, {
    //   onEvent: (_, content) => {
    //     if (content.kind === 10_000_167) {
    //       const stats = JSON.parse(content.content)
    //       prog = stats.progress || 0;
    //     }
    //   },
    //   onEose: () => {
    //     unsub();

    //     if (prog === 1) return;

    //     setTimeout(() => {
    //       startListeningForBroadcastStatus();
    //     }, 4_000);

    //     // updateStore('isBroadcasting', () => false);
    //   }
    // })

    // getContentBroadcastStaus(pubkey, subId, ws);
  };

  const filteredStats = () => {
    const allowed = [1, 4, 7, 30_023]
    return store.stats.filter(s => allowed.includes(s.kind));
  }

  return (
    <div class={styles.mediaList}>
      <table>
        <thead>
          <tr>
            <th>Count</th>
            <th>Kind</th>
            <th>Rebroadcast</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          <For each={filteredStats()}>
            {item => (
              <tr>
                <td>{item.cnt.toLocaleString()}</td>
                <td>{getKindName(item.kind)}</td>
                <td class={styles.tdAction}>
                  <Show
                    when={!store.isBroadcasting}
                    fallback={<div class="linkish">Broadcasting...</div>}
                  >
                    <ButtonLink
                      onClick={() => onBroadcast(item.kind)}
                    >
                      <div class={styles.broadcastIcon}></div>
                    </ButtonLink>
                  </Show>
                </td>
                <td class={styles.tdAction}>
                  <Show
                    when={store.isDownloading !== item.kind}
                    fallback={<div class="linkish">Downloading...</div>}
                  >
                    <ButtonLink
                      onClick={() => onDownload(item.kind)}
                    >
                      <div class={styles.downloadIcon}></div>
                    </ButtonLink>
                  </Show>
                </td>
              </tr>
            )}
          </For>
          <tr>
            <td>{totalCount().toLocaleString()}</td>
            <td>All Events</td>
            <td class={styles.tdAction}>
              <Show
                when={!store.isBroadcasting}
                fallback={<div class="linkish">Broadcasting...</div>}
              >
                <ButtonLink
                  onClick={() => onBroadcast(-1)}
                >
                  <div class={styles.broadcastIcon}></div>
                </ButtonLink>
              </Show>
            </td>
            <td class={styles.tdAction}>
              <Show
                when={store.isDownloading !== -1}
                fallback={<div class="linkish">Downloading...</div>}
              >
                <ButtonLink
                  onClick={() => onDownload(-1)}
                >
                  <div class={styles.downloadIcon}></div>
                </ButtonLink>
              </Show>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PremiumContentBackup;
