import { Component, createEffect, For } from 'solid-js';

import styles from './Premium.module.scss';

import { Kind } from '../../constants';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { PremiumStore } from './Premium';
import { isConnected, socket, subsTo } from '../../sockets';
import { getContactListHistory } from '../../lib/premium';
import { APP_ID } from '../../App';
import { createStore } from 'solid-js/store';
import { emptyPaging, PaginationInfo } from '../../megaFeeds';
import { longDate, shortDate } from '../../lib/dates';
import { NostrContactsContent } from '../../types/primal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { accountStore, replaceContactList } from '../../stores/accountStore';

export type ContactHistoryItem = {
  created_at: number,
  follows_count: number,
  id: string,
  event: NostrContactsContent,
}

export type ContactsStore = {
  history: ContactHistoryItem[],
  rawHistory: ContactHistoryItem[],
  paging: PaginationInfo,
  showConfirmRecover: ContactHistoryItem | undefined,
};

const PremiumContactBackup: Component<{
  data: PremiumStore,
}> = (props) => {
  const [store, updateStore] = createStore<ContactsStore>({
    history: [],
    rawHistory: [],
    paging: { ...emptyPaging() },
    showConfirmRecover: undefined,
  });

  createEffect(() => {
    if (isConnected() &&  accountStore.isKeyLookupDone && accountStore.publicKey) {
      getContactHistory(accountStore.publicKey)
    }
  });

  const getContactHistory = (pubkey: string, until = 0, offset = 0) => {
    const ws = socket();

    if (!ws) return;

    const subId = `premium_contact_history_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.Contacts) {
          const item: ContactHistoryItem = {
            id: content.id,
            created_at: content.created_at || 0,
            follows_count: content.tags.reduce((acc, t) => {
              if (t[0] !== 'p') return acc;

              return acc + 1;
            }, 0),
            event: content,
          };

          updateStore('rawHistory', store.rawHistory.length, () => ({ ...item }));
        }
        if (content.kind === Kind.FeedRange) {
          const paging = JSON.parse(content.content) as PaginationInfo;

          updateStore('paging', () => ({ ...paging }));
        }
      },
      onEose: () => {
        unsub();
        const list = store.paging.elements.reduce<ContactHistoryItem[]>((acc, id) => {
          const item = store.rawHistory.find(i => i.id === id);

          return item ? [ ...acc, {...item}] : acc;
        }, []);

        updateStore('history', (ml) => [...ml, ...list]);
        updateStore('rawHistory', () => []);
      }
    })

    getContactListHistory(pubkey, until, offset, subId, ws);
  }

  const onRecover = (item: ContactHistoryItem | undefined) => {
    if (item) {
      const date = Math.floor((new Date()).getTime() / 1000);

      replaceContactList(date, JSON.parse(JSON.stringify(item.event.tags)), item.event.content);
    }
  }

  return (
    <div class={styles.mediaList}>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Follows</th>
            <th>Recover list</th>
          </tr>
        </thead>
        <tbody>
          <For each={store.history}>
            {item => (
              <tr>
                <td>{longDate(item.created_at)}</td>
                <td>{item.follows_count}</td>
                <td>
                  <ButtonLink
                    onClick={() => updateStore('showConfirmRecover', () => item)}
                  >
                    Recover
                  </ButtonLink>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <ConfirmModal
        open={store.showConfirmRecover !== undefined}
        onConfirm={() => {
          onRecover(store.showConfirmRecover);
          updateStore('showConfirmRecover', () => undefined);
        }}
        description={`Are you sure? This will update your follow list with the version from ${shortDate(store.showConfirmRecover?.created_at)}, containing ${store.showConfirmRecover?.follows_count} contacts.`}
        onAbort={() => updateStore('showConfirmRecover', () => undefined)}
      />
    </div>
  );
}

export default PremiumContactBackup;
