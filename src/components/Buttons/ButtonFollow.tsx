import { useIntl } from '@cookbook/solid-intl';
import { Button } from '@kobalte/core';
import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { account as t, actions } from '../../translations';
import { PrimalUser } from '../../types/primal';
import { useToastContext } from '../Toaster/Toaster';

import styles from './Buttons.module.scss';


const ButtonFollow: Component<{
  person: PrimalUser | undefined,
  id?: string,
  onFollow?: (person: PrimalUser | undefined) => void,
  then?: (remove: boolean, pubkey: string) => void,
}> = (props) => {

  const toast = useToastContext()
  const account = useAccountContext();
  const intl = useIntl();

  const isFollowed = () => {
    return props.person &&
      account?.publicKey &&
      account?.following.includes(props.person.pubkey);
  }

  const onFollow = (e: MouseEvent) => {
    e.preventDefault();
    if (props.onFollow) {
      props.onFollow(props.person);
      return
    }


    if (!account || !account.hasPublicKey() || !props.person) {
      account?.actions.showGetStarted();
      // toast?.sendWarning(intl.formatMessage(t.needToLogin))
      return;
    }

    const action = isFollowed() ?
      account.actions.removeFollow :
      account.actions.addFollow;

    action(props.person.pubkey, props.then);
  }

  const klass = () => {
    return isFollowed() ? styles.unfollow : styles.follow;
  }

  return (
    <Show when={props.person}>
      <Button.Root
        id={props.id}
        class={klass()}
        onClick={onFollow}
        disabled={account?.followInProgress === props.person?.pubkey}
      >
        <Show
          when={isFollowed()}
          fallback={intl.formatMessage(t.follow)}
        >
          {intl.formatMessage(t.unfollow)}
        </Show>
      </Button.Root>
    </Show>
  )
}

export default hookForDev(ButtonFollow);
