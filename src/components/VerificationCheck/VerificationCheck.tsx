import styles from  "./VerificationCheck.module.scss";

import { Component, createSignal, onMount, Show } from "solid-js";
import { PrimalUser } from "../../types/primal";
import { isAccountVerified } from "../../lib/profile";
import { hookForDev } from "../../lib/devTools";


const VerificationCheck: Component<{
  user: PrimalUser | undefined,
  large?: boolean,
  id?: string,
}> = (props) => {

  const [isVerified, setIsVerified] = createSignal(true);

  const isVerifiedByPrimal = () => {
    const nip05 = props.user?.nip05;

    return isVerified() && nip05 && nip05.endsWith('primal.net');
  }

  const checkVerification = () => {
    const nip05 = props.user?.nip05;

    if (!nip05) {
      setIsVerified(false);
      return;
    }

    isAccountVerified(nip05).then(profile => {
      setIsVerified(profile && profile.pubkey === props.user?.pubkey);
    });
  }

  onMount(() => {
    checkVerification();
  })

  return (
    <Show
      when={isVerified()}
      fallback={<div class={styles.verificationFailed}></div>}
    >
      <Show
        when={props.large}
        fallback={
          <div id={props.id} data-user={props.user?.pubkey} class={styles.verificationIcon}>
          <Show
            when={isVerifiedByPrimal()}
            fallback={
              <span class={styles.verifiedIcon} />
            }
          >
            <span class={styles.whiteCheck} />
            <span class={styles.verifiedIconPrimal} />
          </Show>
        </div>
        }
      >
        <div id={props.id} data-user={props.user?.pubkey} class={styles.verificationIconL}>
          <Show
            when={isVerifiedByPrimal()}
            fallback={
              <span class={styles.verifiedIcon} />
            }
          >
            <span class={styles.whiteCheckL} />
            <span class={styles.verifiedIconPrimal} />
          </Show>
        </div>
      </Show>
    </Show>
  )
}

export default hookForDev(VerificationCheck);
