import { A } from "@solidjs/router";
import { Component, JSXElement } from "solid-js";
import { userName, nip05Verification } from "../../../stores/profile";
import { PrimalUser } from "../../../types/primal";
import Avatar from "../../Avatar/Avatar";
import styles from  "./MentionedUserLink.module.scss";

const MentionedUserLink: Component<{
  user: PrimalUser,
  openInNewTab?: boolean,
}> = (props) => {

  const LinkComponent: Component<{ children: JSXElement }> = (p) => {
    return props.openInNewTab ?
      <a class={styles.userMention} href={`/profile/${props.user.npub}`} target="_blank">{p.children}</a> :
      <A class={styles.userMention} href={`/profile/${props.user.npub}`}>{p.children}</A>;
  };

  return (
    <LinkComponent>
      @{userName(props.user)}
      <div class={styles.userPreview}>
        <Avatar
          src={props.user.picture}
          size="sm"
        />
        <div>
          <div class={styles.userName}>
            {userName(props.user)}
          </div>
          <div>
            {nip05Verification(props.user)}
          </div>
        </div>
      </div>
    </LinkComponent>
  );
}

export default MentionedUserLink;
