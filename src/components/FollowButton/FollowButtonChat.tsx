import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { account as t } from '../../translations';
import { PrimalUser } from '../../types/primal';
import ButtonFlip from '../Buttons/ButtonFlip';

import styles from './FollowButton.module.scss';
import { accountStore, addFollow, hasPublicKey, removeFollow, showGetStarted } from '../../stores/accountStore';


const FollowButtonChat: Component<{
  person: PrimalUser | undefined,
  id?: string,
  postAction?: (remove: boolean, pubkey: string) => void,
}> = (props) => {
  const intl = useIntl();

  const isFollowed = () => {
    return props.person &&
      accountStore.publicKey &&
      accountStore.following.includes(props.person.pubkey);
  }

  const onFollow = (e: MouseEvent) => {
    e.preventDefault();
    if (accountStore.followInProgress !== '') return;

    if (hasPublicKey() || !props.person) {
      showGetStarted();
      return;
    }

    const action = isFollowed() ?
      removeFollow :
      addFollow;

    action(props.person.pubkey, props.postAction);
  }

  const klass = () => {
    return styles.small;
  }

  return (
    <Show when={props.person}>
      <div id={props.id} class={styles.followChat}>
        <ButtonFlip
          onClick={onFollow}
          disabled={accountStore.followInProgress !== ''}
          when={isFollowed()}
          fallback={intl.formatMessage(t.follow)}
        >
          {intl.formatMessage(t.unfollow)}
        </ButtonFlip>
      </div>
    </Show>
  )
}

export default hookForDev(FollowButtonChat);
