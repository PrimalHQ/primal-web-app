import { Component } from 'solid-js';
import Avatar from '../../components/Avatar/Avatar';
import { userName } from '../../stores/profile';

import { PrimalUser } from '../../types/primal';

import styles from './Premium.module.scss';


const PremiumProfile: Component<{ profile?: PrimalUser }> = (props) => {

  return (
    <div class={styles.premiumProfile}>
      <Avatar
        user={props.profile}
        size="xl"
      />

      <div class={styles.userInfo}>
        <div>{userName(props.profile) || 'unknown'}</div>
        <div class={styles.purpleCheck}></div>
      </div>
    </div>
  );
}

export default PremiumProfile;
