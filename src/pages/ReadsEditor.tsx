import { batch, Component, createEffect, createSignal, For, JSXElement, onCleanup, onMount, Show } from 'solid-js'

import styles from './ReadsEditor.module.scss'
import { createStore } from 'solid-js/store';
import { TextField } from '@kobalte/core/text-field';
import Uploader from '../components/Uploader/Uploader';
import { useAccountContext } from '../contexts/AccountContext';
import { useToastContext } from '../components/Toaster/Toaster';

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Gapcursor from '@tiptap/extension-gapcursor';

import { createTiptapEditor } from 'solid-tiptap';
import { Markdown } from 'tiptap-markdown';

import tippy, { Instance } from 'tippy.js';

import {
  toast as tToast,
  upload as tUpload,
  search as tSearch,
} from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import { readSecFromStorage } from '../lib/localStore';
import { Kind } from '../constants';
import { importEvents, sendArticle } from '../lib/notes';
import { subsTo } from '../sockets';
import { APP_ID } from '../App';
import { useNavigate } from '@solidjs/router';
import Wormhole from '../components/Wormhole/Wormhole';
import SearchOption from '../components/Search/SearchOption';
import { nip05Verification, userName } from '../stores/profile';
import Avatar from '../components/Avatar/Avatar';
import { useSearchContext } from '../contexts/SearchContext';
import { useProfileContext } from '../contexts/ProfileContext';
import { PrimalUser } from '../types/primal';
import { fetchRecomendedUsersAsync, fetchUserSearch } from '../lib/search';
import { nip19 } from '../lib/nTools';
import { getUsersRelayInfo } from '../lib/profile';
import { NProfileExtension } from '../markdownPlugins/nProfileMention';
import { referencesToTags } from '../stores/note';
import { NEventExtension } from '../markdownPlugins/nEventMention';
import { NAddrExtension } from '../markdownPlugins/nAddrMention';
import CheckBox2 from '../components/Checkbox/CheckBox2';
import ReadsEditorToolbar from '../components/ReadsEditor/ReadsEditorToolbar';
import { Fragment } from '@tiptap/pm/model';
import { createNodeFromContent } from '@tiptap/core';


export type ArticleEdit = {
  title: string,
  image: string,
  summary: string,
  content: string,
  tags: string[],
}

const emptyArticleEdit = (): ArticleEdit => ({
  title: '',
  image: '',
  summary: '',
  content: '',
  tags: [],
});

const titleImageUploadId = 'title_image';
const contentImageUploadId = 'content_image';

const ReadsEditor: Component = () => {
  const account = useAccountContext();
  const search = useSearchContext();
  const toast = useToastContext();
  const intl = useIntl();
  const navigate = useNavigate();
  const profile = useProfileContext();

  const [editorMarkdown, setEditorMarkdown] = createSignal(false);
  const [markdownContent, setMarkdownContent] = createSignal<string>('')

  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit())

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content', 'hero_image']);
  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [fileUploadContext, setFileUploadContext] = createSignal<string | undefined>();

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  let titleImageUpload: HTMLInputElement | undefined;


  // TIPTAP----------------------------------

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLTextAreaElement | undefined;

  let users: PrimalUser[] = [];
  let userRelays: Record<string, string[]> = {};

  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');

  const getUserRelays = async () => await (new Promise<Record<string, string[]>>(resolve => {
    const uids = Object.values(users).map(u => u.pubkey);
    const subId = `users_relays_${APP_ID}`;

    let relays: Record<string, string[]> = {};

    const unsub = subsTo(subId, {
      onEose: () => {
        unsub();
        resolve({ ...relays });
      },
      onEvent: (_, content) => {
        if (content.kind !== Kind.UserRelays) return;

        const pk = content.pubkey || 'UNKNOWN';

        let rels: string[] = [];

        for (let i = 0; i < (content.tags || []).length; i++) {
          if (rels.length > 1) break;

          const rel = content.tags[i];
          if (rel[0] !== 'r' || rels.includes(rel[1])) continue;

          rels.push(rel[1]);
        }

        relays[pk] = [...rels];
      },
      onNotice: () => resolve({}),
    })

    getUsersRelayInfo(uids, subId);
  }));

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
      }),
      Image,
      Markdown,
      Underline,
      NProfileExtension,
      NEventExtension,
      NAddrExtension,
      Table.configure({
        resizable: true,
      }),
      Gapcursor,
      TableRow,
      TableHeader,
      TableCell,
      BubbleMenu.configure({
        pluginKey: 'bubbleMenuOne',
        element: document.getElementById('bubble_menu_one'),
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          return (to - from) > 0 && (
            editor.isActive('paragraph') ||
            editor.isActive('bold') ||
            editor.isActive('italic') ||
            editor.isActive('underline') ||
            editor.isActive('strike')
          );
        },
      }),
      Mention.configure({
        suggestion: {
          char: '@',
          command: ({ editor, range, props }) => {
            const user = selectedUser();

            if (!user) return;

            let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };
            const relays = userRelays[user.pubkey] || [];

            if (relays.length > 0) {
              pInfo.relays = [...relays];
            }

            const nprofile = nip19.nprofileEncode(pInfo);

            const delRange = {
              from: range.from,
              to: range.from + searchQuery().length,
            };

            setSearchQuery(() => '');

            editor
              .chain()
              .focus()
              .deleteRange({ ...delRange })
              .insertNProfileAt(range, { nprofile, user, relays})
              .insertContent({ type: 'text', text: ' ' })
              .run()
          },
          items: async ({ editor, query}) => {
            users = query.length < 2 ?
              await fetchRecomendedUsersAsync() :
              await fetchUserSearch(undefined, `mention_users_${APP_ID}`, query);

            userRelays = await getUserRelays();
            setSuggestedUsers(() => [...users]);

            return users;
          },
          render: () => {
            let component: JSXElement | undefined;
            let popup: Instance[] = [];

            return {
              onStart: props => {

                component = <div>
                  <For each={suggestedUsers}>
                    {(user, index) => (
                      <SearchOption
                        id={`reads_suggested_user_${index()}`}
                        title={userName(user)}
                        description={nip05Verification(user)}
                        icon={<Avatar user={user} size="xs" />}
                        statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
                        statLabel={intl.formatMessage(tSearch.followers)}
                        // @ts-ignore
                        onClick={() => {
                          setSelectedUser(() => user);
                          props.command({ id: user.pubkey, label: user.name})
                        }}
                        highlighted={highlightedUser() === index()}
                      />
                    )}
                  </For>
                </div>

                // @ts-ignore
                popup = tippy('#tiptapEditor', {
                  getReferenceClientRect: props.clientRect,
                  content: component,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },
              onUpdate: (props) => {
                setSearchQuery(() => props.query || '');
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();

                  return true;
                }

                if (props.event.key === 'ArrowDown') {
                  setHighlightedUser(i => {
                    if (!search?.users || search.users.length === 0) {
                      return 0;
                    }

                    return i < search.users.length ? i + 1 : 0;
                  });

                  return true;
                }

                if (props.event.key === 'ArrowUp') {
                  setHighlightedUser(i => {
                    if (!search?.users || search.users.length === 0) {
                      return 0;
                    }

                    return i > 0 ? i - 1 : search.users.length;
                  });
                  return true;
                }


                if (['Enter', 'Space', 'Comma', 'Tab'].includes(props.event.code)) {
                  const sel = document.getElementById(`reads_suggested_user_${highlightedUser()}`);

                  sel && sel.click();

                  return true;
                }

                // @ts-ignore
                return component?.ref?.onKeyDown(props)
              },
              onExit: () => {
                popup[0].destroy();
              }
            }
          },
        },
      }),
    ],
    content: '',
    // onUpdate() {
    //   console.log('update');
    // },
    // onPaste(e: ClipboardEvent) {
    //   console.log('PASTE', e)
    // }
    // onSelectionUpdate({ editor: ed }) {
    //   updateFormatControls(() => ({
    //     isBoldActive: ed.isActive('bold'),
    //     isItalicActive: ed.isActive('italic'),
    //     isStrikeActive: ed.isActive('strike'),
    //     isUlineActive: ed.isActive('underline'),
    //   }))
    // },
  }));

  // ----------------------------------------

  const resetUpload = (uploadId?: string) => {
    const id = fileUploadContext();

    if (id !== uploadId) return;

    if (titleImageUpload && id === titleImageUploadId) {
      titleImageUpload.value = '';
    }

    batch(() => {
      setFileToUpload(undefined);
      setFileUploadContext(undefined);
    })
  };

  const onUploadTitleImage = (fileUpload: HTMLInputElement | undefined) => {

    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    if (!file) return;

    batch(() => {
      setFileToUpload(file);
      setFileUploadContext(titleImageUploadId);
    })
  }

  const onUploadContent = (file: File) => {
    batch(() => {
      setFileToUpload(file);
      setFileUploadContext(contentImageUploadId);
    })
  }

  onMount(() => {
    setOpenUploadSockets(true);
  });

  onCleanup(() => {
    setOpenUploadSockets(false);
  });

  const postArticle = async () => {
    const editor = editorTipTap();

    if (!account || !account.hasPublicKey() || fileToUpload() || !editor) {
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

    const content = editor.storage.markdown.getMarkdown();

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

    if (success) {

      const importId = `import_article_${APP_ID}`;

      const unsub = subsTo(importId, {
        onEose: () => {
          unsub();
          if (note) {
            toast?.sendSuccess(intl.formatMessage(tToast.publishNoteSuccess));
            setArticle(() => emptyArticleEdit());
            navigate('/reads');
          }
        }
      });

      note && importEvents([note], importId);

      return;
    }
  }

  // INPUT REACTIONS ----------------------------------

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
            <div class={styles.caption}>Editor Tools</div>

            <button
              class={styles.toolButton}
              onClick={() => { }}
            >
              Preview Article
            </button>

            <button
              class={styles.toolButton}
              onClick={() => { }}
            >
              Import External Content
            </button>
            <button
              class={styles.toolButton}
              onClick={() => { }}
            >
              Enable Proposal Mode
            </button>
          </div>
          <div class={styles.sidebarPublish}>
            <div class={styles.caption}>{'Save & Publish'}</div>
            <div class={styles.status}>
              Unsaved changes.
            </div>

            <button
              class={styles.toolButton}
              onClick={() => { }}
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

          <Show when={!accordionSection().includes('metadata')}>
            <div class={styles.metadataPreview}>
              <Show when={article.title.length > 0}>
                <div class={styles.titlePreview}>
                  {article.title}
                </div>
              </Show>

              <Show when={article.image.length > 0}>
                <img
                  class={styles.titleImagePreview}
                  src={article.image}
                />
              </Show>

              <Show when={article.summary.length > 0}>
                <div class={styles.summaryPreview}>
                  {article.summary}
                </div>
              </Show>

              <Show when={article.tags.length > 0}>
                <div class={styles.tagPreview}>
                  <div class={styles.tagList}>
                    <For each={article.tags}>
                      {tag => <div class={styles.tag}>{tag}</div>}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Wormhole>

      <Show when={accordionSection().includes('metadata')}>
        <div class={styles.metadata}>
          <TextField
            class={styles.titleInput}
            value={article.title}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.code === 'Enter') {
                e.preventDefault();
              }
            }}
            onChange={(v) => {
              setArticle('title', () => v);
            }}
          >
            <TextField.TextArea
              rows={1}
              autoResize={true}
              placeholder="Title"
            />
          </TextField>

          <Show when={accordionSection().includes('hero_image')}>
            <Uploader
              uploadId={fileUploadContext()}
              hideLabel={false}
              publicKey={account?.publicKey}
              nip05={account?.activeUser?.nip05}
              openSockets={openUploadSockets()}
              file={fileToUpload()}
              onFail={(_, uploadId?: string) => {
                toast?.sendWarning(intl.formatMessage(tUpload.fail, {
                  file: fileToUpload()?.name,
                }));
                resetUpload(uploadId);
              }}
              onRefuse={(reason: string, uploadId?: string) => {
                if (reason === 'file_too_big_100') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigRegular));
                }
                if (reason === 'file_too_big_1024') {
                  toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigPremium));
                }
                resetUpload(uploadId);
              }}
              onCancel={(uploadId?: string) => {
                resetUpload(uploadId);
              }}
              onSuccsess={(url:string, uploadId?: string) => {
                if (uploadId === titleImageUploadId) {
                  setArticle('image', () => url);
                }

                if (uploadId === contentImageUploadId) {
                  const ed = editorTipTap();
                  if (!ed) return;

                  ed.
                    chain().
                    focus().
                    setImage({
                      src: url,
                      title: 'image',
                      alt: 'image alternative',
                    }).
                    run();

                  // Move cursor one space to the right to avoid overwriting the image.
                  const el = document.querySelector('.tiptap.ProseMirror');
                  el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight'}))
                }

                resetUpload(uploadId);
              }}
            />

            <Show
              when={article.image.length > 0}
              fallback={
                <div class={styles.noTitleImagePlaceholder}>
                  <input
                    id="upload-avatar"
                    type="file"
                    onChange={() => onUploadTitleImage(titleImageUpload)}
                    ref={titleImageUpload}
                    hidden={true}
                    accept="image/*"
                  />
                  <label for="upload-avatar">
                    Add hero Image
                  </label>
                </div>
              }
            >
              <div class={styles.uploadButton}>
                <label for="upload-avatar">
                  <Show
                    when={article.image.length > 0}
                    fallback={<>Add hero Image</>}
                  >
                    Chage hero Image
                  </Show>
                </label>
                <input
                  id="upload-avatar"
                  type="file"
                  onChange={() => onUploadTitleImage(titleImageUpload)}
                  ref={titleImageUpload}
                  hidden={true}
                  accept="image/*"
                />
                <img class={styles.titleImage}  src={article.image} />
              </div>
            </Show>
          </Show>


          <div class={styles.summary}>
            <div class={styles.border}></div>
            <TextField
              class={styles.summaryInput}
              value={article.summary}
              onChange={v => setArticle('summary', () => v)}
            >
              <TextField.TextArea
                rows={1}
                autoResize={true}
                placeholder="Article Summary"
              />
            </TextField>
          </div>

          <div class={styles.tags}>
            <div
              class={styles.tagList}
            >
              <For each={article.tags}>
                {tag => (
                  <div
                    class={styles.tag}
                    onClick={() => {
                      const filtered = article.tags.filter(t => t !== tag);
                      setArticle('tags', () => [...filtered]);
                    }}
                  >
                    {tag}
                  </div>
                )}
              </For>
              <TextField
                class={styles.tagsInput}
                onKeyDown={(e: KeyboardEvent) => {
                  // @ts-ignore
                  const value = e.target?.value || '';

                  if (e.code === 'Backspace' && value.length === 0) {
                    // Remove last tag
                    const filtered = article.tags.slice(0, -1);
                    setArticle('tags', () => [...filtered]);
                  }

                  if (e.code !== 'Enter') return;

                  if (value.length < 1 || article.tags.includes(value)) return;

                  const tags = value.split(',').map((x: string) => x.trim());
                  setArticle('tags', (ts) => [...ts, ...tags]);
                  // @ts-ignore
                  e.target.value = ''
                }}
              >
                <TextField.Input
                  placeholder="Add tags..."
                />
              </TextField>
            </div>

          </div>

        </div>
      </Show>

      <div class={styles.contentEditor}>
        <ReadsEditorToolbar
          editor={editorTipTap()}
          onFileUpload={onUploadContent}
          wysiwygMode={!editorMarkdown()}
          toggleEditorMode={() => {
            setEditorMarkdown(v => !v);
            const editor = editorTipTap();
            if (!editor) return;

            if (editorMarkdown()) {
              setMarkdownContent(() => editorTipTap()?.storage.markdown.getMarkdown())
            }
            else {
              const oldHTML = editor.getHTML();
              editor.commands.setContent('');

              // nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08

              try {
                const content = `${editorPlainText?.value || ''} `;
                editor.chain().focus().setNostrContent(content).run();
              } catch (e) {
                console.log('ERROR: ', e);
                editor.commands.setContent(oldHTML);
              }
            }
          }}
        />

        <div
          id="tiptapEditor"
          class={`${styles.editor} editorTipTap ${editorMarkdown() ? styles.hiddenEditor : ''}`} ref={tiptapEditor}
          onClick={() => editorTipTap()?.chain().focus().run()}
        ></div>

        <div class={`${editorMarkdown() ? '' : styles.hiddenEditor}`}>
          <textarea
            value={markdownContent()}
            class={`${styles.editor}`}
            ref={editorPlainText}
            onChange={e => {
              setMarkdownContent(() => e.target.value || '');
            }}
          ></textarea>
        </div>
      </div>
    </div>
  )
}

export default ReadsEditor;
