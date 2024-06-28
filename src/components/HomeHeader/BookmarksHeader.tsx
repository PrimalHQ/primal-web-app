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
import { useReadsContext } from '../../contexts/ReadsContext';
import BookmarksSelect from '../FeedSelect/BookmarksSelect';

const BookmarksHeader: Component< {
  id?: string,
  kind: string,
  onSelect: (kind: string) => void,
} > = (props) => {

  return (
    <div id={props.id}>
      <div class={`${styles.bigFeedSelect} ${styles.readsFeed}`}>
        <BookmarksSelect big={true} initial={props.kind} selected={props.kind} onSelect={props.onSelect} />
      </div>
    </div>
  );
}

export default hookForDev(BookmarksHeader);
