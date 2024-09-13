import { Component, createEffect, For, Match, Switch } from 'solid-js';
import styles from './FeedMarketPlace.module.scss';

import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import { subsTo } from '../../sockets';
import { APP_ID } from '../../App';
import { fetchDVMFeeds } from '../../lib/feed';
import { Kind } from '../../constants';
import { createStore } from 'solid-js/store';
import { NostrDVM, PrimalArticleFeed, PrimalDVM, PrimalUser } from '../../types/primal';
import { convertToUser } from '../../stores/profile';
import FeedMarketItem from './FeedMarketPlaceItem';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import FeedMarketPlacePreview from './FeedMarketPlacePreview';
import ButtonPrimary from '../Buttons/ButtonPrimary';

export type MarketplaceStore = {
  dvms: PrimalDVM[],
  dvmStats: Record<string, { likes: number, satszapped: number }>,
  users: Record<string, PrimalUser>,
  previewDvm: PrimalDVM | undefined,

}

const emptyStore: MarketplaceStore = {
  dvms: [],
  dvmStats: {},
  users: {},
  previewDvm: undefined,
}

const FeedMarketPlace: Component<{
  open?: boolean,
  type: 'notes' | 'reads',
  setOpen?: (v: boolean) => void,
  onAddFeed?: (feed: PrimalArticleFeed) => void,
}> = (props) => {

  const [store, updateStore] = createStore<MarketplaceStore>({ ...emptyStore });

  createEffect(() => {
    if (props.open) {
      fetchDVMs();
    }
    else {
      clearDVMs();
    }
  });

  const fetchDVMs = () => {
    const subId = `feed_market_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {

        if (content.kind === Kind.DVM) {
          const dvmData = JSON.parse(content.content);

          const dvm: PrimalDVM = {
            id: content.id,
            name: dvmData.name || '',
            about: dvmData.about || '',
            amount: dvmData.amount || 'free',
            primalVerifiedRequired: dvmData.primalVerifiedRequired || false,
            author: content.pubkey,
            supportedKinds: content.tags?.reduce<string[]>((acc, t: string[]) => t[0] === 'k' ? [...acc, t[1]] : acc, []) || [],
            identifier: (content.tags?.find(t => t[0] === 'd') || ['d', ''])[1],
          };

          updateStore('dvms', store.dvms.length, () => ({ ...dvm }));
          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = convertToUser(content);

          updateStore('users', user.pubkey, () => ({ ...user }));
          return;
        }

        if (content.kind === Kind.NoteStats) {
          const stats = JSON.parse(content.content);

          if (!stats.event_id) return;

          updateStore('dvmStats', stats.event_id, () => ({
            likes: stats.likes || 0,
            satszapped: stats.satszapped || 0,
          }));

        }
      },
      onEose: () => {
        console.log('STORE: ', { ...store });
        unsub();
      }
    });

    fetchDVMFeeds(props.type, subId);
  }

  const clearDVMs = () => {
    // delay for close animation
    setTimeout(() => {
      updateStore(() => ({
        dvms: [],
        dvmStats: {},
        users: {},
        previewDvm: undefined,
      }));

    }, 300);
  }


  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={props.setOpen}
      title={
        <div class={styles.feedMarketplaceTitle}>
          Feed Marketplace
        </div>
      }
      triggerClass={'hidden'}
    >
      <Switch>
        <Match when={!store.previewDvm}>
          <div class={styles.feedMarketplaceContent}>
            <div class={styles.booths}>
              <For each={store.dvms}>
                {dvm => (
                  <FeedMarketItem
                    dvm={dvm}
                    stats={store.dvmStats[dvm.id]}
                    onClick={(d) => {
                      updateStore('previewDvm', () => ({ ...d }))
                    }}
                  />
                )}
              </For>
            </div>

            <div class={styles.feedMarketplaceFooter}>
              <div class={styles.instruction}>
                Select a feed to preview it
              </div>

              <ButtonSecondary
                light={true}
                onClick={() => props.setOpen && props.setOpen(false)}
              >
                Cancel
              </ButtonSecondary>
            </div>
          </div>
        </Match>
        <Match when={store.previewDvm}>
          <div class={styles.feedMarketplaceContent}>
            <FeedMarketPlacePreview
              dvm={store.previewDvm}
              stats={store.dvmStats[store.previewDvm?.id || '']}
              type={props.type}
            />
          </div>

          <div class={styles.feedMarketplacePreviewFooter}>
            <ButtonSecondary
              light={true}
              onClick={() => updateStore('previewDvm', () => undefined)}
            >
              Back
            </ButtonSecondary>
            <ButtonPrimary
              onClick={() => {
                const dvm = store.previewDvm;
                if (!props.onAddFeed || !dvm) return;

                const spec = JSON.stringify({
                  dvm_id: dvm.id,
                  dvm_pubkey: dvm.author,
                  kind: props.type,
                });

                const feed: PrimalArticleFeed = {
                  name: dvm.name,
                  description: dvm.about,
                  spec,
                  enabled: true,
                  feedkind: 'dvm',
                }

                props.onAddFeed(feed)
              }}
            >
              Add feed
            </ButtonPrimary>
          </div>
        </Match>
      </Switch>
    </AdvancedSearchDialog>
  )
}

export default FeedMarketPlace;
