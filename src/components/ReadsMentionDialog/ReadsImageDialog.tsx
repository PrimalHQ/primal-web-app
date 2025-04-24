import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { Kind, urlRegexG } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { ReactionStats, useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { getEventQuotes, getEventQuoteStats, getEventReactions, getEventZaps, parseLinkPreviews, setLinkPreviews } from '../../lib/notes';
import { truncateNumber2 } from '../../lib/notifications';
import { subsTo } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { nip05Verification, userName } from '../../stores/profile';
import {
  actions as tActions,
  placeholders as tPlaceholders,
  reactionsModal,
  search as tSearch,
  upload as tUpload,
} from '../../translations';
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalNote, PrimalUser } from '../../types/primal';
import { debounce, parseBolt11 } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Paginator from '../Paginator/Paginator';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ReadsMentionDialog.module.scss';
import DOMPurify from 'dompurify';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useSearchContext } from '../../contexts/SearchContext';
import SearchOption from '../Search/SearchOption';
import { useProfileContext } from '../../contexts/ProfileContext';
import { getUsersRelayInfo } from '../../lib/profile';
import { Editor } from '@tiptap/core';
import { TextField } from '@kobalte/core/text-field';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Uploader from '../Uploader/Uploader';
import { useToastContext } from '../Toaster/Toaster';
import UploaderBlossom from '../Uploader/UploaderBlossom';


const ReadsImageDialog: Component<{
  id?: string,
  open: boolean,
  editor: Editor | undefined,
  setOpen?: (v: boolean) => void,
  onSubmit: (url: string, title: string, alt: string) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();
  const toast = useToastContext();

  const [state, setState] = createStore({
    alt: '',
    title: '',
    image: '',
  })

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
            <Show
              when={state.image.length > 0}
              fallback={
                <div class={styles.uploadPlaceholder}>
                  <div class={styles.attachIcon}></div>
                  <div class={styles.attachLabel}>
                    upload image
                  </div>
                </div>
              }
            >
              <img src={state.image} />
            </Show>

            <input
              id="upload-content"
              type="file"
              onChange={uploadFile}
              ref={contentFileUpload}
              hidden={true}
              accept="image/*,video/*,audio/*"
            />
          </div>

          <UploaderBlossom
            uploadId="upload_content_image"
            hideLabel={false}
            publicKey={account?.publicKey}
            nip05={account?.activeUser?.nip05}
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
          />
        </div>
        <div class={styles.inputHolder}>
          <label for="input_title">Image title:</label>
          <input
            id="input_title"
            class={styles.textInput}
            value={state.title}
            onInput={(e) => setState(() => ({ title: e.target.value}))}
          />

          <label for="input_alt">Image alt text:</label>
          <input
            id="input_alt"
            class={styles.textInput}
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
