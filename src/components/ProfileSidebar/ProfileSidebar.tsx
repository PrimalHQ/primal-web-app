import { Component, For, Show } from 'solid-js';
import {
  PrimalArticle,
  PrimalNote,
  PrimalUser
} from '../../types/primal';

import styles from './ProfileSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { userName } from '../../stores/profile';
import { profile as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import ArticleShort from '../ArticlePreview/ArticleShort';
import { useProfileContext } from '../../contexts/ProfileContext';
import ArticlePreviewSidebarSkeleton from '../Skeleton/ArticlePreviewSidebarSkeleton';
import ShortNoteSkeleton from '../Skeleton/ShortNoteSkeleton';
import { Transition } from 'solid-transition-group';
import { Properties } from 'solid-js/web';
import { StreamingData } from '../../lib/streaming';
import { createStore } from 'solid-js/store';
import LivePill from '../LivePill/LivePill';
import LiveEventSidebarSkeleton from '../Skeleton/LiveEventSidebarSkeleton';


const ProfileSidebar: Component<{
  notes: PrimalNote[] | undefined,
  articles: PrimalArticle[] | undefined,
  profile: PrimalUser | undefined,
  stream: StreamingData,
  id?: string,
}> = (props) => {

  const profile = useProfileContext();
  const intl = useIntl();

  const topNotes = () => (props.articles || []).length > 0 ?
    (props.notes || []).slice(0, 5) : props.notes;

  const streams = () => props.stream ? [props.stream] : [];

  return (
    <div id={props.id} class="animated">

      <Show when={streams().length > 0}>
        <div class={styles.headingTrending}>
          <div>
            Live Now
          </div>
        </div>

        <div class={styles.articles}>
          <For each={streams()}>
            {liveEvent => (
              <Show
                when={props.profile}
                fallback={<LiveEventSidebarSkeleton />}
              >
                <LivePill
                  liveEvent={liveEvent}
                  liveAuthor={props.profile}
                />
              </Show>
            )}
          </For>
        </div>
      </Show>

        <Show
          when={props.articles && props.articles.length > 0}
          fallback={
            <Show when={profile?.isFetchingSidebarArticles}>
              <div class={styles.headingTrending}>
                <div>
                </div>
              </div>
              <div>
                <ArticlePreviewSidebarSkeleton />
                <ArticlePreviewSidebarSkeleton />
              </div>
            </Show>
          }
        >
          <div class="animated">
            <div class={styles.headingTrending}>
              <div>
                {intl.formatMessage(t.sidebarCaptionReads)}
              </div>
            </div>

            <div class={styles.articles}>
              <For each={props.articles}>
                {(article) => <ArticleShort article={article} shorter={true} />}
              </For>
            </div>
          </div>
        </Show>
        <Show
          when={props.notes && props.notes.length > 0}
          fallback={
            <Show when={profile?.isFetchingSidebarArticles}>
              <div class={styles.headingTrending}>
                <div>
                </div>
              </div>
              <div>
                <ShortNoteSkeleton />
                <ShortNoteSkeleton />
                <ShortNoteSkeleton />
                <ShortNoteSkeleton />
                <ShortNoteSkeleton />
              </div>
            </Show>
          }
        >
          <div class="animated">
            <div class={styles.headingTrending}>
              <div>
                {intl.formatMessage(t.sidebarCaptionNotes)}
              </div>
            </div>

            <For each={topNotes()}>
              {(note) => <SmallNote note={note} />}
            </For>
          </div>
        </Show>
    </div>
  );
}

export default hookForDev(ProfileSidebar);
