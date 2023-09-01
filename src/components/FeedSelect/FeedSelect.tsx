import { Component } from 'solid-js';
import { useHomeContext } from '../../contexts/HomeContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { FeedOption } from '../../types/primal';
import SelectBox from '../SelectBox/SelectBox';

const FeedSelect: Component<{ isPhone?: boolean, id?: string}> = (props) => {

  const home = useHomeContext();
  const settings = useSettingsContext();

  const selectFeed = (option: FeedOption) => {
    const hex = option.value;
    const selector = document.getElementById('defocus');

    selector?.focus();
    selector?.blur();

    if (hex) {
      const feed = settings?.availableFeeds.find(p => p.hex === hex);

      if (hex !== initialValue()?.value) {
        home?.actions.clearNotes();
        home?.actions.selectFeed(feed);
      }
      return;
    }

  };

  const isSelected = (option: FeedOption) => {
    const selected = home?.selectedFeed;

    if (selected?.hex) {
      return selected.hex === option.value;
    }

    return false;
  }

  const options:() => FeedOption[] = () => {
    if (settings?.availableFeeds === undefined) {
     return [];
    }

    return settings.availableFeeds.map(feed => {
      return ({
        label: feed.name,
        value: feed.hex,
      });
    });
  };

  const initialValue = () => {
    const selected = home?.selectedFeed;

    if (!selected) {
      return {
        label: '',
        value: undefined,
      };
    }

    const feed = settings?.availableFeeds.find(f =>
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

export default hookForDev(FeedSelect);
