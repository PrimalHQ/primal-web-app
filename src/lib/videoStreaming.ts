/**
 * Lazy loading helpers for video streaming libraries
 * These heavy libraries (~740KB) are only loaded when video content is displayed
 */

import type Hls from 'hls.js';

let hlsPromise: Promise<typeof Hls> | undefined;
let mediaElementsPromise: Promise<void> | undefined;

/**
 * Lazy load HLS.js library
 * Used for HTTP Live Streaming video playback
 */
export const loadHls = async (): Promise<typeof Hls> => {
  if (!hlsPromise) {
    hlsPromise = import('hls.js').then(module => module.default);
  }
  return hlsPromise;
};

/**
 * Lazy load video player custom elements
 * Includes hls-video-element, videojs-video-element, and media-chrome
 */
export const loadMediaElements = async (): Promise<void> => {
  if (!mediaElementsPromise) {
    mediaElementsPromise = Promise.all([
      import('media-chrome'),
      import('media-chrome/media-theme-element'),
      import('hls-video-element'),
      import('videojs-video-element'),
    ]).then(() => undefined);
  }
  return mediaElementsPromise;
};

/**
 * Load all video streaming dependencies
 * Call this before rendering video player components
 */
export const loadVideoStreamingDeps = async () => {
  await Promise.all([
    loadHls(),
    loadMediaElements(),
  ]);
};
