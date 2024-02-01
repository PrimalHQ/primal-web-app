import { Kind } from "../constants";
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

export let startTimes: number[] = [];

export const uploadMediaChunk = async (
  uploader: string | undefined,
  subid: string,
  uploadId: string,
  data: string,
  offset: number,
  fileLength: number,
  socket: WebSocket | undefined,
  index: number,
) => {
  if (!uploader) {
    return false;
  }

  const event = {
    kind: Kind.UploadChunk,
    tags: [['p', uploader]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      file_length: fileLength,
      upload_id: uploadId,
      offset,
      data,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subid,
      {cache: ["upload_chunk", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      startTimes[index] = Date.now();

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
};


export const uploadMediaCancel = async (
  uploader: string | undefined,
  subid: string,
  uploadId: string,
  socket: WebSocket | undefined,
) => {
  if (!uploader) {
    return false;
  }

  const event = {
    kind: Kind.UploadChunk,
    tags: [['p', uploader]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      upload_id: uploadId,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subid,
      {cache: ["upload_chunk", { event_from_user: signedNote }]},
    ])

    if (socket) {
      socket.send(message);
    } else {
      throw('no_socket');
    }

    return true;
  } catch (reason) {
    console.error('Failed to cancel upload: ', reason);
    return false;
  }
};

export const uploadMediaConfirm = async (
  uploader: string | undefined,
  subid: string,
  uploadId: string,
  fileLength: number,
  sha256: string,
  socket: WebSocket | undefined,
) => {
  if (!uploader) {
    return false;
  }

  const event = {
    kind: Kind.UploadChunk,
    tags: [['p', uploader]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      upload_id: uploadId,
      file_length: fileLength,
      sha256,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subid,
      {cache: ["upload_complete", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      socket.send(message);
    } else {
      throw('no_socket');
    }

    return true;
  } catch (reason) {
    console.error('Failed to complete upload: ', reason);
    return false;
  }
};
