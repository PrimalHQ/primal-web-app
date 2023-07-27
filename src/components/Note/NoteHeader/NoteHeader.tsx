import { Component, createEffect, createSignal, Show } from 'solid-js';
import { MenuItem, NostrRelaySignedEvent, PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date } from '../../../lib/dates';
import { nip05Verification, truncateNpub, userName } from '../../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../../Toaster/Toaster';
import VerificationCheck from '../../VerificationCheck/VerificationCheck';
import Avatar from '../../Avatar/Avatar';
import { A } from '@solidjs/router';
import { toast as tToast, actions as tActions } from '../../../translations';
import PrimalMenu from '../../PrimalMenu/PrimalMenu';
import CustomZap from '../../CustomZap/CustomZap';
import { broadcastEvent, sendNote } from '../../../lib/notes';
import { useAccountContext } from '../../../contexts/AccountContext';
import { reportUser } from '../../../lib/profile';
import { APP_ID } from '../../../App';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import { hexToNpub } from '../../../lib/keys';

const NoteHeader: Component<{ note: PrimalNote, openCustomZap?: () => void}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();
  const account = useAccountContext();

  const [showContext, setContext] = createSignal(false);
  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);

  const authorName = () => {
    if (!props.note.user) {
      return hexToNpub(props.note.post.pubkey);
    }
    return props.note.user?.displayName ||
      props.note.user?.name ||
      truncateNpub(props.note.user.npub);
  };

  const openContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContext(true);
  };

  const doMuteUser = () => {
    account?.actions.addToMuteList(props.note.post.pubkey);
  };

  const doReportUser = () => {
    reportUser(props.note.user.pubkey, `report_user_${APP_ID}`, props.note.user);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(props.note.user)}));
  };

  const copyNoteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/e/${props.note.post.noteId}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.notePrimalLinkCoppied));
  };

  const copyNoteText = () => {
    navigator.clipboard.writeText(`${props.note.post.content}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.notePrimalTextCoppied));
  };

  const copyNoteId = () => {
    navigator.clipboard.writeText(`${props.note.post.noteId}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteIdCoppied));
  };

  const copyRawData = () => {
    navigator.clipboard.writeText(`${JSON.stringify(props.note.msg)}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteRawDataCoppied));
  };

  const copyUserNpub = () => {
    navigator.clipboard.writeText(`${props.note.user.npub}`);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorNpubCoppied));
  };

  const broadcastNote = async () => {
    if (!account) {
      return;
    }

    const { success } = await broadcastEvent(props.note.msg as NostrRelaySignedEvent, account?.relays, account?.relaySettings);
    setContext(false);

    if (success) {
      toaster?.sendSuccess(intl.formatMessage(tToast.noteBroadcastSuccess));
      return;
    }
    toaster?.sendWarning(intl.formatMessage(tToast.noteBroadcastFail));
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !document?.getElementById(`note_context_${props.note.post.id}`)?.contains(e.target as Node)
    ) {
      setContext(false);
    }
  }

  createEffect(() => {
    if (showContext()) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const isVerifiedByPrimal = () => {
    return !!props.note.user.nip05 &&
      props.note.user.nip05.endsWith('primal.net');
  }

  const noteContextForEveryone: MenuItem[] = [
    {
      label: 'Zap',
      action: () => {
        props.openCustomZap && props.openCustomZap();
        setContext(false);
      },
      icon: 'feed_zap',
    },
    {
      label: 'Copy note link',
      action: copyNoteLink,
      icon: 'copy_note_link',
    },
    {
      label: 'Copy note text',
      action: copyNoteText,
      icon: 'copy_note_text',
    },
    {
      label: 'Copy note ID',
      action: copyNoteId,
      icon: 'copy_note_id',
    },
    {
      label: 'Copy raw data',
      action: copyRawData,
      icon: 'copy_raw_data',
    },
    {
      label: 'Broadcast note',
      action: broadcastNote,
      icon: 'broadcast',
    },
    {
      label: 'Copy user public key',
      action: copyUserNpub,
      icon: 'copy_pubkey',
    },
  ];

  const noteContextForOtherPeople: MenuItem[] = [
  ];

  const noteContext = account?.publicKey !== props.note.post.pubkey ?
      [ ...noteContextForEveryone, ...noteContextForOtherPeople] :
      noteContextForEveryone;

  return (
    <div class={styles.header}>
      <div class={styles.headerInfo}>
        <div
            class={styles.avatar}
            title={props.note?.user?.npub}
          >
            <A
              href={`/p/${props.note.user.npub}`}
            >
              <Avatar
                src={props.note?.user?.picture}
                size="sm"
                highlightBorder={isVerifiedByPrimal()}
              />
            </A>
          </div>
        <div class={styles.postInfo}>
          <div class={styles.userInfo}>

            <span class={styles.userName}>
              {authorName()}
            </span>

            <VerificationCheck user={props.note.user} />

            <span
              class={styles.time}
              title={date(props.note.post?.created_at).date.toLocaleString()}
            >
              {date(props.note.post?.created_at).label}
            </span>
          </div>

          <Show
            when={props.note.user?.nip05}
          >
            <span
              class={styles.verification}
              title={props.note.user?.nip05}
            >
              {nip05Verification(props.note.user)}
            </span>
          </Show>
        </div>
      </div>

      <div class={styles.contextMenu}>
        <button
          class={styles.contextButton}
          onClick={openContextMenu}
        >
          <div class={styles.contextIcon} ></div>
        </button>
        <Show when={showContext()}>
          <PrimalMenu
            id={`note_context_${props.note.post.id}`}
            items={noteContext}
          />
        </Show>
      </div>

      <ConfirmModal
        open={confirmReportUser()}
        description={intl.formatMessage(tActions.reportUserConfirm, { name: authorName() })}
        onConfirm={() => {
          doReportUser();
          setConfirmReportUser(false);
        }}
        onAbort={() => setConfirmReportUser(false)}
      />

      <ConfirmModal
        open={confirmMuteUser()}
        description={intl.formatMessage(tActions.muteUserConfirm, { name: authorName() })}
        onConfirm={() => {
          doMuteUser();
          setConfirmMuteUser(false);
        }}
        onAbort={() => setConfirmMuteUser(false)}
      />
    </div>
  )
}

export default NoteHeader;
