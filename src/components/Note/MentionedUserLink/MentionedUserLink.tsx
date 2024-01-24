import { useIntl } from "@cookbook/solid-intl";
import { A } from "@solidjs/router";
import { Component, JSXElement } from "solid-js";
import { hookForDev } from "../../../lib/devTools";
import { nip05Verification, userName } from "../../../stores/profile";
import { unknown } from "../../../translations";
import { PrimalUser } from "../../../types/primal";
import Avatar from "../../Avatar/Avatar";
import VerificationCheck from "../../VerificationCheck/VerificationCheck";
import styles from  "./MentionedUserLink.module.scss";

const MentionedUserLink: Component<{
  user: PrimalUser,
  openInNewTab?: boolean,
  id?: string,
}> = (props) => {

  const intl = useIntl();

  const LinkComponent: Component<{ children: JSXElement }> = (p) => {

    if (!props.user) {
      return <div
        id={props.id}
        class="linkish"
      >
        {p.children}
      </div>;
    }

    if (props.openInNewTab) {
      return <a
        id={props.id}
        class={styles.userMention}
        href={`/p/${props.user?.npub}`}
        target="_blank"
      >
        {p.children}
      </a>;
    }

    return <A
        id={props.id}
        class={styles.userMention}
        href={`/p/${props.user.npub}`}
      >
        {p.children}
      </A>;
  };

  const preview = () => <div class={styles.userPreview}>
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

  return (
    <LinkComponent>
      @{userName(props.user) || intl.formatMessage(unknown)}
    </LinkComponent>
  );
}

export default hookForDev(MentionedUserLink);
