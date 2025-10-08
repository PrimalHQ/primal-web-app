import { Component, createEffect, createSignal, Match, onMount, Show, Switch } from "solid-js";
import { useMediaContext } from "../../contexts/MediaContext";
import { uuidv4 } from "../../utils";
import Hls from 'hls.js';

import styles from './NoteVideo.module.scss';

const NoteVideo: Component<{
  class?: string,
  width?: number,
  height?: number,
  ratio?: number,
  src: string,
  type?: string,
}> = (props) => {
  const media = useMediaContext();

  let videoEl: HTMLVideoElement | undefined;

  let mediaController: HTMLElement | undefined;
  let hlsVideo: HTMLMediaElement | undefined;
  let streamContextMenu: HTMLButtonElement | undefined;
  let playButton: HTMLButtonElement | undefined;
  let muteButton: HTMLButtonElement | undefined;

  const [userPlayed, setUserPlayed] = createSignal<'play' | 'pause' | 'auto'>('auto');
  const [userMuted, setUserMuted] = createSignal(false);
  const [isMediaLoaded, setIsMediaLoaded] = createSignal(false);

  const uuid = uuidv4();

  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement;

      if (entry.isIntersecting && video.paused) {
        video.muted = true;

        if (userPlayed() === 'pause') {
          video.pause();
          return;
        }

        if (userPlayed() === 'play') {
          video.muted = userMuted();
        }

        video.play();
      }
      else {
        video.muted = true;
        video.pause();
      }
    });
  });

  onMount(() => {
    videoEl?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    });

    playButton?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!videoEl) return;

      setUserPlayed(videoEl.paused ? 'pause' : 'play');

      if (videoEl.paused || userMuted()) {
        videoEl.muted = true;
        return;
      }

      videoEl.muted = false;
    });


    muteButton?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      setUserMuted(videoEl?.muted || false);
    });

    mediaController?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    });

    if (videoEl) {
      observer.observe(videoEl);
    }
  })

  const isHls = () => {
    return props.src.endsWith(".m3u8");
  }

  const triggerContextMenu = () => {
  }

  const checkMediaLoaded = () => {
    if (isHls()) return isMediaLoaded();

    return true;
  }

  const videoStyle = () => {
    let s = 'width: 100%;'
    if (props.width) {
      s = `width: ${props.width}px;`;
    }

    if (props.height) {
      s += `height: ${props.height}px;`;
    }
    return s;
  }

  return (
    <div
      class={`${styles.noteVideo} ${props.class}`}
      style={videoStyle()}
    >
      <Switch
        fallback={<div class={styles.videoPlaceholder}></div>}
      >
        <Match when={props.src}>
          <Show when={!checkMediaLoaded()}>
            <div class={styles.videoPlaceholder}></div>
          </Show>
          <media-controller
            autohide="2"
            autohideovercontrols
            ref={mediaController}
            style={!checkMediaLoaded() ? 'display: none;' : ''}
          >
            <Show when={isHls()}
              fallback={
                <video
                  ref={videoEl}
                  slot="media"
                  muted
                  loop
                  autoplay
                  playsinline={true}
                  data-uuid={uuid}
                >
                  <source src={props.src} type={props.type} />
                </video>
              }
            >
              <hls-video
                src={props.src}
                slot="media"
                crossorigin
                autoplay
                muted
                loop
                ref={videoEl}
                class={styles.hlsVideoPlayer}
                onloadedmetadata={() => {
                  setIsMediaLoaded(true);
                }}
              ></hls-video>
            </Show>
            <media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
            <media-control-bar class={styles.controllBar}>
              <div>
                <media-time-range  class={styles.timeRange}></media-time-range>
              </div>
              <div class={styles.videoButtons}>
                <div class={styles.buttonSection}>
                  <media-play-button ref={playButton}>
                    <span slot="play"><div class={styles.playIcon}></div></span>
                    <span slot="pause"><div class={styles.pauseIcon}></div></span>
                  </media-play-button>
                  <div class={`${styles.muteAndRange} ${(props.width || 0) < 400 ? styles.portraitControls : ''}`}>
                    <media-mute-button ref={muteButton}>
                      <span slot="high"><div class={styles.muteIcon}></div></span>
                      <span slot="medium"><div class={styles.muteIcon}></div></span>
                      <span slot="low"><div class={styles.muteIcon}></div></span>
                      <span slot="off"><div class={styles.unmuteIcon}></div></span>
                    </media-mute-button>
                    <media-volume-range></media-volume-range>
                  </div>
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

export default NoteVideo;
