import { Component, createSignal, onCleanup, onMount } from "solid-js";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const NoteYouTube: Component<{
  class?: string,
  youtubeId: string,
}> = (props) => {
  let iframeEl: HTMLIFrameElement | undefined;
  let containerEl: HTMLDivElement | undefined;
  let player: any = null;
  const [isPlayerReady, setIsPlayerReady] = createSignal(false);
  let playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;

  const loadYouTubeAPI = () => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkReady = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkReady);
          initPlayer();
        }
      }, 100);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    const originalOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (originalOnReady) originalOnReady();
      initPlayer();
    };
  };

  const initPlayer = () => {
    if (!iframeEl || !window.YT) return;

    try {
      player = new window.YT.Player(iframeEl, {
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            try {
              event.target.mute();
            } catch (e) {
            }
            if (containerEl) {
              const rect = containerEl.getBoundingClientRect();
              const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
              if (isVisible) {
                setTimeout(() => {
                  event.target.mute();
                  event.target.playVideo();
                }, 300);
              }
            }
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize YouTube player:', e);
    }
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry) => {
      if (!player || !isPlayerReady()) return;

      if (!entry.isIntersecting) {
        try {
          player.pauseVideo();
        } catch (e) {
        }
        return;
      }

      if (entry.isIntersecting) {
        try {
          player.mute();
          player.playVideo();
        } catch (e) {
        }
      }
    });
  });

  onMount(() => {
    if (containerEl) {
      observer.observe(containerEl);
    }
    loadYouTubeAPI();
  });

  onCleanup(() => {
    if (containerEl) {
      observer.unobserve(containerEl);
    }
    if (player && typeof player.destroy === 'function') {
      try {
        player.destroy();
      } catch (e) {
      }
    }
  });

  if (!props.youtubeId) {
    return null;
  }

  const embedUrl = `https://www.youtube.com/embed/${props.youtubeId}?enablejsapi=1&mute=1&rel=0&playsinline=1`;

  return (
    <div
      ref={containerEl}
      class={props.class}
      style="display: block; position: relative;"
    >
      <iframe
        ref={iframeEl}
        id={playerId}
        src={embedUrl}
        title="YouTube video player"
        // @ts-ignore
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
      ></iframe>
    </div>
  );
}

export default NoteYouTube;

