import { A } from "@solidjs/router";
import { Component, JSXElement } from "solid-js";
import { hookForDev } from "../../../lib/devTools";
import { nip05Verification, userName } from "../../../stores/profile";
import { PrimalUser } from "../../../types/primal";
import Avatar from "../../Avatar/Avatar";
import VerificationCheck from "../../VerificationCheck/VerificationCheck";
import styles from  "./MentionedUserLink.module.scss";

const MentionedUserLink: Component<{
  user: PrimalUser,
  openInNewTab?: boolean,
  id?: string,
}> = (props) => {

  const LinkComponent: Component<{ children: JSXElement }> = (p) => {
    return props.openInNewTab ?
      <a
        id={props.id}
        class={styles.userMention}
        href={`/p/${props.user.npub}`}
        target="_blank"
      >
        {p.children}
      </a> :
      <A
        id={props.id}
        class={styles.userMention}
        href={`/p/${props.user.npub}`}
      >
        {p.children}
      </A>;
  };

  return (
    <LinkComponent>
      @{userName(props.user)}
      <div class={styles.userPreview}>
        <Avatar user={props.user} />
        <div>
          <div class={styles.userName}>
            {userName(props.user)}
            <VerificationCheck user={props.user} />
          </div>
          <div class={styles.verification}>
            {nip05Verification(props.user)}
          </div>
        </div>
      </div>
    </LinkComponent>
  );
}

export default hookForDev(MentionedUserLink);
