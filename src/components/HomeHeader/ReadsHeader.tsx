import { Component, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Avatar from '../Avatar/Avatar';

import styles from './HomeHeader.module.scss';
import FeedSelect from '../FeedSelect/FeedSelect';
import { useAccountContext } from '../../contexts/AccountContext';
import SmallCallToAction from '../SmallCallToAction/SmallCallToAction';
import { useHomeContext } from '../../contexts/HomeContext';
import { useIntl } from '@cookbook/solid-intl';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { placeholders as t, actions as tActions, feedNewPosts } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import CreateAccountModal from '../CreateAccountModal/CreateAccountModal';
import LoginModal from '../LoginModal/LoginModal';
import { userName } from '../../stores/profile';
import { PrimalUser } from '../../types/primal';
import ReedSelect from '../FeedSelect/ReedSelect';

const ReadsHeader: Component< {
  id?: string,
  hasNewPosts: () => boolean,
  loadNewContent: () => void,
  newPostCount: () => number,
  newPostAuthors: PrimalUser[],
} > = (props) => {

  return (
    <div id={props.id} class={styles.fullHeader}>
      <div class={styles.bigFeedSelect}>
        <ReedSelect big={true} />
      </div>
    </div>
  );
}

export default hookForDev(ReadsHeader);
