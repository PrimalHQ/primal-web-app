import { Component, createEffect, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import {
  EventCoordinate,
  PrimalArticle,
  PrimalUser,
  SelectionOption
} from '../../types/primal';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import SelectionBox from '../SelectionBox/SelectionBox';
import Loader from '../Loader/Loader';
import { readHomeSidebarSelection, saveHomeSidebarSelection } from '../../lib/localStore';
import { useHomeContext } from '../../contexts/HomeContext';
import { useReadsContext } from '../../contexts/ReadsContext';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { getArticleThread, getReadsTopics, getUserArticleFeed } from '../../lib/feed';
import { fetchUserArticles } from '../../handleNotes';
import { getParametrizedEvent, getParametrizedEvents } from '../../lib/notes';
import { decodeIdentifier } from '../../lib/keys';
import ArticleShort from '../ArticlePreview/ArticleShort';
import { userName } from '../../stores/profile';
import { useIntl } from '@cookbook/solid-intl';
import { getRandomIntegers } from '../../utils';
import ArticleTotalZapsSkeleton from '../Skeleton/ArticleTotalZapsSkeleton';
import ArticlePreviewSidebarSkeleton from '../Skeleton/ArticlePreviewSidebarSkeleton';
import { Transition, TransitionGroup } from 'solid-transition-group';
import { useAppContext } from '../../contexts/AppContext';


const ArticleSidebar: Component< { id?: string, user: PrimalUser, article: PrimalArticle }  > = (props) => {

  const intl = useIntl();
  const account = useAccountContext();

  const [recomended, setRecomended] = createStore<PrimalArticle[]>([]);

  const [isFetchingArticles, setIsFetchingArticles] = createSignal(false);

  const getArticles = async () => {
    const subId = `article_recomended_${APP_ID}`;

    setIsFetchingArticles(() => true);

    const articles = await fetchUserArticles(account?.publicKey, props.user.pubkey, 'authored', subId);

    const recs = articles.filter(a => a.id !== props.article.id);
    const indicies = getRandomIntegers(0, recs.length, 3);

    setRecomended(() => indicies.map(i => recs[i]).sort((a, b) => b.published - a.published));

    setIsFetchingArticles(() => false);
  }

  createEffect(on(() => props.article?.naddr,() => {
    if (account?.isKeyLookupDone && props.user) {
      getArticles();
    }
  }));

  return (
    <div id={props.id} class={styles.articleSidebar}>
      <TransitionGroup name="slide-fade">
        <Show
          when={account?.isKeyLookupDone && props.article}
          fallback={
            <>
              <div class={styles.section}>
                <ArticleTotalZapsSkeleton />
              </div>

              <div class={styles.section}>
                <ArticlePreviewSidebarSkeleton />
                <ArticlePreviewSidebarSkeleton />
                <ArticlePreviewSidebarSkeleton />
              </div>
            </>
          }
        >
            <Show
              when={recomended.length > 0}
            >
              <div>
                <Show when={props.article.satszapped > 0}>
                  <div class={`${styles.headingPicks} animated`}>
                    Total zaps
                  </div>

                  <div class={`${styles.section} animated`}>
                    <div class={styles.totalZaps}>
                      <span class={styles.totalZapsIcon} />
                      <span class={styles.amount}>{intl.formatNumber(props.article.satszapped)}</span>
                      <span class={styles.unit}>sats</span>
                    </div>
                  </div>
                </Show>
                <Show
                  when={!isFetchingArticles()}
                >
                  <div class={`${styles.headingReads} animated`}>
                    More Reads from {userName(props.article.user)}
                  </div>

                  <div class={`${styles.section} animated`}>
                    <For each={recomended}>
                      {(note) => <ArticleShort article={note} short={true}/>}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

        </Show>
      </TransitionGroup>
    </div>
  );
}

export default hookForDev(ArticleSidebar);
