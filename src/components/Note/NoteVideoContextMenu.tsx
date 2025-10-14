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
import { NoteVideoContextMenuInfo, useAppContext } from '../../contexts/AppContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { nip19 } from 'nostr-tools';
import { readSecFromStorage } from '../../lib/localStore';
import { useNavigate } from '@solidjs/router';
import { Kind } from '../../constants';
import ReportContentModal from '../ReportContentModal/ReportContentModal';
import { encodeCoordinate } from '../../stores/megaFeed';
import Longform from '../../pages/Longform';
import { urlEncode, uuidv4 } from '../../utils';
import { StreamingData } from '../../lib/streaming';

const NoteVideoContextMenu: Component<{
  data: NoteVideoContextMenuInfo,
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

  const uuid = uuidv4();

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


  const doDownloadVideo = () => {
    props.data.onDownload && props.data.onDownload();
  }

  const onClickOutside = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (
      !props.data ||
      !document?.getElementById(`note_video_context_${uuid}`)?.contains(e.target as Node)
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

  const streamContextForEveryone: () => MenuItem[] = () => {

    return [
      {
        action: () => doDownloadVideo(),
        label: intl.formatMessage(tActions.noteVideoContext.downloadVideo),
        icon: 'download',
      },
    ];
  };

  const streamContextForOtherPeople: () => MenuItem[] = () => {
    return [
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
      <PrimalMenu
        id={`note_video_context_${uuid}`}
        items={streamContext()}
        hidden={!props.open}
        position="note_context"
        orientation={orientation()}
      />
    </div>
  )
}

export default hookForDev(NoteVideoContextMenu);
