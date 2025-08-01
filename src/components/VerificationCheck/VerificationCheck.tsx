import styles from  "./VerificationCheck.module.scss";

import { Component, createEffect, createSignal, JSXElement, Match, onMount, Show, Switch } from "solid-js";
import { PrimalUser } from "../../types/primal";
import { isAccountVerified } from "../../lib/profile";
import { hookForDev } from "../../lib/devTools";
import { userName } from "../../stores/profile";
import { LegendCustomizationConfig } from "../../lib/premium";
import { useAppContext } from "../../contexts/AppContext";


const VerificationCheck: Component<{
  user: PrimalUser | undefined,
  large?: boolean,
  fallback?: JSXElement,
  id?: string,
  legendConfig?: LegendCustomizationConfig,
  mock?: boolean,
  inline?: boolean,
}> = (props) => {
  const app = useAppContext();

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

  const legendConfig = () => {
    const pubkey = props.user?.pubkey;

    if (!pubkey) return undefined;

    return props.legendConfig || app?.legendCustomization[pubkey];
  }

  const primalCheckKlass = () => {
    let klass = styles.verifiedIconPrimal;
    const lc = legendConfig();

    if (lc?.custom_badge) {
      const style = lc.style;

      if (style !== '') {
        klass += ` ${styles[`legend_${style}`]}`
      }
    }

    return klass;
  }

  const isLegend = () => legendConfig() !== undefined;

  onMount(() => {
    checkVerification();
  })

  return (
    <Switch fallback={props.fallback}>
      <Match when={isVerified() || isLegend()}>
        <div
          id={props.id}
          data-user={props.user?.pubkey}
          class={`${props.large ? styles.verificationIconL : styles.verificationIcon} ${props.inline ? styles.inline : ''}`}
        >
          <Show
            when={isVerifiedByPrimal() || isLegend()}
            fallback={
              <span class={styles.verifiedIcon} />
            }
          >
            <div class={primalCheckKlass()}>
              <div class={styles.checkIcon}></div>
            </div>
          </Show>
        </div>
      </Match>
      <Match when={props.mock}>
        <div
          id={props.id}
          data-user={props.user?.pubkey}
          class={`${props.large ? styles.verificationIconL : styles.verificationIcon}`}
        >
          <div class={primalCheckKlass()}>
            <div class={styles.checkIcon}></div>
          </div>
        </div>
      </Match>

    </Switch>
  )
}

export default hookForDev(VerificationCheck);
