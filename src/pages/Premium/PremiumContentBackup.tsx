import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';

import styles from './Premium.module.scss';
import { useIntl } from '@cookbook/solid-intl';

import { Kind } from '../../constants';
import { useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { PremiumStore } from './Premium';
import { isConnected, socket, subsTo, subTo } from '../../sockets';
import { startListeningForContentBroadcastStaus, getContentDownloadData, getContentListHistory, startContentBroadcast, stopListeningForContentBroadcastStaus, cancelContentBroadcast } from '../../lib/premium';
import { APP_ID } from '../../App';
import { useAccountContext } from '../../contexts/AccountContext';
import { createStore } from 'solid-js/store';
import pako from 'pako';
import { useToastContext } from '../../components/Toaster/Toaster';
import { Progress } from '@kobalte/core/progress';
import ButtonGhost from '../../components/Buttons/ButtonGhost';

export type ContentItem = {
  cnt: number,
  kind: number,
};
export type BroadcastStatus = {
  running: boolean,
  status: string,
  progress: number,
  kinds: number[] | null,
};

export type ContentStore = {
  stats: ContentItem[],
  isDownloading: number | undefined,
  isBroadcasting: number | undefined,
  broadcastStatus: BroadcastStatus,
  statusSubId: string,
};

export const kindNames: Record<number, string> = {
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

export const emptyBroadcastStatus = () => ({
  running: false,
  status: '',
  progress: 0,
  kinds: null,
})


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
    isBroadcasting: undefined,
    broadcastStatus: { ...emptyBroadcastStatus() },
    statusSubId: '',
  });

  let unsubStatus = () => {};

  onMount(() => {
    startListeningForBroadcastStatus();
  });

  onCleanup(() => {
    const ws = socket();
    const pubkey = account?.publicKey;
    const subId = store.statusSubId;

    if (!ws || !pubkey) return;

    stopListeningForContentBroadcastStaus(pubkey, subId, ws);
    unsubStatus();
  });

  createEffect(() => {
    if (isConnected() &&  account?.isKeyLookupDone && account.publicKey) {
      getContentList(account.publicKey)
    }
  });

  createEffect(() => {
    const status = store.broadcastStatus;

    if (status.running) {
      const kind = status.kinds === null || status.kinds.length === 0 ?
        -1 : status.kinds[0];

      updateStore('isBroadcasting', () => kind);
    } else {
      updateStore('isBroadcasting', () => undefined);
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
        a.download = `nostr-content-${kindName}-${userId}-${date}.txt.gz`;

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

    updateStore('isBroadcasting', () => kind);
    updateStore('broadcastStatus', (bs) => ({ ...bs, kinds: [kind] }));

    const subId = `premium_content_broadcast_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
      },
      onEose: () => {
        unsub();
      }
    })

    const kinds = kind > -1 ? [kind] : [];

    startContentBroadcast(pubkey, kinds, subId, ws);
  }

  const startListeningForBroadcastStatus = () => {
    const ws = socket();
    const pubkey = account?.publicKey;

    if (!ws || !pubkey) return;

    const subId = `premium_broadcast_status_${APP_ID}`;

    updateStore('statusSubId', () => subId);

    unsubStatus = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.BroadcastStatus) {
          let stats = JSON.parse(content.content) as BroadcastStatus;
          const running = stats.running || false;

          if (!running) {
            if (stats.status = 'finished fine') {
              updateStore('broadcastStatus', (bs) => ({ ...bs, progress: 1.0 }));
            }
          }

          updateStore('broadcastStatus', () => ({ ...stats }));
        }
      },
      onEose: () => {
        // unsub();

        // if (prog === 1) return;

        // setTimeout(() => {
          // startListeningForBroadcastStatus();
        // }, 4_000);

        // updateStore('isBroadcasting', () => false);
      }
    })

    startListeningForContentBroadcastStaus(pubkey, subId, ws);
  };

  const cancelBroadcast = () => {
    const ws = socket();
    const pubkey = account?.publicKey;

    if (!ws || !pubkey) return;

    const subId = `premium_broadcast_cancel_${APP_ID}`;

    cancelContentBroadcast(pubkey, subId, ws);

    // stopListeningForContentBroadcastStaus(pubkey, subId, ws);
    updateStore('broadcastStatus', () => ({ ...emptyBroadcastStatus() }));
    updateStore('isBroadcasting', () => undefined);
  }

  const filteredStats = () => {
    const allowed = [1, 4, 7, 30_023]
    return store.stats.filter(s => allowed.includes(s.kind));
  }

  const activeProgress = () => {
    if (!store.broadcastStatus.running) return 0;

    return Math.round(store.broadcastStatus.progress * 100);
  }

  const rebroadstingLabel = () => {
    const status = store.broadcastStatus;
    const kinds = status.kinds;

    let label = 'Rebroadcasting';

    if (kinds === null || kinds.length === 0) {
      label += ' all events'
    } else {
      const kind = kinds[0];

      label += ` ${kindNames[kind]}`;
    }

    return `${label}: ${activeProgress()}%`;
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
                    when={store.isBroadcasting !== item.kind}
                    fallback={<div class="linkish">broadcasting...</div>}
                  >
                    <ButtonLink
                      onClick={() => onBroadcast(item.kind)}
                      disabled={store.isBroadcasting !== undefined}
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
              <ButtonLink
                onClick={() => onBroadcast(-1)}
                disabled={store.isBroadcasting}
              >
                <div class={styles.broadcastIcon}></div>
              </ButtonLink>
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

      <Show when={store.isBroadcasting}>
        <Progress value={activeProgress()} class={styles.broadcastProgress}>
          <div class={styles.progressLabelContainer}>
            <Progress.Label class={styles.progressLabel}>
              {rebroadstingLabel()}
            </Progress.Label>
          </div>
          <div class={styles.progressTrackContainer}>
            <Progress.Track class={styles.progressTrack}>
              <Progress.Fill
                class={styles.progressFill}
              />
            </Progress.Track>

            <ButtonGhost
              onClick={() => {
                cancelBroadcast();
              }}
              disabled={activeProgress() > 100}
            >
              <Show
                when={(activeProgress() < 100)}
                fallback={<div class={styles.iconCheck}></div>}
              >
                <div class={styles.iconClose}></div>
              </Show>
            </ButtonGhost>
          </div>
        </Progress>
      </Show>
    </div>
  );
}

export default PremiumContentBackup;
