import { batch, Component, createEffect, createResource, createSignal, For, onCleanup, onMount, Show, Suspense } from 'solid-js'
import { editorViewOptionsCtx, Editor, rootCtx, schemaCtx } from '@milkdown/core';
import createFuzzySearch from '@nozbe/microfuzz';

import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleLinkCommand,
  wrapInHeadingCommand,
  toggleInlineCodeCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  insertImageCommand,
} from '@milkdown/preset-commonmark';

import {
  gfm,
  insertTableCommand,
} from '@milkdown/preset-gfm';
import { listener, listenerCtx } from "@milkdown/plugin-listener";

import { callCommand, getMarkdown,   replaceAll, insert, getHTML, outline } from '@milkdown/utils';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import DOMPurify from 'dompurify';
import { logError } from '../lib/logger';

import styles from './ReadsEditor.module.scss'
import ButtonGhost from '../components/Buttons/ButtonGhost';
import { AddLink, addLinkCommand, selectionCtx, selectionListener } from '../lib/markdown';
import TextInput from '../components/TextInput/TextInput';
import { createStore } from 'solid-js/store';
import { TextField } from '@kobalte/core/text-field';
import { Accordion } from '@kobalte/core/accordion';
import Uploader from '../components/Uploader/Uploader';
import { useAccountContext } from '../contexts/AccountContext';
import { useToastContext } from '../components/Toaster/Toaster';

// import { SolidEditorContent, SolidEditor } from "@vrite/tiptap-solid";

import { Editor as EditorTT, getMarkType, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';

import { createTiptapEditor } from 'solid-tiptap';
import { Markdown } from 'tiptap-markdown';

import tippy, { Instance } from 'tippy.js';


import {
  actions as tActions,
  settings as tSettings,
  toast as tToast,
  upload as tUpload,
  search as tSearch,
} from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import { readSecFromStorage } from '../lib/localStore';
import { Kind } from '../constants';
import { importEvents, sendArticle } from '../lib/notes';
import { subsTo } from '../sockets';
import { APP_ID } from '../App';
import { useNavigate } from '@solidjs/router';
import Wormhole from '../components/Wormhole/Wormhole';
import { Select } from '@kobalte/core/select';
import AdvancedSearchSelectBox from '../components/AdvancedSearch/AdvancedSearchSelect';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import SearchOption from '../components/Search/SearchOption';
import { nip05Verification, userName } from '../stores/profile';
import Avatar from '../components/Avatar/Avatar';
import { useSearchContext } from '../contexts/SearchContext';
import { getCaretCoordinates } from '../lib/textArea';
import { debounce } from '../utils';
import { useProfileContext } from '../contexts/ProfileContext';
import { PrimalUser } from '../types/primal';
import { userMention } from '../markdownPlugins/userMentionPlugin';
import { fetchRecomendedUsersAsync, fetchUserSearch } from '../lib/search';
import { useAppContext } from '../contexts/AppContext';
import { nip19 } from '../lib/nTools';
import { getUsersRelayInfo } from '../lib/profile';
import { NProfileExtension } from '../markdownPlugins/nProfileMention';
import ReadsMentionDialog from '../components/ReadsMentionDialog/ReadsMentionDialog';
import { referencesToTags } from '../stores/note';
import ReadsLinkDialog from '../components/ReadsMentionDialog/ReadsLinkDialog';


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

const headingLevels = [
  'Normal',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Heading 4',
  'Heading 5',
  'Heading 6',
];

const titleImageUploadId = 'title_image';
const contentImageUploadId = 'content_image';

const ReadsEditor: Component = () => {
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const toast = useToastContext();
  const intl = useIntl();
  const navigate = useNavigate();
  const profile = useProfileContext();

  let mdEditor: HTMLDivElement | undefined;
  let mdEditorInput: HTMLDivElement | undefined;

  const [editor, setEditor] = createSignal<Editor>();
  const [html, setHtml] = createSignal('');

  const [isBoldActive, setIsBoldActive] = createSignal(false);
  const [isBoldSelected, setIsBoldSelected] = createSignal(false);
  const [isItalicActive, setIsItalicActive] = createSignal(false);
  const [isItalicSelected, setIsItalicSelected] = createSignal(false);
  const [isStrikeActive, setIsStrikeActive] = createSignal(false);
  const [isStrikeSelected, setIsStrikeSelected] = createSignal(false);
  const [isLinkActive, setIsLinkActive] = createSignal(false);
  const [isLinkSelected, setIsLinkSelected] = createSignal(false);
  const [isCodeActive, setIsCodeActive] = createSignal(false);
  const [isCodeSelected, setIsCodeSelected] = createSignal(false);

  const [headingLevel, setHeadingLevel] = createSignal(0);
  const [selection, setSelection] = createSignal('');

  const [editorMarkdown, setEditorMarkdown] = createSignal(false);
  const [markdownContent, setMarkdownContent] = createSignal<string>('')

  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit())

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content']);
  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [fileUploadContext, setFileUploadContext] = createSignal<string | undefined>();

  const [enterLink, setEnterLink] = createSignal(false);
  const [enterMention, setEnterMention] = createSignal(false);

  const [isMentioning, setIsMentioning] = createSignal(false);
  let mentionOptions: HTMLDivElement | undefined;
  let mentionCursorPosition = { top: 0, left: 0, height: 0 };
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  let contentFileUpload: HTMLInputElement | undefined;
  let titleImageUpload: HTMLInputElement | undefined;


  // TIPTAP----------------------------------

  let tiptapEditor: HTMLDivElement | undefined;

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

  const addMentionToEditor = (user: PrimalUser, relays: string[]) => {
    const editor = editorTipTap();
    if (!editor) return;

    let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };

    if (relays.length > 0) {
      pInfo.relays = [...relays];
    }

    const nprofile = nip19.nprofileEncode(pInfo);

    editor
      .chain()
      .focus()
      .insertNProfile({ nprofile, user, relays})
      .insertContent({ type: 'text', text: ' ' })
      .run()
  }

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
      NProfileExtension,
      Mention.configure({
        suggestion: {
          char: '@',
          command: ({ editor, range, props }) => {
            const user = props.user as PrimalUser | undefined;

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

          //   window.getSelection()?.collapseToEnd()
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
            let component
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
                          props.command({ user })
                        }}
                        highlighted={highlightedUser() === index()}
                      />
                    )}
                  </For>
                </div>

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

                  console.log('sel: ', sel)
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
    onSelectionUpdate({ editor: ed }) {
      setIsBoldActive(() => ed.isActive('bold'));
      setIsItalicActive(() => ed.isActive('italic'));
      setIsStrikeActive(() => ed.isActive('strike'));
      setIsCodeActive(() => ed.isActive('code'));
    },
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

  const onUploadContentImage = () => {

    if (!contentFileUpload) {
      return;
    }

    const file = contentFileUpload.files ? contentFileUpload.files[0] : null;

    if (!file) return;

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

  createEffect(() => {
    if (enterLink()) {
      setTimeout(() => {
        const input = document.getElementById('link_url') as HTMLInputElement | null;
        input?.focus();
      }, 10)
    }
  });

  const toggleToolbar = (button: string) => {
    switch (button) {
      case 'bold':
        selection().length > 0 ?
          setIsBoldSelected(v => !v) :
          setIsBoldActive(v => !v);
        break;
      case 'italic':
        selection().length > 0 ?
          setIsItalicSelected(v => !v) :
          setIsItalicActive(v => !v);
        break;
      case 'strike':
        selection().length > 0 ?
          setIsStrikeSelected(v => !v) :
          setIsStrikeActive(v => !v);
        break;
      case 'code':
        selection().length > 0 ?
          setIsCodeSelected(v => !v) :
          setIsCodeActive(v => !v);
        break;
      // case 'link':
      //   selection().length > 0 ?
      //     setIsLinkSelected(v => !v) :
      //     setIsLinkActive(v => !v);
      //   break;

    }
  }

  const undo = () => {
    editorTipTap()?.chain().focus().undo().run();
  }

  const redo = () => {
    editorTipTap()?.chain().focus().redo().run();
  }

  const bold = () => {
    toggleToolbar('bold');
    editorTipTap()?.chain().focus().toggleBold().run();
  }

  const italic = (e: MouseEvent) => {
    toggleToolbar('italic');
    editorTipTap()?.chain().focus().toggleItalic().run();
  }

  const strike = (e: MouseEvent) => {
    toggleToolbar('strike');
    editorTipTap()?.chain().focus().toggleStrike().run();
  }

  const code = (e: MouseEvent) => {
    toggleToolbar('code');
    editorTipTap()?.chain().focus().toggleCode().run();
  }

  const quote = (e: MouseEvent) => {
    toggleToolbar('quote');
    editorTipTap()?.chain().focus().toggleBlockquote().run();
  }

  const bulletList = (e: MouseEvent) => {
    toggleToolbar('bulletList');
    editorTipTap()?.chain().focus().toggleBulletList().run();
  }

  const orderedList = (e: MouseEvent) => {
    toggleToolbar('orderedList');
    editorTipTap()?.chain().focus().toggleOrderedList().run();
  }

  const link = (href: string, title: string) => {
    // toggleToolbar('link');

    const editor = editorTipTap();

    if (!editor) return;

    if (href === '') {
      editor.
        chain().
        focus().
        extendMarkRange('link').
        unsetLink().
        run();
      return
    }

    editor.
      chain().
      focus().
      extendMarkRange('link').
      setLink({ href }).
      command(({ tr }) => {
        title && tr.insertText(title)
        return true
      }).
      insertContent({ type: 'text', text: ' '}).
      run();

    editor.commands.unsetMark('link');
  }

  const heading = (hLevel: string) => {
    const level = headingLevels.indexOf(hLevel) || 0;
    setHeadingLevel(level);

    if (level === 0) {
      editorTipTap()?.chain().focus().setParagraph().run();
      return;
    }

    if (level > 0 && level < 7) {
      // @ts-ignore
      editorTipTap()?.chain().focus().setHeading({ level }).run();
      return;
    }
  }

  const table = () => {
    editor()?.action(callCommand(insertTableCommand.key));
    focusEditor();
  }

  const focusEditor = () => {
    const milk = document.querySelector(".ProseMirror, .editor") as HTMLTextAreaElement | null;

    if (!milk) return;

    milk.focus();
    // milk.setSelectionRange(milk.value.length, milk.value.length);
  }

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

    const articleToPost = {
      ...article,
      content,
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

        <div class={styles.sidebar}>
          <button
            class={`${styles.sectionButton} ${accordionSection().includes('metadata') ? styles.open : ''}`}
            onClick={() => {
              if (accordionSection().includes('metadata')) {
                setAccordionSection((as) => as.filter(s => s !== 'metadata'));
                return;
              }

              setAccordionSection((as) => [...as, 'metadata']);
            }}
          >
            <Show
              when={accordionSection().includes('metadata')}
              fallback={<span>Show</span>}
            >
              <span>Hide</span>
            </Show>
            Metadata
          </button>

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
            onKeyDown={(e) => {
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
              placeholder="Article Title"
            />
          </TextField>

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
                  Add Title Image
                </label>
              </div>
            }
          >
            <div class={styles.uploadButton}>
              <label for="upload-avatar">
                <Show
                  when={article.image.length > 0}
                  fallback={<>Add Title Image</>}
                >
                  Chage Title Image
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
            </div>

            <TextField
              class={styles.tagsInput}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.code !== 'Enter') return;

                // @ts-ignore
                const value = e.target?.value || '';

                if (value.length < 1 || article.tags.includes(value)) return;

                const tags = value.split(',').map((x: string) => x.trim());
                setArticle('tags', (ts) => [...ts, ...tags]);
                // @ts-ignore
                e.target.value = ''
              }}
            >
              <TextField.Input
                placeholder="Tags..."
              />
            </TextField>
          </div>

        </div>
      </Show>

      <div class={styles.contentEditor}>
        <div class={styles.toolbar}>
          <div>
            <button
              id="undoBtn"
              class={styles.mdToolButton}
              onClick={undo}
              title="undo"
            >
              <div class={styles.undoIcon}></div>
            </button>

            <button
              id="redoBtn"
              class={styles.mdToolButton}
              onClick={redo}
              title="redo"
            >
              <div class={styles.redoIcon}></div>
            </button>

            <AdvancedSearchSelectBox
              value={headingLevels[headingLevel()]}
              options={headingLevels}
              onChange={heading}
              short={true}
            />

            <button
              id="boldBtn"
              class={`${styles.mdToolButton} ${isBoldActive() || isBoldSelected() ? styles.selected : ''}`}
              onClick={bold}
              title="bold"
            >
              <div class={styles.boldIcon}></div>
            </button>

            <button
              id="italicBtn"
              class={`${styles.mdToolButton} ${isItalicActive() || isItalicSelected() ? styles.selected : ''}`}
              onClick={italic}
              title="italic"
            >
              <div class={styles.italicIcon}></div>
            </button>

            <button
              id="strikeBtn"
              class={`${styles.mdToolButton} ${isStrikeActive() || isStrikeSelected() ? styles.selected : ''}`}
              onClick={strike}
              title="strike"
            >
              <div class={styles.strikeIcon}></div>
            </button>


            <button
              id="codeBtn"
              class={`${styles.mdToolButton} ${isCodeActive() || isCodeSelected() ? styles.selected : ''}`}
              onClick={code}
              title="code block"
            >
              <div class={styles.codeIcon}></div>
            </button>

            <button
              id="quoteBtn"
              class={`${styles.mdToolButton}`}
              onClick={quote}
              title="quote section"
            >
              <div class={styles.quoteIcon}></div>
            </button>

            <button
              id="bulletListBtn"
              class={`${styles.mdToolButton}`}
              onClick={bulletList}
              title="bullet list"
            >
              <div class={styles.bulletListIcon}></div>
            </button>

            <button
              id="orderedListBtn"
              class={`${styles.mdToolButton}`}
              onClick={orderedList}
              title="ordered list"
            >
              <div class={styles.orderedListIcon}></div>
            </button>

            <button
              id="linkBtn"
              class={`${styles.mdToolButton} ${isLinkActive() || isLinkSelected() ? styles.selected : ''}`}
              onClick={() => {
                const editor = editorTipTap();
                if (!editor) return;

                let linak = editor.getAttributes('link').href;

                if (linak) {
                  editor.chain().unsetLink().run();
                  return;
                }

                setEnterLink(true);
              }}
              title="link"
            >
              <div class={styles.linkIcon}></div>
            </button>

            <button
              id="mentionBtn"
              class={`${styles.mdToolButton}`}
              onClick={() => {
                setEnterMention(true);
              }}
              title="mention"
            >
              <div class={styles.atIcon}></div>
            </button>

            <div
              id="attachBtn"
              class={styles.mdToolButton}
              title="image"
            >
              <input
                id="upload-content"
                type="file"
                onChange={onUploadContentImage}
                ref={contentFileUpload}
                hidden={true}
                accept="image/*,video/*,audio/*"
              />
              <label for={'upload-content'} class={`attach_icon ${styles.attachIcon}`}>
              </label>
            </div>
          </div>
          <button
            id="editorMode"
            class={`${styles.mdToolButton} ${editorMarkdown() ? styles.selected : ''}`}
            onClick={() => {
              setEditorMarkdown(v => !v)
              setMarkdownContent(() => editorTipTap()?.storage.markdown.getMarkdown())
            }}
            title={editorMarkdown() ? 'wysiwyg mode' : 'markdown mode'}
          >
            <Show
              when={editorMarkdown()}
              fallback={<div class={styles.markdownIcon}></div>}
            >
              <div class={`${styles.markdownIcon} ${styles.active}`}></div>
            </Show>
          </button>
        </div>
        <div
          id="tiptapEditor"
          class={`${styles.editor} editorTipTap ${editorMarkdown() ? styles.hiddenEditor : ''}`} ref={tiptapEditor}
          onClick={() => editorTipTap()?.chain().focus().run()}
        ></div>

        <div class={`${editorMarkdown() ? '' : styles.hiddenEditor}`}>
          <textarea
            value={markdownContent()}
            class={`${styles.editor}`}
            onChange={e => {
              const ed = editor();
              if (!ed) return;
              replaceAll(e.target.value)(ed.ctx);
            }}
          ></textarea>
        </div>
      </div>


      <div class={styles.postingControls}>
        <ButtonPrimary
          onClick={postArticle}
        >
          Publish Article
        </ButtonPrimary>
      </div>

      <ReadsLinkDialog
        open={enterLink()}
        setOpen={setEnterLink}
        editor={editorTipTap()}
        onSubmit={(url: string, label:string) => {
          link(url, label);
          setEnterLink(false);
        }}
      />

      <ReadsMentionDialog
        open={enterMention()}
        setOpen={setEnterMention}
        onSubmit={(user: PrimalUser, relays: string[]) => {
          addMentionToEditor(user, relays);
          setEnterMention(false);
        }}
      />
    </div>
  )
}

export default ReadsEditor;
