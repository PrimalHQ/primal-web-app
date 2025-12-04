import { useIntl } from '@cookbook/solid-intl';
import { Component, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { NostrRelaySignedEvent, NostrUserContent, PrimalArticle, PrimalNote } from '../../types/primal';

import styles from './Events.module.scss';
import { Kind } from '../../constants';
import Note from '../Note/Note';
import ArticlePreview from '../ArticlePreview/ArticlePreview';

import dmIcon from '../../assets/icons/send_circle.svg';
import highlightIcon from '../../assets/icons/highlight_create.svg';
import reportIcon from '../../assets/icons/report.svg';
import likeIcon from '../../assets/icons/like.svg';
import repostIcon from '../../assets/icons/reposts.svg';
import uploadIcon from '../../assets/icons/upload.svg';
import downloadIcon from '../../assets/icons/download.svg';
import postIcon from '../../assets/icons/post.svg';
import deleteIcon from '../../assets/icons/delete.svg';
import listIcon from '../../assets/icons/list.svg';
import profileIcon from '../../assets/icons/profile.svg';
import settingsIcon from '../../assets/icons/settings.svg';

import genericIcon from '../../assets/icons/nav/messages.svg';

const GenericEvent: Component<{
  event: NostrRelaySignedEvent,
  onResign: (event: NostrRelaySignedEvent) => void,
}> = (props) => {

// 1. Send DM
// 2. Send Highlight
// 3. Send Remove Highlight
// 4. Send Report
// -5. Send Like
// -6. Send Repost
// 7. Send Article Repost
// 8. Send Blossom Event
// -9. Send Note
// -10. Send Article
// 11. Send Delete Event
// 12. Send Draft
// 13. Send Contacts
// 14. Send Mute List
// 15. Send Stream Mute List
// 16. Send Profile
// 17. Send Filter Lists
// 18. Send Allow List
// 19. Send Relays
// 20. Send Stream Message

  const eventIcon = () => {
    const kind = props.event.kind;

    switch (kind) {
      case Kind.EncryptedDirectMessage:
        return dmIcon;
      case Kind.Highlight:
        return highlightIcon;
      case Kind.ReportContent:
        return reportIcon;
      case Kind.Reaction:
        return likeIcon;
      case Kind.Repost:
        return repostIcon;
      case Kind.Blossom:
        return uploadIcon;
      case Kind.Text:
        return postIcon;
      case Kind.LongForm:
        return postIcon;
      case Kind.EventDeletion:
        return deleteIcon;
      case Kind.Contacts:
        return listIcon;
      case Kind.MuteList:
        return listIcon;
      case Kind.StreamMuteList:
        return listIcon;
      case Kind.Metadata:
        return profileIcon;
      case Kind.RelayList:
        return listIcon;
      case Kind.LiveChatMessage:
        return dmIcon;
      case Kind.Settings:
        return settingsIcon;
      default:
        return genericIcon;
    }
  };

  const description = () => {

    const kind = props.event.kind;

    switch (kind) {
      case Kind.EncryptedDirectMessage:
        return 'Send Direct Message';
      case Kind.Highlight:
        return 'Highlight';
      case Kind.ReportContent:
        return 'Repost Content';
      case Kind.Reaction:
        return 'Reaction';
      case Kind.Repost:
        return 'Repost';
      case Kind.Blossom:
        return 'Upload Content';
      case Kind.Text:
        return 'Note';
      case Kind.LongForm:
        return 'Article';
      case Kind.EventDeletion:
        return 'Delete Request';
      case Kind.Contacts:
        return 'Update Contacts List';
      case Kind.MuteList:
        return 'Update Mute List';
      case Kind.StreamMuteList:
        return 'Update Stream Mute List';
      case Kind.Metadata:
        return 'Update Profile';
      case Kind.RelayList:
        return 'Update Relay List';
      case Kind.LiveChatMessage:
        return 'Send Live Stream Message';
      case Kind.Settings:
        return 'Sync Settings';
      default:
        return 'Unknown Event';
    }
  }

  return (
    <div
      class={styles.genericEvent}
      data-event={props.event.id}
      data-event-kind={props.event.kind}
    >
      <div class={styles.eventIcon}>
        <div
          style={`--mask-url: url(${eventIcon()});`}
        />
      </div>
      <div class={styles.eventDescription}>
        {description()}
      </div>
      <Show when={!props.event.sig}>
        <button
          class={styles.resignButton}
          onClick={() => props.onResign(props.event)}
        >
          Retry Signing
        </button>
      </Show>
    </div>
  )
}

export default hookForDev(GenericEvent);
