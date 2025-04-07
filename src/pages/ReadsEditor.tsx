import { batch, Component, createEffect, createSignal, For, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js'

import styles from './ReadsEditor.module.scss'
import Wormhole from '../components/Wormhole/Wormhole';
import CheckBox2 from '../components/Checkbox/CheckBox2';
import ReadsEditorEditor from '../components/ReadsEditor/ReadsEditorEditor';
import { NostrRelaySignedEvent, PrimalArticle, PrimalNote, PrimalUser } from '../types/primal';
import { createStore } from 'solid-js/store';
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
import { importEvents, NostrEvent, sendArticle, sendEvent, triggerImportEvents } from '../lib/notes';
import { useToastContext } from '../components/Toaster/Toaster';
import { useNavigate, useParams } from '@solidjs/router';
import { fetchArticles, fetchDrafts } from '../handleNotes';
import { APP_ID } from '../App';
import ReadsPublishDialog from '../components/ReadsMentionDialog/ReadsPublishDialog';
import { readSecFromStorage } from '../lib/localStore';
import { useIntl } from '@cookbook/solid-intl';
import { toast as tToast } from '../translations';
import { subsTo } from '../sockets';

export type EditorPreviewMode = 'editor' | 'browser' | 'phone' | 'feed';

export type ArticleEdit = {
  title: string,
  image: string,
  summary: string,
  content: string,
  tags: string[],
}

export const emptyArticleEdit = (): ArticleEdit => ({
  title: '',
  image: '',
  summary: '',
  content: '',
  tags: [],
});

export type ReadMentions = {
  users: Record<string, PrimalUser>,
  notes: Record<string, PrimalNote>,
  reads: Record<string, PrimalArticle>,
};

export const emptyReadsMentions = () => ({
  users: {},
  notes: {},
  reads: {},
})

export const [readMentions, setReadMentions] = createStore<ReadMentions>(emptyReadsMentions());

const ReadsEditor: Component = () => {
  const account = useAccountContext();
  const toast = useToastContext();
  const intl = useIntl();
  const params = useParams();
  const navigate = useNavigate();

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content', 'hero_image']);
  const [editorPreviewMode, setEditorPreviewMode] = createSignal<EditorPreviewMode>('editor');
  const [markdownContent, setMarkdownContent] = createSignal<string>('');
  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit());

  const [showPublishArticle, setShowPublishArticle] = createSignal(false);

  const generateIdentifier = () => article.title.toLowerCase().split(' ').join('-')

  const genereatePreviewArticle = (): PrimalArticle | undefined => {
    if (!account || !account.activeUser) return;

    const content = markdownContent();

    let relayHints = {}
    let tags: string[][] = referencesToTags(content, relayHints);;

    const relayTags = account.relays.map(r => {
      let t = ['r', r.url];

      const settings = account.relaySettings[r.url];
      if (settings && settings.read && !settings.write) {
        t = [...t, 'read'];
      }
      if (settings && !settings.read && settings.write) {
        t = [...t, 'write'];
      }

      return t;
    });

    tags = [...tags, ...relayTags];

    const now = Math.floor((new Date()).getTime() / 1_000);
    const pubkey = account.publicKey || '';
    const identifier = generateIdentifier();
    const coordinate = `${Kind.LongForm}:${account.publicKey}:${identifier}`;
    const naddr = nip19.naddrEncode({
      kind: Kind.LongForm,
      pubkey,
      identifier,
    });
    const id = 'preview_article';

    const previewArticle: PrimalArticle = {
      ...article,
      image: accordionSection().includes('hero_image') ? article.image : '',
      content,
      user: account.activeUser,
      published: now - 90,
      topZaps: [],
      id,
      pubkey,
      naddr,
      noteId: naddr,
      coordinate,
      wordCount: Math.ceil(content.split(' ').length / wordsPerMinute),
      noteActions: { event_id: id, liked: false, replied: false, reposted: false, zapped: false },
      likes: 0,
      mentions: 0,
      replies: 0,
      reposts: 0,
      bookmarks: 0,
      zaps: 0,
      score: 0,
      score24h: 0,
      satszapped: 0,
      msg: {
        kind: Kind.LongForm,
        content,
        id,
        pubkey,
        sig: 'signature',
        tags: [],
      },
      mentionedNotes: readMentions.notes,
      mentionedArticles: readMentions.reads,
      mentionedUsers: readMentions.users,
      // mentionedZaps: Record<string, PrimalZap>,
      // mentionedHighlights: Record<string, any>,
    };

    return previewArticle;
  }

  const onScroll = () => {
    const tb = document.getElementById('editor_toolbar') as HTMLDivElement | undefined;
    const md = document.getElementById('editor_metadata') as HTMLDivElement | undefined;

    if (!tb) return;

    const h = md ? md.getBoundingClientRect().height : 0;

    const isMetadataHidden = !accordionSection().includes('metadata');
    const isToolbarAtTheTop = window.scrollY > h;

    if (isMetadataHidden || isToolbarAtTheTop) {
      tb.classList.add('fixed_editor_toolbar');
    }
    else {
      tb.classList.remove('fixed_editor_toolbar');
    }
  }

  const loadArticle = async () => {
    const id = params.id;

    if (!id || !account?.publicKey) return;

    if (id.startsWith('naddr1')) {
      const reads = await fetchArticles([id], `reads_edit_${APP_ID}`);

      const r = reads[0];
      if(!r) return

      setArticle(() => ({
        title: r.title,
        image: r.image,
        summary: r.summary,
        content: r.content,
        tags: [ ...r.tags ],
      }));

      setMarkdownContent(r.content);

      return;
    }

    if (id.startsWith(`ndraft1`)) {
      const eid = id.split('ndraft1')[1];

      const events = await fetchDrafts(account?.publicKey, [eid], `drafts_edit+${APP_ID}`);

      let draft = events[0];

      if (!draft) return;

      const rJson = await decrypt44(account?.publicKey, draft.content);

      const r = JSON.parse(rJson);

      const tgs: string[][] = (r.tags || []);

      setArticle(() => ({
        title: (tgs.find(t => t[0] === 'title') || ['title', ''])[1],
        summary: (tgs.find(t => t[0] === 'summary') || ['summary', ''])[1],
        image: (tgs.find(t => t[0] === 'image') || ['image', ''])[1],
        tags: tgs.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1]),
        content: r.content || '',
      }));

      setMarkdownContent(r.content);

      return;
    }

  }



  const postArticle = async (promote: boolean) => {
    if (!account || !account.hasPublicKey()) {
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    if (!account.proxyThroughPrimal && account.relays.length === 0) {
      toast?.sendWarning(
        intl.formatMessage(tToast.noRelaysConnected),
      );
      return;
    }

    const content = markdownContent();

    let relayHints = {}
    let tags: string[][] = referencesToTags(content, relayHints);;

    const relayTags = account.relays.map(r => {
      let t = ['r', r.url];

      const settings = account.relaySettings[r.url];
      if (settings && settings.read && !settings.write) {
        t = [...t, 'read'];
      }
      if (settings && !settings.read && settings.write) {
        t = [...t, 'write'];
      }

      return t;
    });

    tags = [...tags, ...relayTags];

    let articleToPost = {
      ...article,
      content,
    };

    if (!accordionSection().includes('hero_image')) {
      articleToPost.image = '';
    }

    const { success, reasons, note } = await sendArticle(articleToPost, account.proxyThroughPrimal || false, account.activeRelays, tags, account.relaySettings);

    if (success && note) {

      const importId = `import_article_${APP_ID}`;

      const unsub = subsTo(importId, {
        onEose: () => {
          unsub();
          if (note) {
            toast?.sendSuccess(intl.formatMessage(tToast.publishNoteSuccess));
            setArticle(() => emptyArticleEdit());
            if (promote) {
              setTimeout(() => {
                quoteArticle(note);
              }, 1_000);
            }
            navigate('/reads/my');
          }
        }
      });

      importEvents([note], importId);

      return;
    }
  }

  const quoteArticle = (postedEvent: NostrRelaySignedEvent) => {
    if (!account) return;

    const naddr = nip19.naddrEncode({
        pubkey: postedEvent.pubkey,
        kind: postedEvent.kind,
        identifier: (postedEvent.tags.find(t => t[0] === 'd') || [])[1] || '',
      });

      account.actions.quoteNote(`nostr:${naddr}`);
      account.actions.showNewNoteForm();
  }

  onMount(() => {
    window.addEventListener('scroll', onScroll);
    loadArticle();
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return (
    <div class={styles.editorPage}>

      <Wormhole to='right_sidebar'>
        <div class={styles.sidebar}>
          <div class={styles.sidebarOptions}>
            <div class={styles.caption}>Options</div>
            <CheckBox2
              onChange={(checked: boolean) => {
                if (!checked) {
                  setAccordionSection((as) => as.filter(s => s !== 'metadata'));
                  return;
                }

                setAccordionSection((as) => [...as, 'metadata']);
              }}
              checked={accordionSection().includes('metadata')}
              label="Show article metadata"
            />
            <CheckBox2
              onChange={(checked: boolean) => {
                if (!checked) {
                  setAccordionSection((as) => as.filter(s => s !== 'hero_image'));
                  return;
                }

                setAccordionSection((as) => [...as, 'hero_image']);
              }}
              checked={accordionSection().includes('hero_image')}
              label="Use hero image"
            />
          </div>
          <div class={styles.sidebarTools}>
            <div class={styles.caption}>Edit & Preview</div>

            <button
              class={`${styles.toolButton} ${editorPreviewMode() === 'editor' ? styles.selected : ''}`}
              onClick={() => {
                setEditorPreviewMode('editor');
              }}
            >
              Edit Mode
            </button>

            <button
              class={`${styles.toolButton} ${editorPreviewMode() === 'browser' ? styles.selected : ''}`}
              onClick={() => {
                setEditorPreviewMode('browser');
              }}
            >
              Browser Preview
            </button>
            <button
              class={`${styles.toolButton} ${editorPreviewMode() === 'phone' ? styles.selected : ''}`}
              onClick={() => {
                setEditorPreviewMode('phone');
              }}
            >
              Phone Preview
            </button>
            <button
              class={`${styles.toolButton} ${editorPreviewMode() === 'feed' ? styles.selected : ''}`}
              onClick={() => {
                setEditorPreviewMode('feed');
              }}
            >
              Feed Preview
            </button>
          </div>
          <div class={styles.sidebarPublish}>
            <div class={styles.caption}>{'Save & Publish'}</div>
            <div class={styles.status}>
              Unsaved changes.
            </div>

            <button
              class={styles.toolButton}
              onClick={async () => {
                const pk = account?.publicKey;
                if (!pk || !account) return;
                const time = Math.floor((new Date()).getTime() / 1000);
                const a: NostrEvent = {
                  content: markdownContent(),
                  kind: Kind.LongForm,
                  tags: [
                    ["title", article.title],
                    ["summary", article.summary],
                    ["image", article.image],
                    ["t", article.tags.join(" ")],
                    ["d", generateIdentifier()],
                    ['client', 'primal-web'],
                  ],
                  created_at: time,
                };

                const e = await encrypt44(pk, JSON.stringify(a));
                // const d = await decrypt44(pk, e);

                const draft: NostrEvent = {
                  kind: Kind.Draft,
                  created_at: Math.floor((new Date()).getTime() / 1_000),
                  tags: [
                    ['d', generateIdentifier()],
                    ['k', `${Kind.LongForm}`],
                    ['client', 'primal-web'],
                    // ["e", "<anchor event event id>", "<relay-url>"],
                    // ["a", "<anchor event address>", "<relay-url>"],
                  ],
                  content: e,
                  // other fields
                }

                const { success, note } = await sendEvent(draft, account.activeRelays, account.relaySettings, account.proxyThroughPrimal);

                if (success && note) {
                  toast?.sendSuccess('Draft saved');
                  triggerImportEvents([note], `draft_import_${APP_ID}`)
                }
                else {
                  toast?.sendWarning('Draft saving failed');
                }
              }}
            >
              Save Draft Privately
            </button>

            <button
              class={styles.toolPrimaryButton}
              onClick={() => {setShowPublishArticle(true)}}
            >
              Continue to Publish Article
            </button>
          </div>
        </div>
      </Wormhole>

      <Switch>
        <Match when={editorPreviewMode() === 'editor'}>
          <ReadsEditorEditor
            accordionSection={accordionSection()}
            markdownContent={markdownContent()}
            setMarkdownContent={setMarkdownContent}
            article={article}
            setArticle={setArticle}
          />
        </Match>

        <Match when={editorPreviewMode() === 'browser'}>
          <div>
            <ReadsEditorPreview
              article={genereatePreviewArticle()}
            />
          </div>
        </Match>

        <Match when={editorPreviewMode() === 'phone'}>
          <div class={styles.phonePreview} >
            <ReadsEditorPreview
              article={genereatePreviewArticle()}
              isPhoneView={true}
            />
          </div>
        </Match>

        <Match when={editorPreviewMode() === 'feed'}>
          <div class={styles.feedPreview}>
            <div class={styles.caption}>
              Desktop Feed Preview
            </div>
            <ArticlePreview
              article={genereatePreviewArticle()}
            />

            <div class={styles.caption}>
              Phone Feed Preview
            </div>
            <div class={styles.phonePreview}>
              <ArticlePreviewPhone
                article={genereatePreviewArticle()}
                hideFooter={true}
                noBorder={true}
              />
            </div>


            <div class={styles.caption}>
              Sidebar Feed Preview
            </div>
            <div class={styles.sidebarPreview}>
              <ArticleShort
                article={genereatePreviewArticle()}
                noBorder={true}
              />
            </div>
          </div>
        </Match>
      </Switch>

      <ReadsPublishDialog
        article={genereatePreviewArticle()}
        articleEdit={article}
        open={showPublishArticle()}
        setOpen={setShowPublishArticle}
        onPublish={postArticle}
      />
    </div>
  )
}

export default ReadsEditor;
