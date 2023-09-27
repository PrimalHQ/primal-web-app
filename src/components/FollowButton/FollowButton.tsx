import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { account as t, actions } from '../../translations';
import { PrimalUser } from '../../types/primal';
import { useToastContext } from '../Toaster/Toaster';

import styles from './FollowButton.module.scss';


const FollowButton: Component<{
  person: PrimalUser | undefined,
  large?: boolean,
  id?: string,
  postAction?: (remove: boolean, pubkey: string) => void,
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
    if (!account || !account.hasPublicKey() || !props.person) {
      toast?.sendWarning(intl.formatMessage(t.needToLogin))
      return;
    }

    const action = isFollowed() ?
      account.actions.removeFollow :
      account.actions.addFollow;

    action(props.person.pubkey, props.postAction);
  }

  const klass = () => {
    return `${isFollowed() ? styles.unfollow : styles.follow} ${props.large ? styles.large : styles.small}`;
  }

  return (
    <Show when={props.person}>
      <div id={props.id} class={klass()}>
        <button onClick={onFollow} disabled={account?.followInProgress === props.person?.pubkey}>
          <Show
            when={isFollowed()}
            fallback={intl.formatMessage(t.follow)}
          >
            {intl.formatMessage(t.unfollow)}
          </Show>
        </button>
      </div>
    </Show>
  )
}

export default hookForDev(FollowButton);
