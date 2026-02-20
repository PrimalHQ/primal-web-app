import { useIntl } from '@cookbook/solid-intl';
import { Component, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { NostrUserContent, PrimalArticle, PrimalNote } from '../../types/primal';

import styles from './Events.module.scss';
import { Kind } from '../../constants';
import bookmarkIcon from '../../assets/icons/bookmark_filled.svg';
import Note from '../Note/Note';
import ArticlePreview from '../ArticlePreview/ArticlePreview';

export type ReactionEventType = {
  icon: string,
  rKind: number,
  note?: PrimalNote,
  read?: PrimalArticle,
  users?: Record<string, NostrUserContent>,
}

const BookmarkEvent: Component<{
  reactionEvent: ReactionEventType | undefined,
}> = (props) => {

  const intl = useIntl();

  return (
    <div class={styles.reactionEvent}>
      <Show
        when={props.reactionEvent}
        fallback={<div>Unknown Reaction</div>}
      >
        <div class={styles.icon}>
          <img src={bookmarkIcon} />
        </div>
        <Switch>
          <Match when={props.reactionEvent?.rKind === Kind.Text}>
            <Note
              note={props.reactionEvent?.note}
              shorten={true}
              hideFooter={true}
              hideContext={true}
            />
          </Match>

          <Match when={props.reactionEvent?.rKind === Kind.LongForm}>
            <ArticlePreview
              note={props.reactionEvent?.read}
              hideFooter={true}
              hideContext={true}
            />
          </Match>
        </Switch>
      </Show>
    </div>
  )
}

export default hookForDev(BookmarkEvent);
