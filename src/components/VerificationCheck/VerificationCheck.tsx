import styles from  "./VerificationCheck.module.scss";

import { Component, createSignal, Match, onMount, Show, Switch } from "solid-js";
import { PrimalUser } from "../../types/primal";
import { isAccountVerified } from "../../lib/profile";


const VerificationCheck: Component<{ user: PrimalUser | undefined }> = (props) => {

  const [isVerified, setIsVerified] = createSignal(true);

  const isVerifiedByPrimal = () => {
    return isVerified() &&
      props.user?.nip05.endsWith('primal.net');
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
    <Show when={isVerified()}>
      <Show
        when={isVerifiedByPrimal()}
        fallback={
          <div class={styles.verificationIcon}>
            <span class={styles.verifiedIcon} />
          </div>
        }
      >
        <div class={styles.verificationIcon}>
          <span class={styles.whiteCheck} />
          <span class={styles.verifiedIconPrimal} />
        </div>
      </Show>
    </Show>
  )
}

export default VerificationCheck;
