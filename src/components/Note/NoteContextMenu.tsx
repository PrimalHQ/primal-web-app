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
import { NoteContextMenuInfo } from '../../contexts/AppContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';

const NoteContextMenu: Component<{
  data: NoteContextMenuInfo,
  open: boolean,
  onClose: () => void,
  id?: string,
}> = (props) => {
  const account = useAccountContext();
  const toaster = useToastContext();
  const intl = useIntl();

  const [showContext, setContext] = createSignal(false);
  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);

  const [orientation, setOrientation] = createSignal<'down' | 'up'>('down')

  const note = () => props.data?.note;
  const position = () => {
    return props.data?.position;
  };

  createEffect(() => {
    if(!context) return;

    if (!props.open) {
      context.setAttribute('style',`top: -1024px; left: -1034px;`);
    }

    const docRect = document.documentElement.getBoundingClientRect();
    const pos = {
      top: (Math.floor(position()?.top || 0) - docRect.top),
      left: (Math.floor(position()?.left || 0)),
    }

    context.setAttribute('style',`top: ${pos.top + 12}px; left: ${pos.left + 12}px;`);

    const height = 440;
    const orient = Math.floor(position()?.bottom || 0) + height < window.innerHeight ? 'down' : 'up';

    setOrientation(() => orient);
  });


  const doMuteUser = () => {
    account?.actions.addToMuteList(note()?.post.pubkey);
    props.onClose();
  };

  const doUnmuteUser = () => {
    account?.actions.removeFromMuteList(note()?.post.pubkey);
    props.onClose();
  };

  const doReportUser = () => {
    reportUser(note()?.user.pubkey, `report_user_${APP_ID}`, note()?.user);
    props.onClose();
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(note()?.user)}));
  };

  const copyNoteLink = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${window.location.origin}/e/${note().post.noteId}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.notePrimalLinkCoppied));
  };

  const copyNoteText = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${note().post.content}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.notePrimalTextCoppied));
  };

  const copyNoteId = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${note().post.noteId}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.noteIdCoppied));
  };

  const copyRawData = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${JSON.stringify(note().msg)}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.noteRawDataCoppied));
  };

  const copyUserNpub = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${note().user.npub}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorNpubCoppied));
  };

  const broadcastNote = async () => {
    if (!account || !props.data) {
      return;
    }

    const { success } = await broadcastEvent(note().msg as NostrRelaySignedEvent, account?.relays, account?.relaySettings);
    props.onClose()

    if (success) {
      toaster?.sendSuccess(intl.formatMessage(tToast.noteBroadcastSuccess));
      return;
    }
    toaster?.sendWarning(intl.formatMessage(tToast.noteBroadcastFail));
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !props.data ||
      !document?.getElementById(`note_context_${note().post.id}`)?.contains(e.target as Node)
    ) {
      props.onClose()
    }
  }

  createEffect(() => {
    if (props.open) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const isVerifiedByPrimal = () => {
    return props.data && !!note().user.nip05 &&
      note().user.nip05.endsWith('primal.net');
  }

  const noteContextForEveryone: MenuItem[] = [
    {
      label: intl.formatMessage(tActions.noteContext.reactions),
      action: () => {
        props.data?.openReactions && props.data?.openReactions();
        props.onClose()
      },
      icon: 'heart',
    },
    {
      label: intl.formatMessage(tActions.noteContext.zap),
      action: () => {
        props.data?.openCustomZap && props.data?.openCustomZap();
        props.onClose()
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

  const noteContextForOtherPeople: () => MenuItem[] = () => {
    const isMuted = account?.muted.includes(note()?.user.pubkey);

    return [
      {
        label: isMuted ?  intl.formatMessage(tActions.noteContext.unmuteAuthor) : intl.formatMessage(tActions.noteContext.muteAuthor),
        action: () => {
          isMuted ? doUnmuteUser() : setConfirmMuteUser(true);
          props.onClose()
        },
        icon: 'mute_user',
        warning: true,
      },
      {
        label: intl.formatMessage(tActions.noteContext.reportAuthor),
        action: () => {
          setConfirmReportUser(true);
          props.onClose()
        },
        icon: 'report',
        warning: true,
      },
    ];
  };

  const noteContext = () => account?.publicKey !== note()?.post.pubkey ?
      [ ...noteContextForEveryone, ...noteContextForOtherPeople()] :
      noteContextForEveryone;

  let context: HTMLDivElement | undefined;

  return (
    <div class={styles.contextMenu} ref={context}>
      <ConfirmModal
        open={confirmReportUser()}
        description={intl.formatMessage(tActions.reportUserConfirm, { name: authorName(note()?.user) })}
        onConfirm={() => {
          doReportUser();
          setConfirmReportUser(false);
        }}
        onAbort={() => setConfirmReportUser(false)}
      />

      <ConfirmModal
        open={confirmMuteUser()}
        description={intl.formatMessage(tActions.muteUserConfirm, { name: authorName(note()?.user) })}
        onConfirm={() => {
          doMuteUser();
          setConfirmMuteUser(false);
        }}
        onAbort={() => setConfirmMuteUser(false)}
      />

      <PrimalMenu
        id={`note_context_${note()?.post.id}`}
        items={noteContext()}
        hidden={!props.open}
        position="note_footer"
        orientation={orientation()}
      />
    </div>
  )
}

export default hookForDev(NoteContextMenu);
