import { batch, Component, createEffect, createSignal, For, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js'

import styles from './ReadsMy.module.scss'
import Wormhole from '../components/Wormhole/Wormhole';
import CheckBox2 from '../components/Checkbox/CheckBox2';
import ReadsEditorEditor from '../components/ReadsEditor/ReadsEditorEditor';
import { PrimalArticle, PrimalNote, PrimalUser } from '../types/primal';
import { createStore, unwrap } from 'solid-js/store';
import { referencesToTags } from '../stores/note';
import { useAccountContext } from '../contexts/AccountContext';
import { Kind, wordsPerMinute } from '../constants';
import { nip19 } from '../lib/nTools';
import ArticlePreview from '../components/ArticlePreview/ArticlePreview';
import ArticlePreviewPhone from '../components/ArticlePreview/ArticlePreviewPhone';
import ArticleShort from '../components/ArticlePreview/ArticleShort';
import ReadsEditorPreview from '../components/ReadsEditor/ReadsEditorPreview';
import { nip44 } from 'nostr-tools';
import { decrypt44, encrypt44 } from '../lib/nostrAPI';
import { NostrEvent, sendEvent } from '../lib/notes';
import { useToastContext } from '../components/Toaster/Toaster';
import { A, useNavigate, useParams } from '@solidjs/router';
import ReadsHeader from '../components/HomeHeader/ReadsHeader';
import ReadsSidebar from '../components/HomeSidebar/ReadsSidebar';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { branding, readsMy } from '../translations';
import { isPhone } from '../utils';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../components/Search/Search';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import { Tabs } from '@kobalte/core/tabs';
import { useProfileContext } from '../contexts/ProfileContext';
import { TransitionGroup } from 'solid-transition-group';
import ArticlePreviewSkeleton from '../components/Skeleton/ArticlePreviewSkeleton';
import Paginator from '../components/Paginator/Paginator';
import ArticleOverview from '../components/ArticlePreview/ArticleOverview';
import ArticleOverviewSkeleton from '../components/Skeleton/ArticleOverviewSkeleton';
import { ArticlesStats, fetchArticlesStats, fetchTopArticle } from '../handleFeeds';
import { APP_ID } from '../App';
import { shortDate } from '../lib/dates';
import { useAppContext } from '../contexts/AppContext';


const ReadsMy: Component = () => {
  const account = useAccountContext();
  const profile = useProfileContext();
  const toast = useToastContext();
  const app = useAppContext();
  const intl = useIntl();
  const navigate = useNavigate();
  const params = useParams();

  const [activeTab, setActiveTab] = createSignal('');
  const [articleStats, setArticleStats] = createSignal<ArticlesStats>({
    articles: 0,
    drafts: 0,
    satszapped: 0,
  });

  const [topZappedArticle, setTopZappedArticle] = createSignal<PrimalArticle>();
  const [topEngagedArticle, setTopEngagedArticle] = createSignal<PrimalArticle>();

  onMount(() => {
    profile?.actions.clearNotes();
    profile?.actions.clearArticles();
    profile?.actions.clearGallery();
    profile?.actions.clearZaps();
    profile?.actions.clearReplies();
    // updateTabContent('published');
    getCounts()
    getTopArticles();
  });

  const getTopArticles = async () => {
    const pubkey = account?.publicKey;
    if (!pubkey) return;

    const topZapped = await fetchTopArticle(pubkey, 'satszapped', `top_zapped_${APP_ID}`);
    const topEngaged = await fetchTopArticle(pubkey, 'interactions', `top_engaged_${APP_ID}`);

    setTopZappedArticle(() => ({ ...topZapped }));
    setTopEngagedArticle(() => ({ ...topEngaged }));
  };

  const getCounts = async () => {
    const pubkey = account?.publicKey;
    if (!pubkey) return;
    const stats = await fetchArticlesStats(pubkey, `article_stats_${APP_ID}`)

    setArticleStats(() => ({ ...stats }));
  }

  const hash = () => {
    return (location.hash.length > 1) ? location.hash.substring(1) : '';
  }

  const onChangeTab = (value: string) => {
    navigate(`/myarticles/${value}`)
    // setActiveTab(() => value);

    updateTabContent(value);
  };

  onMount(() => {
    const value = params.tab || 'published';

    updateTabContent(value);
  });

  const updateTabContent = (value: string) => {
    if (!profile || !account) return;

    switch(value) {
      case 'published':
        profile.actions.clearArticles();
        profile.actions.getProfileMegaFeed(account.publicKey, 'reads', 0, 20, 0, 0);
        break;
        case 'drafts':
        profile.actions.clearDrafts();
        profile.actions.getProfileMegaFeed(account.publicKey, 'drafts', 0, 20, 0, 0);
        break;
    }
  }

  const processedDrafts = () => {
    if (!account || !account.activeUser || !account.publicKey) return [];

    const drafts = profile?.drafts || [];

    let processed: PrimalArticle[] = [];

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];

      const cont = (JSON.parse(draft.plain) || '{}');

      const tgs: string[][] = (cont.tags || []);

      const article: PrimalArticle = {
        id: draft.id || '',
        title: (tgs.find(t => t[0] === 'title') || ['title', ''])[1],
        summary: (tgs.find(t => t[0] === 'summary') || ['summary', ''])[1],
        image: (tgs.find(t => t[0] === 'image') || ['image', ''])[1],
        tags: tgs.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1]),
        published: 0,
        content: cont.content || '',
        user: account.activeUser,
        topZaps: [],
        pubkey: account.publicKey,
        noteId: `ndraft1${draft.id || 'none'}`,
        naddr: `ndraft1${draft.id || 'none'}`,
        coordinate: '',
        wordCount: Math.floor((cont.content || '').split(' ').length / wordsPerMinute),
        noteActions: {
          event_id: cont.id || '',
          liked: false,
          replied: false,
          reposted: false,
          zapped: false,
        },
        bookmarks: 0,
        likes: 0,
        mentions: 0,
        reposts: 0,
        replies: 0,
        zaps: 0,
        score: 0,
        score24h: 0,
        satszapped: 0,
        client: draft.client,
        relayHints: {},
        msg: { ...draft.msg },
      }

      processed.push(article)
    }

    return processed;
  }


  const articleUrl = (art: PrimalArticle) => {
    const vanityName = app?.verifiedUsers[art.pubkey];

    if (!vanityName) return `/a/${art.naddr}`;

    const decoded = nip19.decode(art.naddr);

    const data = decoded.data as nip19.AddressPointer;

    return `/${vanityName}/${data.identifier}`;
  }

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = account?.activeUser?.picture || '';

    image.onerror = "";
    image.src = src;
    return true;
  };

  return (
    <div class={styles.readsMyPage}>
      <PageTitle title={intl.formatMessage(readsMy.pageCaption)} />

      <Wormhole
        to="search_section"
      >
        <Show when={!isPhone()}>
          <Search />
        </Show>
      </Wormhole>

      <PageCaption>
        <div class={styles.pageHeader}>
          <div>
            {intl.formatMessage(readsMy.pageCaption)}
          </div>
          <ButtonPrimary
            onClick={() => navigate('/reads/edit')}
          >
            New Article
          </ButtonPrimary>
        </div>
      </PageCaption>

      <Show when={!isPhone()}>
        <StickySidebar>
          <div class={styles.sidebarSection}>
            <Show when={articleStats().satszapped > 0}>
              <div class={styles.sidebarGroup}>
                <div class={styles.caption}>
                  Total Zaps
                </div>
                <div class={styles.totalZaps}>
                  <div class={styles.zapIcon}></div>
                  <div class={styles.zapAmount}>
                    <div class={styles.zapNumber}>
                      {articleStats().satszapped.toLocaleString()}
                    </div>
                    <div class={styles.sats}>sats</div>
                  </div>
                </div>
              </div>
            </Show>

            <Show when={topZappedArticle()}>
              <div class={styles.sidebarGroup}>
                <div class={styles.caption}>
                  Top article by zaps
                </div>
                <div class={styles.topArticle} onClick={() => navigate(articleUrl(topZappedArticle()!))}>
                  <div class={styles.info}>
                    <div class={styles.title}>
                      {topZappedArticle()?.title}
                    </div>
                    <div class={styles.footer}>
                      <div class={styles.date}>
                        {shortDate(topZappedArticle()?.published)}
                      </div>
                      <div class={styles.dot}>•</div>
                      <div class={styles.stat}>
                        <div class={styles.number}>
                          {topZappedArticle()?.satszapped.toLocaleString()}
                        </div>
                        <div class={styles.unit}>Sats</div>
                      </div>
                    </div>
                  </div>
                  <div class={styles.image}>
                    <img src={topZappedArticle()?.image} onerror={onImageError}/>
                  </div>
                </div>
              </div>
            </Show>

            <Show when={topEngagedArticle()}>
              <div class={styles.sidebarGroup}>
                <div class={styles.caption}>
                  Top article by engagement
                </div>

                <div class={styles.topArticle} onClick={() => navigate(articleUrl(topEngagedArticle()!))}>
                  <div class={styles.info}>
                    <div class={styles.title}>
                      {topEngagedArticle()?.title}
                    </div>
                    <div class={styles.footer}>
                      <div class={styles.date}>
                        {shortDate(topEngagedArticle()?.published)}
                      </div>
                      <div class={styles.dot}>•</div>
                      <div class={styles.stat}>
                        <div class={styles.number}>
                          {topEngagedArticle()?.replies.toLocaleString()}
                        </div>
                        <div class={styles.unit}>Comments</div>
                      </div>
                    </div>
                  </div>
                  <div class={styles.image}>
                    <img src={topEngagedArticle()?.image} onerror={onImageError} />
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </StickySidebar>
      </Show>

      <div class={styles.pageContent}>
        <Tabs value={params.tab || 'published'} onChange={onChangeTab}>
          <Tabs.List class={styles.profileTabs}>
            <Tabs.Trigger class={styles.profileTab} value="published">
              Published ({articleStats().articles})
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.profileTab} value="drafts">
              Drafts ({articleStats().drafts})
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.profileTabIndicator} />
          </Tabs.List>


          <Tabs.Content class={styles.tabContent} value="published">
            <div class={styles.profileNotes}>

              <TransitionGroup name="slide-fade">
                <div>
                  <Show when={profile && profile.isFetching && profile.articles.length === 0}>
                    <div>
                      <For each={new Array(10)}>
                        {() => <ArticleOverviewSkeleton />}
                      </For>
                    </div>
                  </Show>
                </div>

                <div>
                  <Show when={profile && profile.articles.length === 0 && !profile.isFetching}>
                    <div class={styles.noPublished}>
                      <div class={styles.caption}>
                        {intl.formatMessage(readsMy.noPublishedArticle)}
                      </div>
                      <a href={'/reads/edit'}>Create your first article now!</a>
                    </div>
                  </Show>
                </div>

                <Show when={profile && profile.articles.length > 0}>
                  <div>
                    <For each={profile?.articles}>
                      {article => (
                        <div class="animated">
                          <ArticleOverview
                            article={article}
                            onRemove={(id: string) => {
                              profile?.actions.removeEvent(id, 'articles');
                              setArticleStats((a) => ({
                                ...a,
                                atricles: a.articles - 1,
                              }));
                            }}
                          />
                        </div>
                      )}
                    </For>
                    <Paginator
                      loadNextPage={() => {
                        profile?.actions.getProfileMegaFeedNextPage(account?.publicKey, 'reads');
                      }}
                      isSmall={true}
                    />
                  </div>
                </Show>
              </TransitionGroup>
            </div>
          </Tabs.Content>


          <Tabs.Content class={styles.tabContent} value="drafts">
            <div class={styles.profileNotes}>

              <TransitionGroup name="slide-fade">
                <div>
                  <Show when={profile && profile.isFetchingDrafts && profile.drafts.length === 0}>
                    <div>
                      <For each={new Array(10)}>
                        {() => <ArticleOverviewSkeleton />}
                      </For>
                    </div>
                  </Show>
                </div>

                <div>
                  <Show when={profile && profile.drafts.length === 0 && !profile.isFetchingDrafts}>
                    <div class={styles.noPublished}>
                      <div class={styles.caption}>
                        {intl.formatMessage(readsMy.noDrafts)}
                      </div>
                      <a href={'/reads/edit'}>Start drafting a new article now!</a>
                    </div>
                  </Show>
                </div>

                <Show when={profile && profile.drafts.length > 0}>
                  <div>
                    <For each={processedDrafts()}>
                      {article => (
                        <div class="animated">
                          <ArticleOverview
                            article={article}
                            hideStats={true}
                            isDraft={true}
                            onRemove={(id: string) => {
                              profile?.actions.removeEvent(id, 'drafts');
                              setArticleStats((a) => ({
                                ...a,
                                drafts: a.drafts - 1,
                              }));
                            }}
                          />
                        </div>
                      )}
                    </For>
                    <Paginator
                      loadNextPage={() => {
                        profile?.actions.getProfileMegaFeedNextPage(account?.publicKey, 'drafts');
                      }}
                      isSmall={true}
                    />
                  </div>
                </Show>
              </TransitionGroup>
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </div>
  )
}

export default ReadsMy;
