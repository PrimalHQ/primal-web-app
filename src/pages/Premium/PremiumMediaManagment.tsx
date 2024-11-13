import { Component, createEffect, For, Match, onMount, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import Search from '../Search';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { useIntl } from '@cookbook/solid-intl';
import { premium as t } from '../../translations';

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, Kind, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';
import { APP_ID } from '../../App';
import { isConnected, socket, subsTo, subTo } from '../../sockets';
import { deletePremiumMedia, getPremiumMediaList, getPremiumMediaStats } from '../../lib/premium';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMediaContext } from '../../contexts/MediaContext';
import { createStore } from 'solid-js/store';
import { emptyPaging, PaginationInfo } from '../../megaFeeds';
import { date, shortDate } from '../../lib/dates';
import ButtonCopy from '../../components/Buttons/ButtonCopy';
import Paginator from '../../components/Paginator/Paginator';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

const total = 10_000_000_000;

export type MediaListItem = {
  url: string,
  size: number,
  mimetype: string,
  created_at: number,
};

export type MediaListStore = {
  mediaList: MediaListItem[],
  rawList: MediaListItem[],
  paging: PaginationInfo,
  showConfirmDelete: string,
}

const PremiumMediaManagment: Component<{
  data: PremiumStore,
}> = (props) => {
  const intl = useIntl()
  const navigate = useNavigate();
  const account = useAccountContext();
  const media = useMediaContext();

  const [store, updateStore] = createStore<MediaListStore>({
    mediaList: [],
    rawList: [],
    paging: { ...emptyPaging() },
    showConfirmDelete: '',
  });

  createEffect(() => {
    if (isConnected() &&  account?.isKeyLookupDone && account.publicKey) {
      getMediaStats(account.publicKey);
      getMediaList(account.publicKey);
    }
  });

  const getMediaStats = (pubkey: string) => {
    const ws = socket();

    if (!ws) return;

    const subId = `premium_media_stats_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();
      }
    });

    getPremiumMediaStats(pubkey, subId, ws);
  }

  const getMediaList = (pubkey: string, until = 0, offset = 0) => {
    const ws = socket();

    if (!ws) return;

    const subId = `premium_media_list_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.MediaList) {
          const mi = JSON.parse(content.content) as MediaListItem[];
          updateStore('rawList', () => [...mi]);
        }

        if (content.kind === Kind.FeedRange) {
          const paging = JSON.parse(content.content) as PaginationInfo;

          updateStore('paging', () => ({ ...paging }));
        }
      },
      onEose: () => {
        unsub();
        const list = store.paging.elements.reduce<MediaListItem[]>((acc, url) => {
          const item = store.rawList.find(i => i.url === url);

          return item ? [ ...acc, {...item}] : acc;
        }, []);

        updateStore('mediaList', (ml) => [...ml, ...list]);
        updateStore('rawList', () => []);
      }
    });

    getPremiumMediaList(pubkey, until, offset,  subId, ws);
  }

  const getMediaListNextPage = () => {
    const pubkey = account?.publicKey;
    if (!pubkey || store.mediaList.length === 0 || store.paging.since === 0) return;

    getMediaList(pubkey, store.paging.since, 1);
  }

  const deleteMedia = (pubkey: string | undefined, url: string) => {
    const ws = socket();

    if (!ws || !pubkey || !url || url.length === 0) return;

    const subId = `premium_delete_media_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();

        // const ms = store.mediaList.filter(i => i.url === url)
      }
    });

    deletePremiumMedia(pubkey, url,  subId, ws);

  }

  // --------------------------------------

  let totalBar: HTMLDivElement | undefined;

  const imageWidth = () => {
    if (!media) return 0;

    const { image } = media?.mediaStats;
    const width = totalBar?.clientWidth || 0;

    return Math.floor(image * width / total);
  }

  const videoWidth = () => {
    if (!media) return 0;

    const { video } = media?.mediaStats;
    const width = totalBar?.clientWidth || 0;

    return Math.floor(video * width / total);
  }

  const otherWidth = () => {
    if (!media) return 0;

    const { other } = media?.mediaStats;
    const width = totalBar?.clientWidth || 0;

    return Math.floor(other * width / total);
  }

  const used = () => {
    if (!media) return '0';

    const { image, video, other } = media?.mediaStats;

    const taken = image + video + other;

    return (taken / 1_000_000_000).toFixed(2);
  }

  const fileSize = (size: number) => {
    if (size > 1_000_000_000) {
      return `${(size / 1_000_000_000).toFixed(2)} GB`;
    }

    if (size > 1_000_000) {
      return `${(size / 1_000_000).toFixed(2)} MB`;
    }

    if (size > 1_000) {
      return `${(size / 1_000).toFixed(2)} KB`;
    }

    return `${(size).toFixed(2)} Bytes`;

  }


  const freeSpace = () => {
    if (!media) return 0;

    return ((total / 1_000_000_000) - parseFloat(used())).toFixed(2);
  }

  const fileType = (mimetype: string) => {
    const [type, ext] = mimetype.split('/');

    return `${ext} ${type}`;
  }

  return (
    <div class={styles.premiumMediaLayout}>

      <div class={styles.mediaSatsHolder}>
        <div class={styles.mediaStorageStats}>
          {used()} GB of {total / 1_000_000_000} GB used
        </div>

        <div class={styles.mediaStatsBar} ref={totalBar}>
          <div class={styles.image} style={`width: ${imageWidth()}px;`}></div>
          <div class={styles.video} style={`width: ${videoWidth()}px;`}></div>
          <div class={styles.other} style={`width: ${otherWidth()}px;`}></div>
          <div class={styles.spaceLeft}>
            {freeSpace()} GB free
          </div>
        </div>

        <div class={styles.mediaStatsLegend} title={`${media?.mediaStats.image.toLocaleString()} Bytes`}>
          <div class={styles.legendItemImages}>
            <div class={styles.dot}></div>
            <div class={styles.label}>Images</div>
          </div>
          <div class={styles.legendItemVideos} title={`${media?.mediaStats.video.toLocaleString()} Bytes`}>
            <div class={styles.dot}></div>
            <div class={styles.label}>Videos</div>
          </div>
          <div class={styles.legendItemOther} title={`${media?.mediaStats.other.toLocaleString()} Bytes`}>
            <div class={styles.dot}></div>
            <div class={styles.label}>Other</div>
          </div>
        </div>
      </div>

      <div class={styles.mediaList}>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Details</th>
              <th>Copy</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            <For each={store.mediaList}>
              {item => (
                <tr>
                  <td class={styles.tdFile}>
                    <Show
                      when={item.mimetype.startsWith('video')}
                      fallback={<img src={item.url} />}
                    >
                      <video src={item.url} />
                    </Show>
                  </td>
                  <td class={styles.tdDetails}>
                    <div class={styles.fileInfo}>
                      <span>
                        {fileSize(item.size)}
                      </span>
                      <span>
                        {fileType(item.mimetype)}
                      </span>
                    </div>
                    <div class={styles.fileDate}>
                      {shortDate(item.created_at)}
                    </div>
                  </td>
                  <td class={styles.tdAction}>
                    <ButtonCopy
                      copyValue={item.url}
                      color="light"
                    />
                  </td>
                  <td class={styles.tdAction}>
                    <button onClick={() => updateStore('showConfirmDelete', () => item.url)}>
                      <div class={styles.deleteIcon}></div>
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Paginator
          isSmall={true}
          loadNextPage={getMediaListNextPage}
        />

        <ConfirmModal
          open={store.showConfirmDelete.length > 0}
          description="Are you sure you want to delete this media file? All notes referencing this media file will look broken."
          onConfirm={() => {
            deleteMedia(account?.publicKey, store.showConfirmDelete);
            updateStore('showConfirmDelete', () => '');
          }}
          onAbort={() => updateStore('showConfirmDelete', () => '')}
        />
      </div>

    </div>
  );
}

export default PremiumMediaManagment;
