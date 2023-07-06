import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  useContext
} from "solid-js";
import { MediaEvent, MediaSize, MediaVariant, NostrEOSE, NostrEvent } from "../types/primal";
import { removeSocketListeners, isConnected, refreshSocketListeners, socket } from "../sockets";
import { Kind } from "../constants";

export type MediaContextStore = {
  media: Record<string, MediaVariant[]>,
  actions: {
    getMedia: (url: string , size?: MediaSize, animated?: boolean) => MediaVariant | undefined,
    getMediaUrl: (url: string | undefined, size?: MediaSize, animated?: boolean) => string | undefined,
  },
}

const initialData = {
  media: {},
};

export const MediaContext = createContext<MediaContextStore>();

export const MediaProvider = (props: { children: JSXElement }) => {

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

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, _, content] = message;

    if (type === 'EVENT') {
      if (content.kind === Kind.MediaInfo) {
        const mediaInfo: MediaEvent = JSON.parse(content.content);

        updateStore('media', m => {
          for (let i = 0;i<mediaInfo.resources.length;i++) {
            const resource = mediaInfo.resources[i];
            m[resource.url] = resource.variants;
          }
          return m;
        });
      }
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
    },
  });

  return (
      <MediaContext.Provider value={store}>
        {props.children}
      </MediaContext.Provider>
  );
}

export const useMediaContext = () => useContext(MediaContext);
