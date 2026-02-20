import { Component, createEffect, createSignal, Match, on, onMount, Show, Switch } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import Hls from 'hls.js';

import styles from './LiveVideo.module.scss';
import { StreamingData } from '../../lib/streaming';
import { PrimalUser } from '../../types/primal';
import { useAppContext } from '../../contexts/AppContext';
import { logInfo } from '../../lib/logger';

const LiveVideo: Component<{
  src: string,
  stream: StreamingData,
  streamAuthor: PrimalUser | undefined,
  onRemove: () => void,
}> = (props) => {
  const app = useAppContext();

  let videoElement: HTMLVideoElement | undefined;

  createEffect(() => {
    if (videoElement?.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = props.src;
    } else if (Hls.isSupported() && videoElement) {
      var hls = new Hls();
      hls.loadSource(props.src);
      hls.attachMedia(videoElement);
    }
  });

  let mediaController: HTMLElement | undefined;
  let hlsVideo: HTMLMediaElement | undefined;
  let streamContextMenu: HTMLButtonElement | undefined;

  const [isLive, setIsLive] = createSignal(false);


  const triggerContextMenu = () => {
    if (!props.streamAuthor) return;

    app?.actions.openStreamContextMenu(
      props.stream,
      props.streamAuthor,
      streamContextMenu?.getBoundingClientRect(),
      () => {
        props.onRemove && props.onRemove();
      },
    );
  }

  const [isMediaLoaded, setIsMediaLoaded] = createSignal(false);

  const recording = () => {
    return (props.stream.event?.tags || []).find(t => t[0] === 'recording')?.[1];
  }

  const streamUrl = () => {
    if (props.stream.status === 'live') return props.src || props.stream.url;

    const ret = recording();

    return ret;
  }

  const isHls = () => {
    return streamUrl()?.endsWith(".m3u8");
  }

  const [showReplay, setShowReplay] = createSignal(false);

  return (
    <div class={styles.liveVideo} >
      <Switch
        fallback={<div class={styles.videoPlaceholder}></div>}
      >
        <Match when={!showReplay() && props.stream.status && props.stream.status !== 'live'}>
          <div class={styles.videoEndedPlaceholder}>
            <div>Stream Ended</div>
            <Show when={recording()}>
              <button onClick={() => setShowReplay(true)}>Replay</button>
            </Show>
          </div>
        </Match>
        <Match when={streamUrl()}>
          <Show when={!isMediaLoaded()}>
            <div class={styles.videoPlaceholder}></div>
          </Show>
          <media-controller
            autohide="2"
            autohideovercontrols
            ref={mediaController}
            style={!isMediaLoaded() ? 'display: none;' : ''}
          >
            <Show when={isHls()}
              fallback={
                <videojs-video
                  src={streamUrl()}
                  slot="media"
                  crossorigin
                  autoplay
                  onloadeddata={() => {
                    setIsMediaLoaded(true);
                  }}
                ></videojs-video>
              }
            >
              <hls-video
                src={streamUrl()}
                slot="media"
                crossorigin
                autoplay
                ref={hlsVideo}
                class={styles.hlsVideoPlayer}
                onloadedmetadata={() => {
                  setIsMediaLoaded(true);
                }}
                onloadstart={() => {
                  const hls = hlsVideo?.api as Hls;

                  if (hls) {

                    hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {

                      const seekable = mediaController?.media.seekable;

                      if (!seekable || seekable.length === 0) return;

                      const seekableEnd = seekable.end(seekable.length - 1);
                      const currentTime = mediaController?.media.currentTime || seekableEnd;

                      const liveEdgeMargin = 14; // seconds
                      const live = (currentTime >= (seekableEnd - liveEdgeMargin));

                      setIsLive(() => live);
                    });

                    hlsVideo?.addEventListener('pause', () => {
                      hls.stopLoad();
                    })
                    hlsVideo?.addEventListener('play', () => {
                      hls.startLoad();
                    })
                  }
                }}
                onloadeddata={() => {
                  logInfo('HLS data loaded')
                }}
              ></hls-video>
            </Show>
            <media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
            <media-control-bar class={styles.controllBar}>
              <div>
                <Show
                  when={isLive()}
                  fallback={
                    <media-time-range  class={styles.timeRange}></media-time-range>
                  }
                >
                  <input
                    type="range"
                    class={styles.liveRange}
                    min="0"
                    max="1"
                    step="any"
                    value="1"
                    onChange={(e) => {
                      const seekable = mediaController?.media.seekable;

                      mediaController.media.mediaSeekableStart

                      if (!hlsVideo || !seekable || seekable.length === 0) return;

                      const seekableStart = seekable.start(seekable.length - 1);
                      const seekableEnd = seekable.end(seekable.length - 1);
                      const ratio = parseFloat(e.target.value) || 1.0;

                      const time = (seekableEnd - seekableStart) * ratio + seekableStart;

                      hlsVideo.currentTime = time;
                    }}
                  ></input>
                </Show>
              </div>
              <div class={styles.videoButtons}>
                <div class={styles.buttonSection}>
                  <media-play-button>
                    <span slot="play"><div class={styles.playIcon}></div></span>
                    <span slot="pause"><div class={styles.pauseIcon}></div></span>
                  </media-play-button>
                  <media-mute-button>
                    <span slot="high"><div class={styles.muteIcon}></div></span>
                    <span slot="medium"><div class={styles.muteIcon}></div></span>
                    <span slot="low"><div class={styles.muteIcon}></div></span>
                    <span slot="off"><div class={styles.unmuteIcon}></div></span>
                  </media-mute-button>
                  <media-volume-range></media-volume-range>
                  <media-live-button class={styles.liveButton}>
                    <span slot="text" class={styles.text}>Live</span>
                  </media-live-button>
                  <media-time-display showduration></media-time-display>
                </div>
                <div class={styles.buttonSection}>
                  <media-fullscreen-button></media-fullscreen-button>
                  <buttton
                    role="button"
                    onClick={triggerContextMenu}
                    ref={streamContextMenu}
                  >
                    <div class={styles.contextIcon}></div>
                  </buttton>
                </div>
              </div>
            </media-control-bar>
          </media-controller>
        </Match>
      </Switch>
    </div>
  );
}

export default hookForDev(LiveVideo);
