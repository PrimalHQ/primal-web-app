import { batch, Component, createEffect, createSignal, For, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js'

import styles from './ReadsEditor.module.scss'
import Wormhole from '../components/Wormhole/Wormhole';
import CheckBox2 from '../components/Checkbox/CheckBox2';
import ReadsEditorEditor from '../components/ReadsEditor/ReadsEditorEditor';
import { PrimalArticle, PrimalNote, PrimalUser } from '../types/primal';
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
import { NostrEvent, sendEvent } from '../lib/notes';
import { useToastContext } from '../components/Toaster/Toaster';

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

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content', 'hero_image']);
  const [editorPreviewMode, setEditorPreviewMode] = createSignal<EditorPreviewMode>('editor');
  const [markdownContent, setMarkdownContent] = createSignal<string>('');
  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit());

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

    // console.log('PREVIEW: ', previewArticle.mentionedUsers)
    // console.log('STATE: ', readMentions.notes)

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

  onMount(() => {
    window.addEventListener('scroll', onScroll);
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

                const { success } = await sendEvent(draft, account.activeRelays, account.relaySettings, account.proxyThroughPrimal);

                if (success) {
                  toast?.sendSuccess('Draft saved');
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
              onClick={() => { }}
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
    </div>
  )
}

export default ReadsEditor;
