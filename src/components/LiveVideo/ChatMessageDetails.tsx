import { Component, createEffect, createSignal, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './ChatMessage.module.scss';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, userName } from '../../stores/profile';
import { NostrLiveChat, PrimalUser, ZapOption } from '../../types/primal';
import { useAccountContext } from '../../contexts/AccountContext';
import { A, useNavigate } from '@solidjs/router';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { humanizeNumber } from '../../lib/stats';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import ChatMessage from './ChatMessage';
import FollowButtonChat from '../FollowButton/FollowButtonChat';
import { actions as tActions, toastZapProfile } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';
import { useToastContext } from '../Toaster/Toaster';


export type ChatMessageConfig = {
  author: PrimalUser | undefined,
  message: NostrLiveChat,
  target: HTMLElement | null | undefined,
  people: PrimalUser[],
};

const ChatMessageDetails: Component<{
  id?: string,
  config: ChatMessageConfig | undefined,
  onClose: () => void,
  onMute: (pubkey: string, unmute?: boolean) => void,
}> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const navigate = useNavigate()
  const intl = useIntl();
  const toaster = useToastContext();

  let chatMessageDetails: HTMLDivElement | undefined;

  const [position, setPosition] = createSignal<number>(0);

  createEffect(() => {
    if (!props.config) return;

    const { target } = props.config

    if (!target) return;

    const rect = target.getBoundingClientRect();

    const popHeight = 328;

    if (window.innerHeight - rect.top - rect.height > popHeight) {
      setPosition(rect.top + rect.height);
      return;
    }

    if (rect.top - popHeight > 72) {
      setPosition(rect.top - popHeight);
      return;
    }

    setPosition(200);
  });

  const reportMessage = () => {
    props.config?.message && app?.actions.openReportContent(props.config?.message)
  }

  const doMute = () => {
    if (!props.config?.message.pubkey) return;
    const pubkey = props.config?.message.pubkey;

    // Unmute if already muted
    if (account?.muted.includes(pubkey)) {
      account.actions.removeFromMuteList(pubkey);
      props.onMute(pubkey, true);
      return;
    }

    app?.actions.openConfirmModal({
      title: intl.formatMessage(tActions.muteUserConfirmTitle, { name: userName(props.config?.author) }),
      description: intl.formatMessage(tActions.muteUserConfirm, { name: userName(props.config?.author) }),
      onConfirm: async () => {
        account?.actions.addToMuteList(pubkey);
        props.onMute(pubkey);
        app.actions.closeConfirmModal();
      },
      onAbort: app.actions.closeConfirmModal,
    })
  }

  const customZapInfo: () => CustomZapInfo = () => ({
    profile: props.config?.author,
    onConfirm: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
    },
    onSuccess: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
      toaster?.sendSuccess(intl.formatMessage(toastZapProfile, {
        name: userName(props.config?.author)
      }))
    },
    onFail: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
    },
    onCancel: (zapOption: ZapOption) => {
      app?.actions.closeCustomZapModal();
      app?.actions.resetCustomZap();
    },
  });

  const renderChatMessage = () => {
    return (
      <div
        class={styles.liveMessage}
      >
        <Show when={props.config?.author}>
          <div class={styles.leftSide}>
            <Avatar user={props.config?.author} size="xss" />
          </div>
        </Show>
        <div class={styles.rightSide}>
          <Show when={props.config?.author}>
            <span class={styles.authorName}>
              {userName(props.config?.author)}
            </span>
          </Show>
          <span class={styles.messageContent}>
            <ChatMessage
              content={props.config?.message.content}
              sender={props.config?.author}
              mentionedUsers={props.config?.people}
              event={props.config?.message}
            />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      class={styles.chatMessageDetails}
      ref={chatMessageDetails}
      data-chat-message={props.config?.message.id}
      style={`top:${position() || 0}px;`}
    >
      <div class={styles.header}>
        <a
          class={styles.author}
          href={app?.actions.profileLink(props.config?.message.pubkey)}
          target='_blank'
        >
          <div class={styles.userInfo}>
            <Avatar user={props.config?.author} size="s38" />
            <div class={styles.nameAndNip}>
              <div class={styles.nameAndVer}>
                <div class={styles.name}>{userName(props.config?.author)}</div>
                <VerificationCheck user={props.config?.author} />
              </div>
              <div class={styles.nip05}>{nip05Verification(props.config?.author)}</div>
            </div>
          </div>
          <div class={styles.followers}>
            <div class={styles.number}>
              {humanizeNumber(props.config?.author?.userStats?.followers_count || 0)}
            </div>
            <div class={styles.label}>followers</div>
          </div>
        </a>

        <div class={styles.controls}>
          <button
            class={styles.controlMuteButton}
            onClick={doMute}
          >
            <div class={styles.iconMute}></div>
            { account?.muted.includes(props.config?.message.pubkey || '') ? 'Unmute' : 'Mute'}
          </button>
          <button
            class={styles.controlButton}
            onClick={() => {
              props.config?.author && app?.actions.openProfileQr(props.config?.author)
            }}
          >
            <div class={styles.iconQr}></div>
          </button>
          <button
            class={styles.controlButton}
            onClick={() => {
              app?.actions.openCustomZapModal(customZapInfo())
            }}
          >
            <div class={styles.iconZap}></div>
          </button>
          <button
            class={styles.controlButton}
            onClick={() => navigate(`/dms/${props.config?.author?.npub || props.config?.message.pubkey || ''}`)}
          >
            <div class={styles.iconMessages}></div>
          </button>
          <FollowButtonChat person={props.config?.author} />
        </div>
      </div>

      <div class={styles.messageReport}>
        <div class={styles.caption}>Message</div>
        <div class={styles.chat}>
          {renderChatMessage()}
        </div>
        <div class={styles.report}>
          <button onClick={reportMessage}>
            <div class={styles.iconReport}>b</div>
            <div>Report message</div>
          </button>
        </div>
      </div>

      <div class={styles.footer}>
        <button class={styles.closeButton} onClick={props.onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default hookForDev(ChatMessageDetails);
