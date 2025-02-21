import { A } from "@solidjs/router";
import { Component, createSignal, Match, onMount, Show, Switch } from "solid-js";
import { Kind } from "../../constants";
import { useAppContext } from "../../contexts/AppContext";
import { date } from "../../lib/dates";
import { hookForDev } from "../../lib/devTools";
import { hexToNpub } from "../../lib/keys";
import { humanizeNumber } from "../../lib/stats";
import { userName } from "../../stores/profile";
import { MenuItem, PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import styles from  "./ProfileNoteZap.module.scss";
import { isPhone } from "../../utils";
import { nip19 } from "nostr-tools";


const ProfileNoteZap: Component<{
  id?: string,
  subject: PrimalArticle | PrimalNote | PrimalUser | undefined,
  zap: PrimalZap,
}> = (props) => {

  const app = useAppContext();

  const userNpub = (user: PrimalUser | string | undefined) => {
    if (typeof user === 'string') return hexToNpub(user);

    return user && user.npub;
  }

  const subject = () => {
    if (!props.subject) return <div class={styles.subject}>UNKNOWN</div>

    let content = '';
    let time = 0;
    let link = '';
    let name = '';

    if (props.subject.msg.kind === Kind.Text) {
      const sub = props.subject as PrimalNote;

      content = sub.content;
      time = props.zap.created_at || 0;
      link = `/e/${sub.noteIdShort}`;
      name = userName(sub.user);
    }

    if (props.subject.msg.kind === Kind.LongForm) {
      const sub = props.subject as PrimalArticle;
      content = sub.title;
      time = props.zap.created_at || 0;
      link = `/a/${sub.noteId}`;
      name = userName(sub.user);
    }

    if (props.subject.msg.kind === Kind.Metadata) {
      const sub = props.subject as PrimalUser;
      content = sub.about;
      time = props.zap.created_at || 0;
      link = app?.actions.profileLink(sub.npub) || '';
      name = userName(sub);
    }

    return (
      <A href={link} class={styles.subject}>
        <div class={styles.header}>
          <div class={styles.userName}>
            {name}
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
    <Switch>
      <Match when={isPhone()}>
        <div class={styles.contentZapPhone} data-zap-id={props.zap.id}>
          <div class={styles.zapSender}>
            <Avatar size="xxs" user={props.zap.sender} />
            <div class={styles.amount}>
              <div class={styles.zapIcon}></div>
              <div class={styles.number}>{props.zap.amount.toLocaleString()}</div>
            </div>
            <div class={styles.message}>
              {props.zap.message}
            </div>
          </div>

          <div class={styles.zapReceiver}>
            <div class={styles.leftSide}>
              <A href={app?.actions.profileLink(userNpub(props.zap.reciver)) || ''} class={styles.receiver}>
                <Avatar size="xxs" user={props.zap.reciver} />
              </A>
            </div>
            <div class={styles.rightSide}>
              {subject()}
            </div>
          </div>
        </div>
      </Match>

      <Match when={!isPhone()}>
        <div class={styles.contentZap} data-zap-id={props.zap.id}>
          <div class={styles.zapInfo}>
            <A href={app?.actions.profileLink(userNpub(props.zap.sender)) || ''} class={styles.sender}>
              <Avatar size="vs2" user={props.zap.sender} />
            </A >

            <div class={styles.data}>
              <div class={styles.amount}>
                <div class={styles.zapIcon}></div>
                <div class={styles.number}>{props.zap.amount.toLocaleString()}</div>
              </div>
              <div class={styles.message}>
                {props.zap.message}
              </div>
            </div>

            <A href={app?.actions.profileLink(userNpub(props.zap.reciver)) || ''} class={styles.receiver}>
              <Avatar size="vs2" user={props.zap.reciver} />
            </A>
          </div>

          {subject()}
        </div>
      </Match>
    </Switch>
  )
}

export default hookForDev(ProfileNoteZap);
