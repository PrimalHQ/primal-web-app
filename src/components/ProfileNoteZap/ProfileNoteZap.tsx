import { A } from "@solidjs/router";
import { Component, createSignal, onMount, Show } from "solid-js";
import { Kind } from "../../constants";
import { date } from "../../lib/dates";
import { hookForDev } from "../../lib/devTools";
import { hexToNpub } from "../../lib/keys";
import { humanizeNumber } from "../../lib/stats";
import { userName } from "../../stores/profile";
import { MenuItem, PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import styles from  "./ProfileNoteZap.module.scss";


const ProfileNoteZap: Component<{
  id?: string,
  subject: PrimalArticle | PrimalNote | undefined,
  zap: PrimalZap,
}> = (props) => {

  const userNpub = (user: PrimalUser | string | undefined) => {
    if (typeof user === 'string') return hexToNpub(user);

    return user && user.npub;
  }

  const subject = () => {
    if (!props.subject) return <div class={styles.subject}>UNKNOWN</div>

    let content = '';
    let time = 0;
    let link = '';

    if (props.subject.msg.kind === Kind.Text) {
      content = props.subject.content;
      time = props.subject.msg.created_at || 0;
      link = `/e/${props.subject.noteId}`;
    }

    if (props.subject.msg.kind === Kind.LongForm) {
      const sub = (props.subject as PrimalArticle);
      content = sub.title;
      time = sub.published;
      link = `/e/${sub.noteId}`;
    }

    return (
      <A href={link} class={styles.subject}>
        <div class={styles.header}>
          <div class={styles.userName}>
            {userName(props.subject.user)}
          </div>
          <Show when={time > 0}>
            <div class={styles.bullet}>&middot;</div>
            <div class={styles.time}>
              {date(time).label}
            </div>
          </Show>
        </div>
        <div class={styles.body}>
          {content}
        </div>
      </A>
    );
  }

  return (
    <div class={styles.contentZap} data-zap-id={props.zap.id}>
      <div class={styles.zapInfo}>
        <div class={styles.topLine}>
          <A href={`/p/${userNpub(props.zap.sender)}`} class={styles.sender}>
            <Avatar size="xs" user={props.zap.sender} />
          </A >
          <div class={styles.amount}>
            <div class={styles.zapIcon}></div>
            <div class={styles.number}>
              {humanizeNumber(props.zap.amount, true)}
            </div>
          </div>
          <A href={`/p/${userNpub(props.zap.reciver)}`} class={styles.receiver}>
            <Avatar size="xs" user={props.zap.reciver} />
          </A>
        </div>
        <div class={styles.bottomLine}>
          <div class={styles.message}>
            {props.zap.message}
          </div>
        </div>
      </div>

      {subject()}
    </div>
  )
}

export default hookForDev(ProfileNoteZap);
