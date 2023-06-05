export const getMediaUrl = (url: string | undefined, size = 'o', animated = 1) => {
  if (!url) {
    return;
  }
  const mediaServer = localStorage.getItem('mediaServer');

  if (!mediaServer) {
    return url;
  }

  const encodedUrl = encodeURIComponent(url);
  console.log('URL-ing: ', encodedUrl)

  return  `${mediaServer}/media-cache?s=${size}&a=${animated}&u=${encodedUrl}`;
}
