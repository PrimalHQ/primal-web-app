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

import missingVideo from '../../assets/icons/missing_video.svg';
import missingImage from '../../assets/icons/missing_image.svg';

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
  videoWidth: number,
  imageWidth: number,
  otherWidth: number,
  zoomed: boolean,
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
    videoWidth: 0,
    imageWidth: 0,
    otherWidth: 0,
    zoomed: false,
  });


  createEffect(() => {
    if (isConnected() &&  account?.isKeyLookupDone && account.publicKey) {
      getMediaStats(account.publicKey);
      getMediaList(account.publicKey);
    }
  });

  const total = () => {
    if (props.data.membershipStatus.tier === 'premium-legend') {
      return 100_000_000_000;
    }

    if (props.data.membershipStatus.tier === 'premium') {
      return 10_000_000_000;
    }

    return 0;
  }

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
        updateStore('mediaList', (ms) => ms.filter(i => i.url !== url))
      }
    });

    deletePremiumMedia(pubkey, url,  subId, ws);

  }

  // --------------------------------------

  let totalBar: HTMLDivElement | undefined;

  const updateProgressBar = (w: number, t: number) => {
    if (!media) return;

    if (t === 0) return;

    const image = media?.mediaStats.image;
    const video = media?.mediaStats.video;
    const other = media?.mediaStats.other;

    updateStore('imageWidth', () => Math.floor(image * w / t));
    updateStore('videoWidth', () => Math.floor(video * w / t));
    updateStore('otherWidth', () => Math.floor(other * w / t));
  }

  createEffect(() => {
    if (!media || !totalBar) return;
    const w = totalBar.clientWidth;
    const t = total();

    updateProgressBar(w, t);
  });

  const used = () => {
    if (!media) return 0;

    const { image, video, other } = media?.mediaStats;

    const taken = image + video + other;

    return taken;
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
    if (!media) return '0';

    const diff = (total() / 1_000_000_000) - (used() / 1_000_000_000);

    return diff > 0 ? diff.toFixed(2) : '0';
  }

  const fileType = (mimetype: string) => {
    const [type, ext] = mimetype.split('/');

    return `${ext} ${type}`;
  }

  const getMediaUrl = (url:string) => {
    let murl = media?.actions.getMediaUrl(url, 's');

    if (!murl) {
      murl = media?.actions.getMediaUrl(url, 'o');
    }

    if (!murl) return url;

    return murl;
  };

  const onImgError = (event: any) => {

    const image = event.target;

    image.onerror = "";
    image.src = missingImage;

    return true;
  }

  const onVideoThumbnailError = (event: any) => {

    const image = event.target;

    image.onerror = "";
    image.src = missingVideo;

    return true;
  }

  const onZoomIn = () => {
    if (!totalBar) return;

    const t = used();
    const w = Math.ceil(totalBar.clientWidth * 0.8);

    updateStore('zoomed', () => true);

    updateProgressBar(w, t);
  }

  const onZoomOut = () => {
    if (!totalBar) return;

    const t = total();
    const w = totalBar.clientWidth;

    updateStore('zoomed', () => false);

    updateProgressBar(w, t);
  }

  return (
    <div class={styles.premiumMediaLayout}>

      <div class={styles.mediaSatsHolder}>
        <div class={styles.mediaStorageStats}>
          {(used() / 1_000_000_000).toFixed(2)} GB of {total() / 1_000_000_000} GB used
        </div>

        <div class={styles.mediaStatsBar} ref={totalBar} onMouseOver={onZoomIn} onMouseOut={onZoomOut}>
          <div class={styles.image} style={`width: ${store.imageWidth}px;`}></div>
          <div class={styles.video} style={`width: ${store.videoWidth}px`}></div>
          <div class={styles.other} style={`width: ${store.otherWidth}px;`}></div>
          <div class={styles.spaceLeft}>
            <Show
              when={!store.zoomed}
              fallback={<>{(used() / 1_000_000_000).toFixed(2)} GB used</>}
            >
              {freeSpace()} GB free
            </Show>
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
                      fallback={
                        <img src={getMediaUrl(item.url)} onerror={onImgError} />
                      }
                    >
                      <Show
                        when={media?.thumbnails[item.url]}
                        fallback={<img src={missingVideo} />}
                      >
                        <img src={media?.thumbnails[item.url]} onerror={onVideoThumbnailError} />
                      </Show>
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
