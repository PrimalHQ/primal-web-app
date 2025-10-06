import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import { MediaEvent, MediaSize, MediaVariant, NostrEOSE, NostrEvent, NostrEventContent, NostrEvents } from "../types/primal";
import { removeSocketListeners, isConnected, refreshSocketListeners, socket, decompressBlob, readData } from "../sockets";
import { Kind } from "../constants";
import { StreamingData } from "../lib/streaming";

export type MediaStats = {
  video: number,
  image: number,
  other: number,
}

export type MediaContextStore = {
  windowSize: { w: number, h: number },
  media: Record<string, MediaVariant[]>,
  thumbnails: Record<string, string>,
  mediaStats: MediaStats,
  liveEvents: StreamingData[],
  videoAutoplay: string[],
  actions: {
    getMedia: (url: string , size?: MediaSize, animated?: boolean) => MediaVariant | undefined,
    getMediaUrl: (url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined,
    addVideo: (video: HTMLVideoElement | undefined) => void,
    getThumbnail: (url: string | undefined) => string | undefined,
    getStream: (pubkey: string, onlyLive?: boolean) => StreamingData,
    isStreaming: (pubkey: string) => boolean,
    removeAutoplayVideo: (videoId: string) => void,
  },
}

const initialData = {
  media: {},
  mediaStats: {
    video: 0,
    image: 0,
    other: 0,
  },
  thumbnails: {},
  windowSize: { w: window.innerWidth, h: window.innerHeight },
  liveEvents: [],
  videoAutoplay: [],
};

export const MediaContext = createContext<MediaContextStore>();

export const MediaProvider = (props: { children: JSXElement }) => {

  // const observer = new IntersectionObserver(entries => {
  //   entries.forEach((entry) => {
  //     console.log('VIDEO: ', entry.target)
  //     // if (entry.target.tagName !== 'VIDEO') return;

  //     const video = entry.target as HTMLVideoElement;
  //     updateStore('videoAutoplay', store.videoAutoplay.length, () => video.getAttribute('data-uuid') || '');


  //     if (entry.isIntersecting && video.paused) {
  //       video.play()
  //       // .finally(() => {
  //       //   removeAutoplayVideo(video.getAttribute('data-uuid') || '');
  //       // });
  //     }
  //     else {
  //       // removeAutoplayVideo(video.getAttribute('data-uuid') || '');
  //       video.pause();
  //     }
  //   });
  // });

  const getMedia = (url: string, size?: MediaSize , animated?: boolean) => {
    const variants: MediaVariant[] = store.media[url] || [];

    const isOfSize = (s: MediaSize) => size ? size === s : true;
    const isAnimated = (a: 0 | 1) => animated !== undefined ? animated === !!a : true;

    return variants.find(v => isOfSize(v.s) && isAnimated(v.a));
  };

  const getMediaUrl = (url: string | undefined, size?: MediaSize, animated?: boolean) => {
    if (!url) {
      return;
    }

    const media = getMedia(url, size, animated);

    return media?.media_url;
  }

  const onResize = () => {
    updateStore('windowSize', () => ({ w: window.innerWidth, h: window.innerHeight }));
  };

  let isFullscreen = false;

  const onFullscreenChange = (e: Event) => {
    if (isFullscreen) {
      // @ts-ignore
      e.target.scrollIntoView();
    }

    isFullscreen = !isFullscreen;
  };

  const addVideo = (video: HTMLVideoElement | undefined) => {
    if (!video) return;

    // observer.observe(video);
  };

  const getThumbnail = (url: string | undefined) => {
    if (!url) return;

    return store.thumbnails[url];
  }

  const getStream = (pubkey: string, onlyLive?: boolean) => {
    let ret = store.liveEvents.find((s: StreamingData) => s.hosts?.[0] === pubkey && (onlyLive ? s.status === 'live' : true));

    if (!ret) return store.liveEvents.find((s: StreamingData) => s.pubkey === pubkey && (onlyLive ? s.status === 'live' : true));

    return ret;
  }

  const isStreaming = (pubkey: string) => {
    const levts = store.liveEvents.filter((s: StreamingData) => s.status === 'live' && s.hosts?.find(h => h === pubkey) !== undefined);
    return levts.length > 0;
  }

  const removeAutoplayVideo = (videoId: string) => {
    updateStore('videoAutoplay', (ids) => ids.filter(id => id !== videoId))
  }

// SOCKET HANDLERS ------------------------------

  const handleMediaEvent = (content: NostrEventContent) => {

    if (content.kind === Kind.MediaInfo) {
      const mediaInfo: MediaEvent = JSON.parse(content.content);

      let media: Record<string, MediaVariant[]> = {};

      for (let i = 0;i<mediaInfo.resources.length;i++) {
        const resource = mediaInfo.resources[i];
        media[resource.url] = resource.variants;
      }

      try {
        updateStore('media', () => ({ ...media }));
        if (mediaInfo.thumbnails) {
          updateStore('thumbnails', (thumbs) => ({ ...thumbs, ...mediaInfo.thumbnails }));
        }
      } catch(e) {
        console.warn('Error updating media: ', e);
      }
    }

    if (content.kind === Kind.MediaStats) {
      const stats = JSON.parse(content.content) as MediaStats;

      updateStore('mediaStats', () => ({ ...stats }));
    }

    if (content.kind === Kind.LiveEvent) {
      const streamData = {
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
        event: { ...content },
        hosts: (content.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
        participants: (content.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
      };

      const index = store.liveEvents.findIndex(e => e.id === streamData.id && e.pubkey === streamData.pubkey);

      if (index < 0) {
        updateStore('liveEvents', store.liveEvents.length, () => ({ ...streamData }));
        return;
      }

      updateStore('liveEvents', index, () => ({ ...streamData }));
      return;
    }
  }

  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, _, content] = message;

    if (type === 'EVENTS') {
      for (let i=0;i<content.length;i++) {
        const e = content[i];
        handleMediaEvent(e);
      }

    }

    if (type === 'EVENT') {
      handleMediaEvent(content)
    }
  };

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

// EFFECTS --------------------------------------

  onMount(() => {
    window.addEventListener('resize', onResize);
    window.addEventListener('fullscreenchange', onFullscreenChange);
  });

  onCleanup(() => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('fullscreenchange', onFullscreenChange);
  });


  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });


// STORES ---------------------------------------

  const [store, updateStore] = createStore<MediaContextStore>({
    ...initialData,
    actions: {
      getMedia,
      getMediaUrl,
      addVideo,
      getThumbnail,
      getStream,
      isStreaming,
      removeAutoplayVideo,
    },
  });

  return (
      <MediaContext.Provider value={store}>
        {props.children}
      </MediaContext.Provider>
  );
}

export const useMediaContext = () => useContext(MediaContext);
