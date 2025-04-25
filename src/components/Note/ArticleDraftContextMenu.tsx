import { Component, createEffect, createSignal } from 'solid-js';
import { MenuItem, NostrRelaySignedEvent, PrimalArticle } from '../../types/primal';

import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { authorName, userName } from '../../stores/profile';
import { note as t, actions as tActions, toast as tToast, toast } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import PrimalMenu from '../PrimalMenu/PrimalMenu';
import { useAccountContext } from '../../contexts/AccountContext';
import { APP_ID } from '../../App';
import { reportUser } from '../../lib/profile';
import { useToastContext } from '../Toaster/Toaster';
import { broadcastEvent, sendDeleteEvent, sendDraft, triggerImportEvents } from '../../lib/notes';
import { NoteContextMenuInfo, useAppContext } from '../../contexts/AppContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { nip19 } from 'nostr-tools';
import { readSecFromStorage } from '../../lib/localStore';
import { useNavigate } from '@solidjs/router';
import { Kind } from '../../constants';

const ArticleDraftContextMenu: Component<{
  data: NoteContextMenuInfo,
  open: boolean,
  onClose: () => void,
  id?: string,
}> = (props) => {
  const account = useAccountContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const app = useAppContext();
  const navigate = useNavigate();

  const [showContext, setContext] = createSignal(false);
  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = createSignal(false);

  const [orientation, setOrientation] = createSignal<'down' | 'up'>('down')

  const note = () => props.data?.note;
  const position = () => {
    return props.data?.position;
  };

  createEffect(() => {
    if(!context) return;

    if (!props.open) {
      setTimeout(() => {
        context?.setAttribute('style',`top: -1024px; left: -1034px;`);
      }, 200)
      return;
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
    account?.actions.addToMuteList(note()?.pubkey);
    props.onClose();
  };

  const doUnmuteUser = () => {
    account?.actions.removeFromMuteList(note()?.pubkey);
    props.onClose();
  };

  const doReportUser = () => {

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    reportUser(note()?.user.pubkey, `report_user_${APP_ID}`, note()?.user);
    props.onClose();
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(note()?.user)}));
  };


  const noteLinkId = () => {
    try {
      return `e/${note().noteId}`;
    } catch(e) {
      return '404';
    }
  };

  const editArticle = () => {
    navigate(`/reads/edit/${note().noteId}`);
  };

  const quoteArticle = () => {
    account?.actions?.quoteNote(`nostr:${note().noteId}`);
    account?.actions?.showNewNoteForm();
  }

  const deleteDraft = async () => {
    const user = account?.activeUser;
    if (!props.data || !user) return;
    const article = props.data.note as PrimalArticle;

    const { success, note } = await sendDeleteEvent(
      user.pubkey,
      article.id,
      Kind.Draft,
      account.activeRelays,
      account.relaySettings,
      account.proxyThroughPrimal,
    );

    if (!success || !note) return;

    triggerImportEvents([note], `delete_import_${APP_ID}`);
    // Used here just as a signal, not for actually custom zaps
    props.data.onDelete && props.data.onDelete(article.id);
    props.onClose()
  };

  const copyNoteId = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${note().id}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.noteIdCoppied));
  };

  const copyRawData = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${JSON.stringify(note().msg)}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.noteRawDataCoppied));
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !props.data ||
      !document?.getElementById(`note_context_${note().id}`)?.contains(e.target as Node)
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
      label: intl.formatMessage(tActions.articleOverviewContext.edit),
      action: editArticle,
      icon: 'edit',
    },
    {
      label: intl.formatMessage(tActions.articleOverviewContext.copyId),
      action: copyNoteId,
      icon: 'copy_note_id',
    },
    {
      label: intl.formatMessage(tActions.articleOverviewContext.copyRawEvent),
      action: copyRawData,
      icon: 'copy_raw_data',
    },
    {
      label: intl.formatMessage(tActions.articleOverviewContext.delete),
      action: () => setConfirmDeleteDraft(true),
      icon: 'delete',
      warning: true,
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

  const noteContext = () => account?.publicKey !== note()?.pubkey ?
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
        id={`note_context_${note()?.id}`}
        items={noteContext()}
        hidden={!props.open}
        position="note_context"
        orientation={orientation()}
      />

      <ConfirmModal
        open={confirmDeleteDraft()}
        title="Delete article?"
        description="This will issue a “request delete” command to the relays where the article was published. Do you want to continue? "
        onConfirm={() => {
          deleteDraft();
          setConfirmDeleteDraft(false);
        }}
        onAbort={() => setConfirmDeleteDraft(false)}
      />
    </div>
  )
}

export default hookForDev(ArticleDraftContextMenu);
