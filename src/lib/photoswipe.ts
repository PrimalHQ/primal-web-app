import type PhotoSwipeLightbox from 'photoswipe/lightbox';

let lightboxCtor: typeof PhotoSwipeLightbox | undefined;
let photoswipeModulePromise: Promise<any> | undefined;

export const loadPhotoSwipeLightbox = async () => {
  if (!lightboxCtor) {
    const module = await import('photoswipe/lightbox');
    lightboxCtor = module.default;
  }

  return lightboxCtor!;
};

export const loadPhotoSwipeModule = () => {
  if (!photoswipeModulePromise) {
    photoswipeModulePromise = import('photoswipe');
  }

  return photoswipeModulePromise;
};

export const loadPhotoSwipeDynamicCaption = async () => {
  const module = await import('photoswipe-dynamic-caption-plugin');
  return module.default;
};

export const loadPhotoSwipeVideoPlugin = async () => {
  const module = await import('photoswipe-video-plugin');
  return module.default;
};
