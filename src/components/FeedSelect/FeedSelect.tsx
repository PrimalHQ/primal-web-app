import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { FeedOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';

import styles from './FeedSelect.module.scss';

const FeedSelect: Component = () => {

  const context = useFeedContext();

  const selectFeed = (option: FeedOption) => {
    const hex = option.value;
    const profile = context?.data?.availableFeeds.find(p => p.hex === hex);

    if (hex !== initialValue().value) {
      context?.actions?.clearData();
      context?.actions?.selectFeed(profile);
    }
  };

  const isSelected = (option: FeedOption) => {
    const selected = context?.data.selectedFeed;

    return selected?.hex === option.value;
  }

  const options:() => FeedOption[] = () => {
    if (context?.data === undefined) {
     return [];
    }

    return context.data.availableFeeds.map(feed => ({
      label: feed.name,
      value: feed.hex,
    }));
  };

  const initialValue = () => {
    const feed = context?.data?.availableFeeds.find(f => f.hex === context?.data?.selectedFeed?.hex);

    return {
      label: feed?.name,
      value: feed?.hex,
    };
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
