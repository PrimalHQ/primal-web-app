import { Component, createEffect, createSignal, on, onMount, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import Hls from 'hls.js';

import styles from './LiveVideo.module.scss';

const LiveVideo: Component<{
  src: string,
}> = (props) => {

  let videoElement: HTMLVideoElement | undefined;
  let playButton: HTMLButtonElement | undefined;
  let progressPassed: HTMLDivElement | undefined;
  let progressHandle: HTMLDivElement | undefined;
  let progressFuture: HTMLDivElement | undefined;
  let timeProgress: HTMLDivElement | undefined;

  createEffect(() => {
    if (!videoElement) return;

    console.log('VIDEO: ', videoElement)
    bindEvents(videoElement);
  });

  createEffect(() => {
    if (videoElement?.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = props.src;
      //
      // If no native HLS support, check if HLS.js is supported
      //
    } else if (Hls.isSupported() && videoElement) {
      var hls = new Hls();
      hls.loadSource(props.src);
      hls.attachMedia(videoElement);
    }
  });

  const bindEvents = (video: HTMLVideoElement) => {
    playButton?.addEventListener('click', () => {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });

    // Update play/pause button text
    video.addEventListener('play', () => {
      if (playButton) playButton.textContent = '⏸️';
    });

    video.addEventListener('pause', () => {
      if (playButton) playButton.textContent = '▶️';
    });

    // Live button click
    // this.liveButton.addEventListener('click', () => {
    //     if (!this.isLive) {
    //         this.goLive();
    //     }
    // });

    // Progress bar clicking
    timeProgress?.addEventListener('click', (e) => {
      if (!videoElement || !timeProgress) return;

      const rect = timeProgress.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * videoElement.duration;
      console.log('VIDEO: ', videoElement.currentTime, newTime)
      videoElement.currentTime = newTime;
    });

    // Video time updates
    video.addEventListener('timeupdate', () => {
      updateProgress();
      // updateTimeDisplay();
    });

    // Video seeking
  //   this.video.addEventListener('seeking', () => {
  //       this.checkLiveStatus();
  //   });

  //   this.video.addEventListener('seeked', () => {
  //       this.checkLiveStatus();
  //   });
  }


  const updateProgress = () => {
    if (
      progressPassed &&
      progressHandle &&
      progressFuture &&
      videoElement?.duration &&
      videoElement.duration !== Infinity
    ) {
      const percent = (videoElement.currentTime / videoElement.duration) * 100;
      progressPassed.style.width = percent + '%';
      progressHandle.style.left = percent + '%';
      progressFuture.style.width = (100 - percent) + '%';
    }
  }

  return (
    <div class={styles.liveVideo} >
      <Show when={props.src}>
        <media-controller>
          <hls-video
            src={props.src}
            slot="media"
            crossorigin
            muted
          ></hls-video>
          <div class={styles.shroud}></div>
          <media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
          <media-control-bar class={styles.controllBar}>
            <div>
              <media-time-range  class={styles.timeRange}></media-time-range>
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
                <media-time-display showduration remaining></media-time-display>
              </div>
              <div class={styles.buttonSection}>
                <media-fullscreen-button></media-fullscreen-button>
              </div>
            </div>
          </media-control-bar>
        </media-controller>
      </Show>
      {/* <video controls autoplay ref={videoElement}>
        <source src={props.src || ''} type="application/x-mpegURL" />
      </video> */}

      {/* <div class={styles.customControls}>
        <div class={styles.timeProgress} ref={timeProgress}>
            <div class={styles.progressPassed} ref={progressPassed}></div>
            <div class={styles.progressHandle} ref={progressHandle}></div>
            <div class={styles.progressFuture} ref={progressFuture}></div>
        </div>
        <div class={styles.controlButtons}>
          <button class={styles.playButton} ref={playButton}>▶️</button>
        </div>
      </div> */}
    </div>
  );
}

export default hookForDev(LiveVideo);
