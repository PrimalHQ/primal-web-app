import styles from  "./VerificationCheck.module.scss";

import { Component, createEffect, createSignal, JSXElement, onMount, Show } from "solid-js";
import { PrimalUser } from "../../types/primal";
import { isAccountVerified } from "../../lib/profile";
import { hookForDev } from "../../lib/devTools";
import { userName } from "../../stores/profile";


const VerificationCheck: Component<{
  user: PrimalUser | undefined,
  large?: boolean,
  fallback?: JSXElement,
  id?: string,
}> = (props) => {

  const [isVerified, setIsVerified] = createSignal(false);

  const isVerifiedByPrimal = () => {
    const nip05 = props.user?.nip05;

    return isVerified() && nip05 && nip05.endsWith && nip05.endsWith('primal.net');
  }

  const checkVerification = () => {
    const nip05 = props.user?.nip05;

    if (!nip05) {
      setIsVerified(false);
      return;
    }

    isAccountVerified(nip05).then(profile => {
      if (profile) {
        setIsVerified(() => profile.pubkey === props.user?.pubkey);
        return;
      }

      setIsVerified(() => false);
    });
  }

  onMount(() => {
    checkVerification();
  })

  return (
    <Show
      when={isVerified()}
      fallback={props.fallback}
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
            <span class={styles.verifiedIconPrimal} />
          </Show>
        </div>
      </Show>
    </Show>
  )
}

export default hookForDev(VerificationCheck);
