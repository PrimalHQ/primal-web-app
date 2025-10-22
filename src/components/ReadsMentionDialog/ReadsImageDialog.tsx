import { useIntl } from '@cookbook/solid-intl';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { hookForDev } from '../../lib/devTools';
import {
  upload as tUpload,
} from '../../translations';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { Editor } from '@tiptap/core';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { useToastContext } from '../Toaster/Toaster';
import UploaderBlossom from '../Uploader/UploaderBlossom';
import { Progress } from '@kobalte/core/progress';
import { accountStore } from '../../stores/accountStore';


const ReadsImageDialog: Component<{
  id?: string,
  open: boolean,
  editor: Editor | undefined,
  setOpen?: (v: boolean) => void,
  onSubmit: (url: string, title: string, alt: string) => void,
}> = (props) => {

  const intl = useIntl();
  const toast = useToastContext();

  const [state, setState] = createStore({
    alt: '',
    title: '',
    image: '',
  });

  const [isUploading, setIsUploading] = createSignal(false);
  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  createEffect(() => {
    const e = props.editor;
    if (!e) return;

    if (props.open) {
      const sel = e.state.selection;
      const title = e.state.doc.textBetween(sel.from, sel.to);
      const image = e.getAttributes('link').href || '';

      setState(() => ({ title, image }))
    }
    else {
      setState(() => ({ image: '', title: '', alt: '' }));
    }

  })

  let contentFileUpload: HTMLInputElement | undefined;

  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();


  const resetUpload = () => {
    setFileToUpload(undefined);
    setIsUploading(false);
  };

  const onUploadContent = (file: File) => {
    setFileToUpload(file);
  }

  const uploadFile = () => {
    if (!contentFileUpload) {
        return;
      }

      const file = contentFileUpload.files ? contentFileUpload.files[0] : null;

      if (!file) return;
      setFileToUpload(file);
  }

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Insert Image"
    >
      <div class={styles.addImageDialog}>
        <div class={styles.uploadPreview}>
          <div
            class={styles.uploadHolder}
            onClick={() => contentFileUpload?.click()}
          >

            <Switch>
              <Match
                when={isUploading()}
              >
                <div
                  class={styles.uploadingOverlay}
                  onClick={() => {
                    const canc = cancelUploading();
                    resetUpload();
                    canc && canc();
                  }}
                >
                  <div>Cancel Upload</div>
                  <div class={styles.closeBtn}>
                    <div class={styles.closeIcon}></div>
                  </div>
                </div>
              </Match>

              <Match
                when={state.image.length > 0}
              >
                <div
                  class={styles.uploadButton}
                >
                  <Show when={imageLoaded()}>
                    <div
                      class={styles.uploadOverlay}
                      onClick={() => {
                        document.getElementById('upload-title-image')?.click();
                      }}
                    >
                      <div
                        class={styles.closeBtn}
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setState(() => ({ image: '' }));
                          setImageLoaded(false);
                          document.getElementById('upload-title-image')?.click();
                        }}
                      >
                        <div class={styles.closeIcon}></div>
                      </div>
                      <div>Chage hero Image</div>
                    </div>
                  </Show>
                  <img
                    class={styles.titleImage}
                    src={state.image}
                    onload={() => setImageLoaded(true)}
                  />
                </div>
              </Match>

              <Match
                when={state.image.length === 0}
              >
                <div class={styles.noTitleImagePlaceholder}>
                  <div class={styles.uploadPlaceholder}>
                    <div class={styles.attachIcon}></div>
                    <div class={styles.attachLabel}>
                      upload image
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>

            <input
              id="upload-new-media"
              type="file"
              onChange={uploadFile}
              ref={contentFileUpload}
              hidden={true}
              accept="image/*,video/*,audio/*"
            />

            <UploaderBlossom
              uploadId="upload_content_image"
              hideLabel={false}
              publicKey={accountStore.publicKey}
              nip05={accountStore.activeUser?.nip05}
              file={fileToUpload()}
              onFail={() => {
                toast?.sendWarning(intl.formatMessage(tUpload.fail, {
                  file: fileToUpload()?.name,
                }));
                resetUpload();
              }}
              onRefuse={(reason: string) => {
                if (reason === 'file_too_big_100') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigRegular));
                }
                if (reason === 'file_too_big_1024') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigPremium));
                }
                resetUpload();
              }}
              onCancel={() => {
                resetUpload();
              }}
              onSuccsess={(url:string) => {
                setState(() => ({ image: url }))

                resetUpload();
              }}
              onStart={(_, cancelUpload) => {
                setIsUploading(true);
                setImageLoaded(false);
                setCancelUploading(() => cancelUpload);
              }}
              progressBar={(uploadState, resetUploadState) => {
                return (
                  <Progress value={uploadState.progress} class={styles.uploadProgress}>
                    <div class={styles.progressTrackContainer}>
                      <Progress.Track class={styles.progressTrack}>
                        <Progress.Fill
                          class={`${styles.progressFill}`}
                        />
                      </Progress.Track>
                    </div>
                  </Progress>
                );
              }}
            />

          </div>
        </div>
        <div class={styles.inputHolder}>
          <label for="input_title">Image Title <span>Describe the image</span></label>
          <input
            id="input_title"
            class={styles.textInput}
            autocomplete="off"
            value={state.title}
            onInput={(e) => setState(() => ({ title: e.target.value}))}
          />

          <label for="input_alt">Image Alt Text <span>Shown if the image doesn’t load</span></label>
          <input
            id="input_alt"
            class={styles.textInput}
            autocomplete="off"
            value={state.alt}
            onInput={(e) => setState(() => ({ alt: e.target.value}))}
          />

          <div class={styles.actions}>
            <ButtonSecondary
              onClick={() => {
                props.setOpen && props.setOpen(false);
              }}
              light={true}
              shrink={true}
            >
              Cancel
            </ButtonSecondary>
            <ButtonPrimary
              disabled={state.image.length === 0}
              onClick={() => {
                props.onSubmit(state.image, state.title, state.alt)
              }}
            >
              Insert
            </ButtonPrimary>
          </div>
        </div>

      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsImageDialog);
