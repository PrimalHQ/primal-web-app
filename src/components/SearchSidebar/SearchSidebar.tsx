import { Component, createEffect, createSignal, For, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { getExploreFeed, getMostZapped4h, getTrending24h } from '../../lib/feed';
import { humanizeNumber } from '../../lib/stats';
import { convertToNotes, sortingPlan } from '../../stores/note';
import { Kind } from '../../constants';
import {
  isConnected,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from '../../sockets';
import {
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrMentionContent,
  PrimalNote,
  PrimalUser
} from '../../types/primal';

import styles from './SearchSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { hourNarrow } from '../../formats';
import { A } from '@solidjs/router';
import { hexToNpub } from '../../lib/keys';
import { truncateNpub } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import PeopleList from '../PeopleList/PeopleList';


const SearchSidebar: Component<{ users: PrimalUser[] }> = (props) => {

  const intl = useIntl();

  return (
    <>
      <PeopleList people={props.users} label={
        intl.formatMessage({
          id: 'search.sidebar.caption',
          defaultMessage: 'Users found',
          description: 'Caption for the search page sidebar showing a list of users',
        })}
      />
    </>
  );
}

export default SearchSidebar;
