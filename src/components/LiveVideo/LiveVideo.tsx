import { Component, createEffect, createSignal, on, onMount, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import Hls from 'hls.js';

import styles from './LiveVideo.module.scss';
import { StreamingData } from '../../lib/streaming';
import { PrimalUser } from '../../types/primal';
import { useAppContext } from '../../contexts/AppContext';

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

  const [isLive, setIsLive] = createSignal(false);

  let streamContextMenu: HTMLButtonElement | undefined;

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

  return (
    <div class={styles.liveVideo} >
      <Show when={props.src} fallback={<div class={styles.videoPlaceholder}></div>}>
        <Show when={!isMediaLoaded()}>
          <div class={styles.videoPlaceholder}></div>
        </Show>
        <media-controller
          autohide="2"
          autohideovercontrols
          ref={mediaController}
          style={!isMediaLoaded() ? 'display: none;' : ''}
        >
          <hls-video
            src={props.src}
            slot="media"
            crossorigin
            autoplay
            ref={hlsVideo}
            onloadedmetadata={() => {
                setIsMediaLoaded(true);
              setTimeout(() => {

              }, 100)

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
              }
            }}
          ></hls-video>
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

                    const calcTimeFromRangeValue = (
                    ): number => {
                      if (!mediaController?.media) return 0;

                      const el = mediaController?.media;
                      const value = parseFloat(e.target?.value || '1.0');
                      const startTime = Number.isFinite(el.mediaSeekableStart)
                        ? el.mediaSeekableStart
                        : 0;
                      // Prefer `mediaDuration` when available and finite.
                      const endTime = Number.isFinite(el.duration)
                        ? el.duration
                        : el.seekable.end(seekable.length - 1);
                      if (Number.isNaN(endTime)) return 0;
                      return value * (endTime - startTime) + startTime;
                    };

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
      </Show>
    </div>
  );
}

export default hookForDev(LiveVideo);
