import { Component, createEffect, createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { useMediaContext } from "../../contexts/MediaContext";
import { determineOrient, uuidv4 } from "../../utils";
import Hls from 'hls.js';

import styles from './NoteVideo.module.scss';
import PrimalMenu from "../PrimalMenu/PrimalMenu";
import { useAppContext } from "../../contexts/AppContext";

const NoteVideo: Component<{
  class?: string,
  width?: number,
  height?: number,
  ratio?: number,
  src: string,
  type?: string,
}> = (props) => {
  const app =useAppContext();
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

  const onVideoClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (app?.showNoteVideoContextMenu) {
      app.actions.closeNoteVideoContextMenu();
    }

  }

  const onPlayClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!videoEl) return;

    setUserPlayed(videoEl.paused ? 'pause' : 'play');

    if (videoEl.paused || userMuted()) {
      videoEl.muted = true;
      return;
    }

    videoEl.muted = false;
  }

  const onMuteClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setUserMuted(videoEl?.muted || false);
  }

  const onContextClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    triggerContextMenu();
  }

  onMount(() => {
    videoEl?.addEventListener('click', onVideoClick);

    playButton?.addEventListener('click', onPlayClick);

    muteButton?.addEventListener('click', onMuteClick);

    mediaController?.addEventListener('click', onVideoClick);

    streamContextMenu?.addEventListener('click', onContextClick);

    if (mediaController) {
      observer.observe(mediaController);
    }
  })

  onCleanup(() => {
    videoEl?.removeEventListener('click', onVideoClick);

    playButton?.removeEventListener('click', onPlayClick);

    muteButton?.removeEventListener('click', onMuteClick);

    mediaController?.removeEventListener('click', onVideoClick);

    streamContextMenu?.removeEventListener('click', onContextClick);

    if (mediaController) {
      observer.unobserve(mediaController);
    }

  })

  const isHls = () => {
    return props.src.endsWith(".m3u8");
  }

  const [openContextMenu, setOpenContextMenu] = createSignal(false);

  const triggerContextMenu = () => {
    app?.actions.openNoteVideoContextMenu(
      props.src,
      streamContextMenu?.getBoundingClientRect(),
      downloadVideo,
    );
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

  const downloadVideo = async () => {
    const sections = props.src.split('/');
    const filename = sections[sections.length-1];

    const a = document.createElement('a');
    a.href = props.src;
    a.target = '__blank';
    a.download = filename;
    a.click();
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
                  <button
                    id={`context_button_${uuid}`}
                    role="button"
                    ref={streamContextMenu}
                    style={{ "margin-bottom": 0 }}
                    onClick={onContextClick}
                  >
                    <div class={styles.contextIcon}></div>
                  </button>
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
