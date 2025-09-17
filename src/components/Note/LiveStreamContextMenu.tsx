import { Component, createEffect, createSignal } from 'solid-js';
import { MenuItem, NostrNoteContent, NostrRelaySignedEvent, PrimalArticle, PrimalNote, PrimalUser } from '../../types/primal';

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
import { broadcastEvent, sendDeleteEvent, triggerImportEvents } from '../../lib/notes';
import { LiveStreamContextMenuInfo, useAppContext } from '../../contexts/AppContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { nip19 } from 'nostr-tools';
import { readSecFromStorage } from '../../lib/localStore';
import { useNavigate } from '@solidjs/router';
import { Kind } from '../../constants';
import ReportContentModal from '../ReportContentModal/ReportContentModal';
import { encodeCoordinate } from '../../stores/megaFeed';
import Longform from '../../pages/Longform';
import { urlEncode } from '../../utils';
import { StreamingData } from '../../lib/streaming';

const LiveStreamContextMenu: Component<{
  data: LiveStreamContextMenuInfo,
  open: boolean,
  onClose: () => void,
  id?: string,
}> = (props) => {
  const account = useAccountContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const app = useAppContext();
  const navigate = useNavigate();

  const [confirmReportUser, setConfirmReportUser] = createSignal(false);
  const [confirmReportContent, setConfirmReportContent] = createSignal<StreamingData>();
  const [confirmMuteUser, setConfirmMuteUser] = createSignal(false);
  const [confirmMuteThread, setConfirmMuteThread] = createSignal(false);
  const [confirmRequestDelete, setConfirmRequestDelete] = createSignal(false);

  const [orientation, setOrientation] = createSignal<'down' | 'up'>('up')

  const stream = () => props.data?.stream;

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
    const pubkey = stream().pubkey;
    if (pubkey) {
      account?.actions.addToMuteList(pubkey, 'user');
    }
    props.onClose();
  };

  const doUnmuteUser = () => {
    const pubkey = stream().pubkey;
    if (pubkey) {
      account?.actions.removeFromMuteList(pubkey);
    }
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

    reportUser(stream().pubkey, `report_user_${APP_ID}`, props.data?.streamAuthor);
    props.onClose();
    toaster?.sendSuccess(intl.formatMessage(tToast.noteAuthorReported, { name: userName(props.data?.streamAuthor)}));
  };

  const liveHref = () => {
    const event = props.data?.stream;
    if (!event) return '';

    const host = event.hosts?.[0] || event.pubkey;

    return `${app?.actions.profileLink(host, true)}/live/${event.id}`;
  }

  const copyStreamLink = () => {
    if (!props.data) return;

    let link = liveHref();

    navigator.clipboard.writeText(`${window.location.origin}/${link}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.streamPrimalLinkCoppied));
  };

  const copyStreamId = () => {
    const event = props.data?.stream.event;
    if (!event) return;

    const { naddr } = encodeCoordinate(event as NostrNoteContent);
    navigator.clipboard.writeText(`nostr:${naddr}`);
    props.onClose();
    toaster?.sendSuccess(intl.formatMessage(tToast.streamIdCoppied));
  };

  const copyRawData = () => {
    const event = props.data?.stream.event;
    if (!event) return;
    navigator.clipboard.writeText(`${JSON.stringify(event)}`);
    props.onClose()
    toaster?.sendSuccess(intl.formatMessage(tToast.streamRawDataCoppied));
  };

  const doQuote = () => {
    const event = props.data?.stream.event;
    if (!event) return;

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    const { naddr } = encodeCoordinate(event as NostrNoteContent);

    account?.actions?.quoteNote(`nostr:${naddr}`);
    account?.actions?.showNewNoteForm();
    app?.actions.closeStreamContextMenu();
  };

  const doRequestDelete = async () => {
    const user = account?.activeUser;
    const event = stream().event;

    if (!props.data || !user || !event) return;

    const kind = event.kind;
    const { coordinate } = encodeCoordinate(event as NostrNoteContent);

    const { success, note: deleteEvent } = await sendDeleteEvent(
      user.pubkey,
      coordinate,
      kind,
      account.activeRelays,
      account.relaySettings,
      account.proxyThroughPrimal,
    );

    if (!success || !deleteEvent) return;

    triggerImportEvents([deleteEvent], `delete_import_${APP_ID}`);

    props.data?.onDelete && props.data?.onDelete(stream().id || '');
    props.onClose();
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !props.data ||
      !document?.getElementById(`stream_context_${stream().id}`)?.contains(e.target as Node)
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
    return props.data && !!props.data?.streamAuthor.nip05 &&
      props.data?.streamAuthor.nip05.endsWith('primal.net');
  }

  const streamContextForEveryone: () => MenuItem[] = () => {

    return [
      {
        action: () => doQuote(),
        label: intl.formatMessage(tActions.streamContext.quoteStream),
        icon: 'quote',
      },
      {
        label: intl.formatMessage(tActions.streamContext.copyLink),
        action: copyStreamLink,
        icon: 'copy_note_link_2',
      },
      {
        label: intl.formatMessage(tActions.streamContext.copyId),
        action: copyStreamId,
        icon: 'copy_note_id',
      },
      {
        label: intl.formatMessage(tActions.streamContext.copyRaw),
        action: copyRawData,
        icon: 'copy_raw_data',
      },
    ];
  };

  const streamContextForOtherPeople: () => MenuItem[] = () => {
    const isMuted = account?.muted.includes(props.data?.streamAuthor.pubkey);
    const isMutedThread = account?.mutedTags.find((t) => t[0] === 'e' && t[1] === stream()?.id);

    return [
      {
        label: isMuted ?  intl.formatMessage(tActions.streamContext.unmuteAuthor) : intl.formatMessage(tActions.streamContext.muteAuthor),
        action: () => {
          isMuted ? doUnmuteUser() : setConfirmMuteUser(true);
          props.onClose()
        },
        icon: 'mute_user',
        warning: true,
      },
      {
        label: intl.formatMessage(tActions.streamContext.reportContent),
        action: () => {
          const n = stream();
          n && setConfirmReportContent(() => ({ ...n }));
          props.onClose();
        },
        icon: 'report',
        warning: true,
      },
    ];
  };

  const streamContextForMe: () => MenuItem[] = () => {
    return [];
  };


  const requestDeleteContextMenu: () => MenuItem[] = () => {
    return [
      {
        label: intl.formatMessage(tActions.streamContext.requestDelete),
        action: () => {
          setConfirmRequestDelete(true);
          props.onClose();
        },
        icon: 'delete',
        warning: true,
      },
    ];
  };

  const streamContext = () => account?.publicKey !== stream()?.pubkey ?
      [ ...streamContextForEveryone(), ...streamContextForOtherPeople()] :
      [ ...streamContextForMe(), ...streamContextForEveryone(), ...requestDeleteContextMenu()];

  let context: HTMLDivElement | undefined;

  return (
    <div class={styles.contextMenu} ref={context}>
      <ConfirmModal
        open={confirmReportUser()}
        description={intl.formatMessage(tActions.reportUserConfirm, { name: authorName(props.data?.streamAuthor) })}
        onConfirm={() => {
          doReportUser();
          setConfirmReportUser(false);
        }}
        onAbort={() => setConfirmReportUser(false)}
      />

      <ReportContentModal
        note={confirmReportContent()}
        onClose={() => setConfirmReportContent(undefined)}
      />

      <ConfirmModal
        open={confirmMuteUser()}
        description={intl.formatMessage(tActions.muteUserConfirm, { name: authorName(props.data?.streamAuthor) })}
        onConfirm={() => {
          doMuteUser();
          setConfirmMuteUser(false);
        }}
        onAbort={() => setConfirmMuteUser(false)}
      />

      <ConfirmModal
        open={confirmRequestDelete()}
        title="Delete note?"
        description="This will issue a “request delete” command to the relays where the note was published. Do you want to continue? "
        onConfirm={() => {
          doRequestDelete();
          setConfirmRequestDelete(false);
        }}
        onAbort={() => setConfirmRequestDelete(false)}
      />

      <PrimalMenu
        id={`stream_context_${stream()?.id}`}
        items={streamContext()}
        hidden={!props.open}
        position="note_context"
        orientation={orientation()}
      />
    </div>
  )
}

export default hookForDev(LiveStreamContextMenu);
