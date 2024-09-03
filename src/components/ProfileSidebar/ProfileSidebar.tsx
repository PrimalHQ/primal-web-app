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


const ProfileSidebar: Component<{
  notes: PrimalNote[] | undefined,
  articles: PrimalArticle[] | undefined,
  profile: PrimalUser | undefined,
  id?: string,
}> = (props) => {

  const profile = useProfileContext();
  const intl = useIntl();

  const topNotes = () => (props.articles || []).length > 0 ?
    (props.notes || []).slice(0, 5) : props.notes;

  return (
    <div id={props.id}>
      <Transition name='slide-fade' >
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
          <div>
            <div class={styles.headingTrending}>
              <div>
                {intl.formatMessage(t.sidebarCaptionReads)}
              </div>
            </div>

            <div class={styles.articles}>
              <For each={props.articles}>
                {(article) => <div class="animated"><ArticleShort article={article} shorter={true} /></div>}
              </For>
            </div>
          </div>
        </Show>
      </Transition>

      <Transition name='slide-fade' >
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
          <div>
            <div class={styles.headingTrending}>
              <div>
                {intl.formatMessage(t.sidebarCaptionNotes)}
              </div>
            </div>

            <For each={topNotes()}>
              {(note) => <div class="animated"><SmallNote note={note} /></div>}
            </For>
          </div>
        </Show>
      </Transition>
    </div>
  );
}

export default hookForDev(ProfileSidebar);
