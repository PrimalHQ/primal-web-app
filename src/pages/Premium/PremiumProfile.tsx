import { Component } from 'solid-js';
import Avatar from '../../components/Avatar/Avatar';
import { userName } from '../../stores/profile';

import { PrimalUser } from '../../types/primal';

import styles from './Premium.module.scss';
import { PremiumStore } from './Premium';


const PremiumProfile: Component<{ data: PremiumStore, profile?: PrimalUser }> = (props) => {


  const displayName = () => {
    if (props.data.name.length > 0) return props.data.name;

    return userName(props.profile);
  }

  return (
    <div class={styles.premiumProfile}>
      <Avatar
        user={props.profile}
        size="xl"
      />

      <div class={styles.userInfo}>
        <div>{displayName() || 'unknown'}</div>
        <div class={props.data.productGroup === 'pro' ? styles.proCheck : styles.purpleCheck}></div>
      </div>
    </div>
  );
}

export default PremiumProfile;
