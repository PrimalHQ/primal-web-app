import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';

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
import { fetchArticles, fetchRecomendedArticles } from '../../handleNotes';
import { getParametrizedEvent, getParametrizedEvents } from '../../lib/notes';
import { decodeIdentifier } from '../../lib/keys';
import ArticleShort from '../ArticlePreview/ArticleShort';
import { userName } from '../../stores/profile';


const ArticleSidebar: Component< { id?: string, user: PrimalUser, article: PrimalArticle }  > = (props) => {

  const account = useAccountContext();

  const [recomended, setRecomended] = createStore<PrimalArticle[]>([]);

  const [isFetchingArticles, setIsFetchingArticles] = createSignal(false);

  const getArticles = async () => {
    const subId = `article_recomended_${APP_ID}`;

    setIsFetchingArticles(() => true);

    const articles = await fetchRecomendedArticles(account?.publicKey, props.user.pubkey, 'authored', subId);
    setRecomended(() => [...articles.filter(a => a.id !== props.article.id)]);

    setIsFetchingArticles(() => false);
  }

  createEffect(() => {
    if (account?.isKeyLookupDone && props.user) {
      getArticles();
    }
  });

  return (
    <div id={props.id} class={styles.articleSidebar}>
      <Show when={account?.isKeyLookupDone && props.article}>
        <div class={styles.headingPicks}>
          Total zaps
        </div>

        <div class={styles.section}>
          <div class={styles.totalZaps}>
            <span class={styles.totalZapsIcon} />
            <span class={styles.amount}>26,450</span>
            <span class={styles.unit}>sats</span>
          </div>
        </div>

        <div class={styles.headingReads}>
          More Reads from {userName(props.article.user)}
        </div>

        <Show
          when={!isFetchingArticles()}
          fallback={
            <Loader />
          }
        >
          <div class={styles.section}>
            <For each={recomended}>
              {(note) => <ArticleShort article={note} />}
            </For>
          </div>
        </Show>

      </Show>
    </div>
  );
}

export default hookForDev(ArticleSidebar);
