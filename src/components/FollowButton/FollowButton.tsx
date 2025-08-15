import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { account as t, actions } from '../../translations';
import { PrimalUser } from '../../types/primal';
import ButtonFlip from '../Buttons/ButtonFlip';
import { useToastContext } from '../Toaster/Toaster';

import styles from './FollowButton.module.scss';


const FollowButton: Component<{
  person: PrimalUser | undefined,
  large?: boolean,
  flexible?: boolean,
  id?: string,
  light?: boolean,
  thick?: boolean,
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
    if (account?.followInProgress !== '') return;

    if (!account || !account.hasPublicKey() || !props.person) {
      account?.actions.showGetStarted();
      // toast?.sendWarning(intl.formatMessage(t.needToLogin))
      return;
    }

    const action = isFollowed() ?
      account.actions.removeFollow :
      account.actions.addFollow;

    action(props.person.pubkey, props.postAction);
  }

  const klass = () => {
    if (props.large) return styles.large;
    if (props.flexible) return styles.flexible;
    if (props.thick) return styles.thick;
    return styles.small;
  }

  return (
    <Show when={props.person}>
      <div id={props.id} class={klass()}>
        <ButtonFlip
          onClick={onFollow}
          disabled={account?.followInProgress !== ''}
          when={isFollowed()}
          light={props.light}
          fallback={intl.formatMessage(t.follow)}
        >
          {intl.formatMessage(t.unfollow)}
        </ButtonFlip>
      </div>
    </Show>
  )
}

export default hookForDev(FollowButton);
