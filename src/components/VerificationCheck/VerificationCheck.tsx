import styles from  "./VerificationCheck.module.scss";

import { Component, createContext, JSX, Match, Switch, useContext } from "solid-js";
import { PrimalUser } from "../../types/primal";


const VerificationCheck: Component<{ user: PrimalUser | undefined }> = (props) => {


  const isVerifiedByPrimal = () => {
    return !!props.user?.nip05 &&
      props.user?.nip05.endsWith('primal.net');
  }

  const isVerified = () => {
    return !!props.user?.nip05 &&
      !props.user?.nip05.endsWith('primal.net');
  }

  return (
    <>
      <Switch>
        <Match when={isVerified()}>
          <div class={styles.verificationIcon}>
            <span class={styles.verifiedIcon} />
          </div>
        </Match>
        <Match when={isVerifiedByPrimal()}>
          <div class={styles.verificationIcon}>
            <span class={styles.whiteCheck} />
            <span class={styles.verifiedIconPrimal} />
          </div>
        </Match>
      </Switch>
    </>
  )
}

export default VerificationCheck;
