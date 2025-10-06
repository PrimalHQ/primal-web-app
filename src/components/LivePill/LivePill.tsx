import { Component, Show } from "solid-js";
import { PrimalUser, SendNoteResult } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import styles from  "./LivePill.module.scss";
import { StreamingData } from "../../lib/streaming";
import { useAppContext } from "../../contexts/AppContext";
import { date } from "../../lib/dates";
import { userName } from "../../stores/profile";

const LivePill: Component<{
  liveEvent: StreamingData,
  liveAuthor: PrimalUser | undefined,
}> = (props) => {
  const app = useAppContext();

  const liveHref = (event: StreamingData | undefined) => {
    if (!event) return '';

    let host = event.hosts?.[0] || event.pubkey;

    return `${app?.actions.profileLink(host, true)}/live/${event.id}`;
  }

  return (
    <a class={styles.liveItem} href={liveHref(props.liveEvent)}>
      <div class={styles.leftSide}>
        <Avatar user={props.liveAuthor} size="xxs" />
        <div class={styles.eventInfo}>
          <div class={styles.authorName}>{props.liveEvent?.title || userName(props.liveAuthor)}</div>
          <div class={styles.ribbon}>
            <Show
              when={props.liveEvent.status === 'live'}
              fallback={<div class={styles.time}>Ended {date(props.liveEvent?.ends || 0).label} ago</div>}
            >
              <div class={styles.time}>Started {date(props.liveEvent?.starts || 0).label} ago</div>
            </Show>

              <div class={styles.participantIcon}></div>
              <div>{props.liveEvent?.currentParticipants || 0}</div>

          </div>
        </div>
      </div>
      <Show when={props.liveEvent.status === 'live'}>
        <div class={styles.liveStatus}>
          <div class={styles.liveDot}></div>
          Live
        </div>
      </Show>
    </a>
  )
}

export default LivePill;
