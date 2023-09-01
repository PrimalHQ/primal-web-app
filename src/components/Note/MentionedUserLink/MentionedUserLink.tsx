import { A } from "@solidjs/router";
import { Component, JSXElement } from "solid-js";
import { hookForDev } from "../../../lib/devTools";
import { userName } from "../../../stores/profile";
import { PrimalUser } from "../../../types/primal";
import styles from  "./MentionedUserLink.module.scss";

const MentionedUserLink: Component<{
  user: PrimalUser,
  openInNewTab?: boolean,
  id?: string,
}> = (props) => {

  const LinkComponent: Component<{ children: JSXElement }> = (p) => {
    return props.openInNewTab ?
      <a id={props.id} class={styles.userMention} href={`/p/${props.user.npub}`} target="_blank">{p.children}</a> :
      <A id={props.id} class={styles.userMention} href={`/p/${props.user.npub}`}>{p.children}</A>;
  };

  return (
    <LinkComponent>
      @{userName(props.user)}
    </LinkComponent>
  );
}

export default hookForDev(MentionedUserLink);
