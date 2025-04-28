import { Component, createEffect, createSignal, JSXElement, on, onCleanup, onMount, Show } from 'solid-js';
import { Progress } from '@kobalte/core/progress';

import styles from './Uploader.module.scss';
import { uploadServer } from '../../uploadSocket';
import { createStore } from 'solid-js/store';
import { NostrEOSE, NostrEvent, NostrEventContent, NostrEventType, NostrMediaUploaded } from '../../types/primal';
import { readUploadTime, saveUploadTime } from '../../lib/localStore';
import { startTimes, uploadMediaCancel, uploadMediaChunk, uploadMediaConfirm } from '../../lib/media';
import { encodeAuthorizationHeader, sha256, uuidv4 } from '../../utils';
import { Kind, primalBlossom, uploadLimit } from '../../constants';
import ButtonGhost from '../Buttons/ButtonGhost';
import { useAccountContext } from '../../contexts/AccountContext';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { getReplacableEvent } from '../../lib/notes';

import { BlossomClient, SignedEvent, BlobDescriptor, fetchWithTimeout } from "blossom-client-sdk";
import { signEvent } from '../../lib/nostrAPI';
import { logInfo, logWarning } from '../../lib/logger';
import { useToastContext } from '../Toaster/Toaster';

const MB = 1024 * 1024;

export type UploadState = {
  isUploading: boolean,
  progress: number,
  id?: string,
  uploadLimit: number,
  file?: File,
  xhr?: XMLHttpRequest,
  auth?: SignedEvent,
}

const UploaderBlossom: Component<{
  uploadId?: string,
  publicKey?: string,
  nip05?: string,
  hideLabel?: boolean,
  file: File | undefined,
  onFail?: (reason: string, uploadId?: string) => void,
  onRefuse?: (reason: string, uploadId?: string) => void,
  onCancel?: (uploadId?: string) => void,
  onSuccsess?: (url: string, uploadId?: string) => void,
  onStart?: (uploadId: string | undefined, cancelUpload: () => void) => void,
  progressBar?: (state: UploadState, resetUpload: () => void) => JSXElement,
}> = (props) => {
  const account = useAccountContext();
  const toaster = useToastContext();

  let progressFill: HTMLDivElement | undefined;

  const [uploadState, setUploadState] = createStore<UploadState>({
    isUploading: false,
    progress: 0,
    uploadLimit: uploadLimit.regular,
  });

  const mainServer = () => {
    return account?.blossomServers[0] || primalBlossom;
  }


  const xhrOnProgress = (e: ProgressEvent) => {
    if (e.lengthComputable) {
      const p = Math.ceil(e.loaded / e.total * 100);

      setUploadState('progress', () => p);
    }
  }

  const xhrOnLoad = (e: ProgressEvent) => {
    if ((uploadState.xhr?.status || 200) < 300) {
      const response = JSON.parse(uploadState.xhr?.responseText || '{}');
      props.onSuccsess && props.onSuccsess(response.url, props.uploadId);

      mirrorUpload(response);
      resetUpload();
      return;
    }

    toaster?.sendWarning(uploadState.xhr?.statusText || 'Error while uploading. Check your media server settings.');
    resetUpload();
  }

  const xhrOnError = (e: ProgressEvent) => {
    resetUpload();
    props.onFail && props.onFail('', props.uploadId);
  }

  const xhrOnAbort = (e: ProgressEvent) => {
    logInfo('upload aborted: ', uploadState.file?.name);
    clearXHR();
  }

  const resetUpload = () => {
    setUploadState(() => ({
      isUploading: false,
      file: undefined,
      id: undefined,
      progress: 0,
      xhr: undefined,
      uploadLimit: uploadLimit.regular,
      auth: undefined,
    }));
  };

  const mirrorUpload = async (blob: BlobDescriptor) => {
    const mirrors = account?.blossomServers.slice(1) || [];
    if (mirrors.length === 0) return;

    let auth = await BlossomClient.createUploadAuth(signEvent, blob.sha256, { message: 'media upload mirroring'});
    setUploadState('auth', () => ({ ...auth }));

    for (let server of mirrors) {
      try {
        BlossomClient.mirrorBlob(server, blob, { auth });
      } catch {
        logWarning('Failed to mirror to: ', server)
      }
    }

  };

  const clearXHR = () => {
    const xhr = uploadState.xhr;
    if (!xhr) return;

    xhr.removeEventListener("load", xhrOnLoad);
    xhr.removeEventListener("error", xhrOnError);
    xhr.removeEventListener("abort", xhrOnAbort);

    setUploadState('xhr', () => undefined);
  }

  const calcUploadLimit = (membershipTier: string | undefined, size: number) => {
    let limit = uploadLimit.regular;

    if (membershipTier === 'premium') {
      limit = uploadLimit.premium;
      // setUploadState('uploadLimit', () => uploadLimit.premium);
      // return;
    }
    if (membershipTier === 'premium-legend') {
      limit = uploadLimit.premiumLegend;
      // setUploadState('uploadLimit', () => uploadLimit.premiumLegend);
      // return;
    }

    setUploadState('uploadLimit',  () => limit);

    return size <= MB * limit;
  };

  const uploadFile = async (file: File) => {
    const url = mainServer();

    setUploadState(() => ({
      isUploading: true,
      id: uuidv4(),
      progress: 0,
      xhr: new XMLHttpRequest(),
      file,
    }));

    let allow = true;

    if (url === primalBlossom) {
      allow = calcUploadLimit(account?.membershipStatus.tier, file.size);
    }

    if (!allow) {
      props.onRefuse && props.onRefuse(`file_too_big_${uploadState.uploadLimit}`, props.uploadId);
      resetUpload();
      return;
    }

    const xhr = uploadState.xhr;
    if (!xhr) return;

    try {
      const auth = await BlossomClient.createUploadAuth(signEvent, file, { message: 'media upload' });

      setUploadState('auth', () => ({ ...auth }));

      const encodedAuthHeader = encodeAuthorizationHeader(auth);

      const mediaUrl = url.endsWith('/') ? `${url}media` : `${url}/media`;
      const uploadUrl = url.endsWith('/') ? `${url}upload` : `${url}/upload`;

      const fileSha = await sha256(file);

      let headers = {
        "X-SHA-256": fileSha,
        "Authorization": encodedAuthHeader,
        'Content-Type': file.type,
      }

      let checkHeaders: Record<string, string> = {
        ...headers,
        "X-Content-Length": `${file.size}`,
      };

      if (file.type) checkHeaders["X-Content-Type"] = file.type;

      try {

        const mediaCheck = await fetchWithTimeout(mediaUrl, {
          method: "HEAD",
          headers: checkHeaders,
          timeout: 3_000,
        });

        if (mediaCheck.status === 200) {
          sendFile(xhr, mediaUrl, file, headers);
          return;
        }

      } catch (e) {
        logWarning('Failed media upload check: ', e);
      }

      try {
        const uploadCheck = await fetchWithTimeout(uploadUrl, {
          method: "HEAD",
          headers: checkHeaders,
          timeout: 3_000,
        });

        if (uploadCheck.status === 200) {
          sendFile(xhr, uploadUrl, file, headers);
          return;
        }
      } catch (e) {
        logWarning('Failed media upload check: ', e);
      }

      // toaster?.sendWarning(`Failed to upload to ${url}`);
      resetUpload();
      props.onFail && props.onFail(`Failed to upload to ${url}`);
    } catch (e) {
      resetUpload();
      props.onCancel && props.onCancel();
    }
  }

  const sendFile = (xhr: XMLHttpRequest, uploadUrl: string, file: File, headers: Record<string, string>) => {
    xhr.open('PUT', uploadUrl, true);

    const headerNames = Object.keys(headers);

    for (let i = 0; i < headerNames.length; i++) {
      const name = headerNames[i];
      xhr.setRequestHeader(name, headers[name]);
    }

    xhr.upload.addEventListener("progress", xhrOnProgress);
    xhr.addEventListener("load", xhrOnLoad);
    xhr.addEventListener("error", xhrOnError);
    xhr.addEventListener("abort", xhrOnAbort);

    xhr.send(file);
    props.onStart && props.onStart(uploadState.id, () => {
      uploadState.xhr?.abort();
      resetUpload();
    });
  }

  createEffect(on(() => props.file, (file) => {
    if (file !== undefined) {
      uploadFile(file);
    }
  }))

  return (
    <Show when={uploadState.id}>
      <Show
        when={!props.progressBar}
        fallback={<>{props.progressBar!({...uploadState }, resetUpload)}</>}
      >
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
                class={`${styles.progressFill}`}
              />
            </Progress.Track>

            <ButtonGhost
              onClick={() => {
                uploadState.xhr?.abort();
                resetUpload();
                props.onCancel && props.onCancel(props.uploadId);
              }}
              disabled={uploadState.progress >= 100}
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
    </Show>
  );
}

export default UploaderBlossom;
