import { Component, createSignal, Show } from 'solid-js';
import styles from './SaveFeedDialog.module.scss';
import { TextField } from '@kobalte/core/text-field';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { PrimalArticleFeed } from '../../types/primal';


const SaveFeedDialog: Component<{
  open: boolean,
  setOpen?: (flag: boolean) => void,
  query?: string,
  feedType: 'home' | 'reads',
}> = (props) => {
  const settings = useSettingsContext();

  const [feedName, setFeedName] = createSignal('Seach results');
  const [feedDescription, setFeedDescription] = createSignal('Primal Saved Search');

  const generateFeedDefinition = () => {

    const spec = JSON.stringify({
        id: 'advsearch',
        query: props.query || '',
      });

    const feed: PrimalArticleFeed = {
      name: feedName(),
      description: feedDescription(),
      spec,
      enabled: true,
      feedkind: 'search',
    };

    return feed;
  }

  const isFeedAdded = () => {
    const feed = generateFeedDefinition();
    const feedtype = props.feedType;

    if (!feed) return false;

    return settings?.actions.isFeedAdded(feed, feedtype);
  }

  const toggleFeed = (open: boolean) => {
    if (!open) {
      props.setOpen && props.setOpen(false);
      return;
    }

    const feed = generateFeedDefinition();

    if (!feed) return;

    const isAlreadyAdded = settings?.actions.isFeedAdded(feed, props.feedType)

    if (isAlreadyAdded) {
      settings?.actions.removeFeed(feed, props.feedType);
      return;
    }

    props.setOpen && props.setOpen(true);

  };

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={toggleFeed}
      triggerClass={styles.addToFeed}
      triggerContent={
        <Show
          when={isFeedAdded()}
          fallback={<>
            <div class={styles.addIcon}></div>
            <div>
              Add this search to my {props.feedType} feeds
            </div>
          </>}
        >
          Remove this search from my {props.feedType} feeds
        </Show>
      }
      title={<div class={styles.addToFeedDialogTitle}>
        Save to <span>{props.feedType}</span> Feeds
      </div>}
    >
      <div class={styles.addToFeedDialogContent}>
        <div class={styles.form}>
          <TextField class={styles.searchCommand} value={feedName()} onChange={setFeedName}>
            <TextField.Label>Feed name:</TextField.Label>
            <TextField.Input />
          </TextField>

          <TextField class={styles.searchCommand} value={feedDescription()} onChange={setFeedDescription}>
            <TextField.Label>Feed description</TextField.Label>
            <TextField.Input />
          </TextField>
        </div>
        <div class={styles.footer}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPremium
            onClick={() => {
              settings?.actions.addFeed(generateFeedDefinition(), props.feedType);
              props.setOpen && props.setOpen(false);
            }}
          >
            Save
          </ButtonPremium>
        </div>
      </div>
    </AdvancedSearchDialog>

  )
}

export default SaveFeedDialog;
