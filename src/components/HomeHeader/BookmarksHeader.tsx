import { Component } from 'solid-js';

import styles from './HomeHeader.module.scss';
import { hookForDev } from '../../lib/devTools';
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
