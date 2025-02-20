import { Component, createEffect, createSignal, Show } from 'solid-js';
import { MenuItem, NostrRelaySignedEvent, PrimalNote } from '../../../types/primal';

import styles from './NoteHeader.module.scss';
import { date, longDate, shortDate } from '../../../lib/dates';
import { nip05Verification, truncateNpub, userName } from '../../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../../Toaster/Toaster';
import VerificationCheck from '../../VerificationCheck/VerificationCheck';
import Avatar from '../../Avatar/Avatar';
import { A } from '@solidjs/router';
import { toast as tToast, actions as tActions } from '../../../translations';
import PrimalMenu from '../../PrimalMenu/PrimalMenu';
import CustomZap from '../../CustomZap/CustomZap';
import { broadcastEvent } from '../../../lib/notes';
import { useAccountContext } from '../../../contexts/AccountContext';
import { isAccountVerified, reportUser } from '../../../lib/profile';
import { APP_ID } from '../../../App';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import { hexToNpub } from '../../../lib/keys';
import { hookForDev } from '../../../lib/devTools';
import { useAppContext } from '../../../contexts/AppContext';
import { nip19 } from 'nostr-tools';

const NoteHeader: Component<{
  note: PrimalNote,
  openCustomZap?: () => void,
  id?: string,
  primary?: boolean,
}> = (props) => {

  const intl = useIntl();
  const toaster = useToastContext();
  const account = useAccountContext();
  const app = useAppContext();

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

  const doUnmuteUser = () => {
    account?.actions.removeFromMuteList(props.note.post.pubkey);
  };

  const doReportUser = () => {
    reportUser(props.note.user.pubkey, `report_user_${APP_ID}`, props.note.user);
    setContext(false);
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(props.note.user)}));
  };

  const noteLinkId = () => {
      try {
        return `/e/${props.note.noteId}`;
      } catch(e) {
        return '/404';
      }
    };

  const copyNoteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${noteLinkId()}`);
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

    const { success } = await broadcastEvent(props.note.msg as NostrRelaySignedEvent, account.proxyThroughPrimal, account.activeRelays, account.relaySettings);
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

  return (
    <div id={props.id} class={styles.header}>
      <div class={styles.headerInfo}>
        <div
            class={styles.avatar}
            title={props.note?.user?.npub}
          >
            <A
              href={app?.actions.profileLink(props.note.user.npub) || ''}
            >
              <Avatar
                user={props.note?.user}
                size="vs"
                highlightBorder={isVerifiedByPrimal()}
              />
            </A>
          </div>
        <div class={styles.postInfo}>
          <div class={styles.userInfo}>

            <span class={`${styles.userName} ${props.primary ? styles.primary : ''}`}>
              {authorName()}
            </span>

            <VerificationCheck
              user={props.note.user}
            />
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
    </div>
  )
}

export default hookForDev(NoteHeader);
