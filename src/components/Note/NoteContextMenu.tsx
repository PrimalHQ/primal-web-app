import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { MenuItem, NostrRelaySignedEvent, PrimalNote, PrimalRepost, PrimalUser } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, nip05Verification, truncateNpub, userName } from '../../stores/profile';
import { note as t, actions as tActions, toast as tToast } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import NoteReplyHeader from './NoteHeader/NoteReplyHeader';
import Avatar from '../Avatar/Avatar';
import { date } from '../../lib/dates';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import PrimalMenu from '../PrimalMenu/PrimalMenu';
import { useAccountContext } from '../../contexts/AccountContext';
import { APP_ID } from '../../App';
import { reportUser } from '../../lib/profile';
import { useToastContext } from '../Toaster/Toaster';
import { broadcastEvent } from '../../lib/notes';
import { getScreenCordinates } from '../../utils';

const NoteContextMenu: Component<{
  note: PrimalNote,
  openCustomZap?: () => void;
  openReactions?: () => void,
  id?: string,
}> = (props) => {
  const account = useAccountContext();
  const toaster = useToastContext();
  const intl = useIntl();

  const [showContext, setContext] = createSignal(false);
  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);

  const openContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContext(true);
  };

  const doMuteUser = () => {
    account?.actions.addToMuteList(props.note.post.pubkey);
  };

  const doUnmuteUser = () => {
    account?.actions.removeFromMuteList(props.note.post.pubkey);
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
      label: intl.formatMessage(tActions.noteContext.reactions),
      action: () => {
        props.openReactions && props.openReactions();
        setContext(false);
      },
      icon: 'heart',
    },
    {
      label: intl.formatMessage(tActions.noteContext.zap),
      action: () => {
        props.openCustomZap && props.openCustomZap();
        setContext(false);
      },
      icon: 'feed_zap',
    },
    {
      label: intl.formatMessage(tActions.noteContext.copyLink),
      action: copyNoteLink,
      icon: 'copy_note_link',
    },
    {
      label: intl.formatMessage(tActions.noteContext.copyText),
      action: copyNoteText,
      icon: 'copy_note_text',
    },
    {
      label: intl.formatMessage(tActions.noteContext.copyId),
      action: copyNoteId,
      icon: 'copy_note_id',
    },
    {
      label: intl.formatMessage(tActions.noteContext.copyRaw),
      action: copyRawData,
      icon: 'copy_raw_data',
    },
    {
      label: intl.formatMessage(tActions.noteContext.breadcast),
      action: broadcastNote,
      icon: 'broadcast',
    },
    {
      label: intl.formatMessage(tActions.noteContext.copyPubkey),
      action: copyUserNpub,
      icon: 'copy_pubkey',
    },
  ];

  const noteContextForOtherPeople: MenuItem[] = [
    {
      label: intl.formatMessage(tActions.noteContext.muteAuthor),
      action: () => {
        setConfirmMuteUser(true);
        setContext(false);
      },
      icon: 'mute_user',
      warning: true,
    },
    {
      label: intl.formatMessage(tActions.noteContext.reportAuthor),
      action: () => {
        setConfirmReportUser(true);
        setContext(false);
      },
      icon: 'report',
      warning: true,
    },
  ];

  const noteContext = account?.publicKey !== props.note.post.pubkey ?
      [ ...noteContextForEveryone, ...noteContextForOtherPeople] :
      noteContextForEveryone;

  let context: HTMLDivElement | undefined;

  const determineOrient = () => {
    const coor = getScreenCordinates(context);
    const height = 440;
    return (coor.y || 0) + height < window.innerHeight + window.scrollY ? 'down' : 'up';
  }

  return (
    <div class={styles.contextMenu} ref={context}>
      <button
        class={styles.contextButton}
        onClick={openContextMenu}
      >
        <div class={styles.contextIcon} ></div>
      </button>
      <PrimalMenu
        id={`note_context_${props.note.post.id}`}
        items={noteContext}
        hidden={!showContext()}
        position="note_footer"
        orientation={determineOrient()}
      />
    </div>
  )
}

export default hookForDev(NoteContextMenu);
