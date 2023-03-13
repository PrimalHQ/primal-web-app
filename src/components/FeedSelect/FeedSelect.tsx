import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { FeedOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';

import styles from './FeedSelect.module.scss';

const FeedSelect: Component = () => {

  const context = useFeedContext();

  const selectFeed = (option: FeedOption) => {
    const hex = option.value;
    const selector = document.getElementById('defocus');

    selector?.focus();

    if (hex) {
      const profile = context?.data?.availableFeeds.find(p => p.hex === hex);

      if (hex !== initialValue()?.value) {
        context?.actions?.clearData();
        context?.actions?.selectFeed(profile);
      }
      return;
    }

  };

  const isSelected = (option: FeedOption) => {
    const selected = context?.data.selectedFeed;

    if (selected?.hex) {
      return selected.hex === option.value;
    }

    return false;
  }

  const options:() => FeedOption[] = () => {
    if (context?.data === undefined) {
     return [];
    }

    return context.data.availableFeeds.map(feed => {
      return ({
        label: feed.name,
        value: feed.hex,
      });
    });
  };

  const initialValue = () => {
    const selected = context?.data?.selectedFeed;

    if (!selected) {
      return {
        label: '',
        value: undefined,
      };
    }

    const feed = context?.data?.availableFeeds.find(f =>
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
    />
  );
}

export default FeedSelect;
