import { Component, createEffect, createSignal, For, JSXElement, Match, onMount, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './ChatMessage.module.scss';
import { nip19 } from '../../lib/nTools';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, truncateNpub, userName } from '../../stores/profile';
import { DMContact } from '../../megaFeeds';
import { date } from '../../lib/dates';
import { DirectMessage, NostrLiveChat, PrimalArticle, PrimalUser } from '../../types/primal';
import { useDMContext } from '../../contexts/DMContext';
import { useAccountContext } from '../../contexts/AccountContext';
import { A } from '@solidjs/router';
import { useAppContext } from '../../contexts/AppContext';
import { decodeIdentifier, hexToNpub } from '../../lib/keys';
import { isDev, urlEncode } from '../../utils';
import { hashtagCharsRegex, Kind, linebreakRegex, lnUnifiedRegex, noteRegex, specialCharsRegex, urlExtractRegex } from '../../constants';
import { createStore } from 'solid-js/store';
import { NoteContent } from '../ParsedNote/ParsedNote';
import { isInterpunction, isUrl, isImage, isMp4Video, isOggVideo, isWebmVideo, isYouTube, isSpotify, isTwitch, isMixCloud, isSoundCloud, isAppleMusic, isWavelake, getLinkPreview, isNoteMention, isUserMention, isAddrMention, isTagMention, isHashtag, isCustomEmoji, isUnitifedLnAddress, isLnbc, is3gppVideo } from '../../lib/notes';
import { generatePrivateKey } from '../../lib/nTools';
import { useMediaContext } from '../../contexts/MediaContext';
import NoteImage from '../NoteImage/NoteImage';
import { getMediaUrl as getMediaUrlDefault } from "../../lib/media";
import LinkPreview from '../LinkPreview/LinkPreview';
import ArticleCompactPreview from '../ArticlePreview/ArticleCompactPreview';
import EmbeddedNote from '../EmbeddedNote/EmbeddedNote';
import { logError } from '../../lib/logger';
import MentionedUserLink from '../Note/MentionedUserLink/MentionedUserLink';
import Lnbc from '../Lnbc/Lnbc';
import { humanizeNumber } from '../../lib/stats';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import FollowButton from '../FollowButton/FollowButton';
import ChatMessage from './ChatMessage';
import FollowButtonChat from '../FollowButton/FollowButtonChat';
import { actions as tActions } from '../../translations';
import { useIntl } from '@cookbook/solid-intl';


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
}> = (props) => {
  const account = useAccountContext();
  const app = useAppContext();
  const media = useMediaContext();
  const dms = useDMContext();
  const intl = useIntl();

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

  }

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
      style={`top:${position() || 0}px;`}
    >
      <div class={styles.header}>
        <div class={styles.author}>
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
        </div>

        <div class={styles.controls}>
          <button
            class={styles.controlMuteButton}
            onClick={() => {
              if (account?.muted.includes(props.config?.message.pubkey || '')) {
                account.actions.removeFromMuteList(props.config?.message.pubkey || '');
                return;
              }

              app?.actions.openConfirmModal({
                title: intl.formatMessage(tActions.muteUserConfirmTitle, { name: userName(props.config?.author) }),
                description: intl.formatMessage(tActions.muteUserConfirm, { name: userName(props.config?.author) }),
                onConfirm: async () => {
                  account?.actions.addToMuteList(props.config?.message.pubkey || '');
                  app.actions.closeConfirmModal();
                },
                onAbort: app.actions.closeConfirmModal,
              })
            }}
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
            onClick={() => {}}
          >
            <div class={styles.iconZap}></div>
          </button>
          <button
            class={styles.controlButton}
            onClick={() => {}}
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
