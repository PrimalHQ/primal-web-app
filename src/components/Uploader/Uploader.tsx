import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Progress } from '@kobalte/core/progress';

import styles from './Uploader.module.scss';
import { uploadServer } from '../../uploadSocket';
import { createStore } from 'solid-js/store';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrEventType, NostrMediaUploaded } from '../../types/primal';
import { readUploadTime, saveUploadTime } from '../../lib/localStore';
import { startTimes, uploadMediaCancel, uploadMediaChunk, uploadMediaConfirm } from '../../lib/media';
import { sha256, uuidv4 } from '../../utils';
import { Kind, uploadLimit } from '../../constants';
import ButtonGhost from '../Buttons/ButtonGhost';
import { useAccountContext } from '../../contexts/AccountContext';

const MB = 1024 * 1024;
const maxParallelChunks = 5;
let chunkLimit = maxParallelChunks;
const maxChunkAttempts = 5;

type FileSize = 'small' | 'medium' | 'large' | 'huge' | 'final';

type UploadState = {
  isUploading: boolean,
  progress: number,
  id?: string,
  file?: File,
  offset: number,
  chunkSize: number,
  chunkMap: number[],
  uploadedChunks: number,
  chunkIndex: number,
  fileSize: FileSize,
  uploadLimit: number,
}

const Uploader: Component<{
  uploadId?: string,
  publicKey?: string,
  nip05?: string,
  openSockets?: boolean,
  hideLabel?: boolean,
  file: File | undefined,
  onFail?: (reason: string, uploadId?: string) => void,
  onRefuse?: (reason: string, uploadId?: string) => void,
  onCancel?: (uploadId?: string) => void,
  onSuccsess?: (url: string, uploadId?: string) => void,
}> = (props) => {
  const account = useAccountContext();

  const [uploadState, setUploadState] = createStore<UploadState>({
    isUploading: false,
    progress: 0,
    offset: 0,
    chunkSize: MB,
    chunkMap: [],
    uploadedChunks: 0,
    chunkIndex: -1,
    fileSize: 'small',
    uploadLimit: uploadLimit.regular,
  });

  let sockets: WebSocket[] = [];
  let uploadsInProgress: number[] = [];

  let uploadChunkAttempts: number[] = Array(maxParallelChunks).fill(-1);

  let initUploadTime = readUploadTime(props.publicKey);

  let totalStart = 0;
  let totalEnd = 0;

  let times: number[] = [];
  let subIdComplete = 'up_comp_';

  let progressFill: HTMLDivElement | undefined;

  let shouldCloseSockets = false;

  createEffect(() => {
    if (props.file !== undefined) {
      uploadFile(props.file);
    }
    else {
      resetUpload();
    }
  })

  createEffect(() => {
    if (props.openSockets) {
      shouldCloseSockets = false;
      for (let i=0; i < maxParallelChunks; i++) {
        const socket = new WebSocket(uploadServer);

        socket.addEventListener('close', () => {
          if (shouldCloseSockets) return;

          const newSocket = new WebSocket(uploadServer);

          sockets[i] = newSocket;

          const chunkIndex = uploadsInProgress[i];
          if (chunkIndex > 0) {
            uploadChunk(chunkIndex);
          }
        });

        sockets.push(socket);
      }
    }
    else {
      shouldCloseSockets = true;
      sockets.forEach(s => s.close());
      sockets = [];
    }
  });

  createEffect(() => {
    calcUploadLimit(account?.membershipStatus.tier);
  });

  onCleanup(() => {
    sockets.forEach(s => s.close());
    sockets = [];
  });

  createEffect(() => {
    if (uploadState.isUploading && uploadState.chunkIndex >= 0) {
      uploadChunk(uploadState.chunkIndex);
    }
  });

  const calcUploadLimit = (membershipTier: string | undefined) => {

    if (membershipTier === 'premium') {
      setUploadState('uploadLimit', () => uploadLimit.premium);
      return;
    }
    if (membershipTier === 'premium-legend') {
      setUploadState('uploadLimit', () => uploadLimit.premiumLegend);
      return;
    }

    setUploadState('uploadLimit',  () => uploadLimit.regular);
  };

  const subTo = (socket: WebSocket, subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
    const listener = (event: MessageEvent) => {
      const message: NostrEvent | NostrEOSE = JSON.parse(event.data);
      const [type, subscriptionId, content] = message;

      if (subId === subscriptionId) {
        cb(type, subscriptionId, content);
      }

    };

    socket.addEventListener('message', listener);

    return () => {
      socket.removeEventListener('message', listener);
    };
  };

  const resetUpload = (skipCancel?: boolean) => {
    if (!skipCancel && uploadState.id) {
      const soc = sockets[0];
      uploadMediaCancel(props.publicKey, `up_c_${uploadState.id}`, uploadState.id || '', soc);
    }

    setUploadState(() => ({
      isUploading: false,
      file: undefined,
      id: undefined,
      progress: 0,
      offset: 0,
      chunkSize: MB,
      chunkMap: [],
      uploadedChunks: 0,
      chunkIndex: -1,
      fileSize: 'small',
    }));

    uploadChunkAttempts = Array(maxParallelChunks).fill(maxChunkAttempts);
  };

  const failUpload = () => {
    resetUpload(true);
    props.onFail && props.onFail('', props.uploadId);
  };

  const onUploadCompleted = async (soc: WebSocket, file: File) => {
    const sha = await sha256(file);

    const unsubComplete = subTo(soc, subIdComplete, (type, subId, content) => {
      if (type === 'NOTICE') {
        unsubComplete();
        failUpload();
        return;
      }

      if (type === 'EVENT') {
        if (!content) {
          return;
        }

        if (content.kind === Kind.Uploaded) {
          const up = content as NostrMediaUploaded;

          totalEnd = Date.now();
          const average = (totalEnd - totalStart) / uploadState.uploadedChunks;

          saveUploadTime(props.publicKey, { [uploadState.fileSize]: average });

          progressFill?.style.setProperty('--progress-rate', `${100}ms`);

          setTimeout(() => {
            setUploadState('progress', () => 100);
          }, 10)


          setTimeout(() => {
            props.onSuccsess && props.onSuccsess(up.content, props.uploadId);
            resetUpload(true);
          }, 500)
          return;
        }
      }

      if (type === 'EOSE') {
        unsubComplete();
        return;
      }

    });

    uploadMediaConfirm(props.publicKey, subIdComplete, uploadState.id || '', file.size, sha, soc);
  }


  const uploadChunk = (index: number) => {
    const { file, chunkSize, id, chunkMap } = uploadState;

    const offset = chunkMap[index];

    if (!file || !id) return;

    const reader = new FileReader();

    const nextOffset = offset + chunkSize;

    let chunk = file.slice(offset, nextOffset);

    reader.onload = (e) => {
      if (!e.target?.result) {
        return;
      }

      const subid = `up_${index}_${uploadChunkAttempts[index]}_${id}`;

      const data = e.target?.result as string;

      const socIndex = index % maxParallelChunks;

      const soc = sockets[index % maxParallelChunks];

      const unsub = subTo(soc, subid, (type, subId, content) => {

        if (type === 'NOTICE') {
          unsub();
          if (uploadChunkAttempts[index] < 1) {
            failUpload();
            return;
          }

          uploadsInProgress[socIndex] = -1;
          uploadChunkAttempts[index]--;
          uploadChunk(index);
          return;
        }

        if (type === 'EOSE') {
          unsub();
          uploadsInProgress[socIndex] = -1;

          times[index] = Date.now() - startTimes[index];

          if (!uploadState.isUploading) return;

          setUploadState('uploadedChunks', n => n+1);

          const len = chunkMap.length;

          const progress = Math.ceil(100 * uploadState.uploadedChunks / uploadState.chunkMap.length) - 1;

          setUploadState('progress', () => progress);

          if (uploadState.uploadedChunks < len && uploadState.chunkIndex < len - 1) {
            setUploadState('chunkIndex', i => i+1);
            return;
          }

          if (uploadState.uploadedChunks === len) {
            onUploadCompleted(soc, file);
            return;
          }

        }
      });

      const rate = initUploadTime[uploadState.fileSize];
      progressFill?.style.setProperty('--progress-rate', `${rate + rate / 4}ms`);

      let fsize = file.size;

      uploadsInProgress[socIndex] = index;

      uploadMediaChunk(props.publicKey, subid, id, data, offset, fsize, soc, index);
    }

    reader.readAsDataURL(chunk);

  };

  const uploadFile = (file: File) => {
    if (file.size >= MB * uploadState.uploadLimit) {
      props.onRefuse && props.onRefuse(`file_too_big_${uploadState.uploadLimit}`, props.uploadId);
      resetUpload(true);
      return;
    }

    let chunkSize = MB;
    let fileSize: FileSize = 'huge';

    if (file.size < MB / 2) {
      chunkSize = file.size;
      fileSize = 'small';
    }
    else if (file.size < MB) {
      chunkSize = Math.ceil(MB / 4);
      fileSize = 'medium';
    }
    else if (file.size < 12 * MB) {
      chunkSize = Math.ceil(MB / 2);
      fileSize = 'large';
    }

    let sum = 0;

    let chunkMap: number[] = [];

    while (sum < file.size) {
      if (sum >= file.size) break;

      chunkMap.push(sum);
      sum += chunkSize;
    }

    setUploadState(() => ({
      isUploading: true,
      file,
      id: uuidv4(),
      progress: 0,
      offset: 0,
      chunkSize,
      chunkMap,
      chunkIndex: 0,
      fileSize,
    }))

    subIdComplete = `up_comp_${uploadState.id}`;

    uploadChunkAttempts = Array(chunkMap.length).fill(maxChunkAttempts);

    chunkLimit = Math.min(maxParallelChunks, chunkMap.length - 2);

    totalStart = Date.now();

    for (let i=0;i < chunkLimit; i++) {
      setTimeout(() => {
        setUploadState('chunkIndex', () => i);
      }, 0)
    }
  }

  return (
    <Show when={uploadState.id}>
      <Progress value={uploadState.progress} class={styles.uploadProgress}>
        <Show when={!props.hideLabel}>
          <div class={styles.progressLabelContainer}>
            <Progress.Label class={styles.progressLabel}>{uploadState.file?.name || ''}</Progress.Label>
          </div>
        </Show>
        <div class={styles.progressTrackContainer}>
          <Progress.Track class={styles.progressTrack}>
            <Progress.Fill
              ref={progressFill}
              class={`${styles.progressFill} ${styles[uploadState.fileSize]}`}
            />
          </Progress.Track>

          <ButtonGhost
            onClick={() => {
              resetUpload();
              props.onCancel && props.onCancel(props.uploadId);
            }}
            disabled={uploadState.progress > 100}
          >
            <Show
              when={(uploadState.progress < 100)}
              fallback={<div class={styles.iconCheck}></div>}
            >
              <div class={styles.iconClose}></div>
            </Show>
          </ButtonGhost>
        </div>
      </Progress>
    </Show>
  );
}

export default Uploader;
