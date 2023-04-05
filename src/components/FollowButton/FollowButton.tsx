import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { useAccountContext } from '../../contexts/AccountContext';
import { PrimalUser } from '../../types/primal';

import styles from './FollowButton.module.scss';


const FollowButton: Component<{ person: PrimalUser | undefined, large?: boolean }> = (props) => {

  const account = useAccountContext();
  const intl = useIntl();

  const isFollowed = () => {
    return props.person &&
      account?.publicKey &&
      account?.following.includes(props.person.pubkey);
  }

  const onFollow = (e: MouseEvent) => {
    e.preventDefault();
    if (!account || !props.person) {
      return;
    }

    const action = isFollowed() ?
      account.actions.removeFollow :
      account.actions.addFollow;

    action(props.person.pubkey);
  }

  const klass = () => {
    return `${isFollowed() ? styles.unfollow : styles.follow} ${props.large ? styles.large : styles.small}`;
  }

  return (
    <Show when={props.person}>
      <div class={klass()}>
        <button onClick={onFollow} >
          <Show
            when={isFollowed()}
            fallback={intl.formatMessage(
              {
                id: 'actions.follow',
                defaultMessage: 'follow',
                description: 'Follow button label',
              }
            )}
          >
            {intl.formatMessage(
              {
                id: 'actions.unfollow',
                defaultMessage: 'unfollow',
                description: 'Unfollow button label',
              }
            )}
          </Show>
        </button>
      </div>
    </Show>
  )
}

export default FollowButton;
