import { Kind } from "../constants";
import { sendMessage } from "../uploadSocket";
import { signEvent } from "./nostrAPI";

export const getMediaUrl = (url: string | undefined, size = 'o', animated = 1) => {
  if (!url) {
    return;
  }

  const mediaServer = localStorage.getItem('mediaServer');

  if (!mediaServer) {
    return url;
  }

  const encodedUrl = encodeURIComponent(url);

  return `${mediaServer}/media-cache?s=${size}&a=${animated}&u=${encodedUrl}`;
}

export const uploadMedia = async (
  uploader: string | undefined,
  subid: string,
  content: string,
) => {
  if (!uploader) {
    return false;
  }

  const event = {
    content,
    kind: Kind.Upload,
    tags: [['p', uploader]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["upload", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
};
