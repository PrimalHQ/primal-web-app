import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { useHomeContext } from '../../contexts/HomeContext';
import { FeedOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';

import styles from './FeedSelect.module.scss';

const FeedSelect: Component<{ isPhone?: boolean}> = (props) => {

  const context = useHomeContext();

  const selectFeed = (option: FeedOption) => {
    const hex = option.value;
    const selector = document.getElementById('defocus');

    selector?.focus();
    selector?.blur();

    if (hex) {
      const profile = context?.availableFeeds.find(p => p.hex === hex);

      if (hex !== initialValue()?.value) {
        context?.actions.clearNotes();
        context?.actions.selectFeed(profile);
      }
      return;
    }

  };

  const isSelected = (option: FeedOption) => {
    const selected = context?.selectedFeed;

    if (selected?.hex) {
      return selected.hex === option.value;
    }

    return false;
  }

  const options:() => FeedOption[] = () => {
    if (context?.availableFeeds === undefined) {
     return [];
    }

    return context.availableFeeds.map(feed => {
      return ({
        label: feed.name,
        value: feed.hex,
      });
    });
  };

  const initialValue = () => {
    const selected = context?.selectedFeed;

    if (!selected) {
      return {
        label: '',
        value: undefined,
      };
    }

    const feed = context?.availableFeeds.find(f =>
      f.hex === selected.hex
    );

    if (feed) {
      const [scope, timeframe] = feed.hex?.split(';') || [];

      const value = scope && timeframe ? `${scope};${timeframe}` : feed.hex;

      return {
        label: feed.name,
        value,
      };
    }
  }

  return (
    <SelectBox
      options={options}
      onChange={selectFeed}
      initialValue={initialValue()}
      isSelected={isSelected}
      isPhone={props.isPhone}
    />
  );
}

export default FeedSelect;
