import { Component, For, JSXElement, Setter, Show, batch, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import styles from './ReadsEditor.module.scss';
import { SetStoreFunction, createStore } from 'solid-js/store';
import { Editor } from '@tiptap/core';
import { PrimalUser } from '../../types/primal';
import { nip19 } from '../../lib/nTools';
import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { APP_ID } from '../../App';
import { Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { useSearchContext } from '../../contexts/SearchContext';
import { readSecFromStorage } from '../../lib/localStore';
import { sendArticle, importEvents } from '../../lib/notes';
import { getUsersRelayInfo } from '../../lib/profile';
import { fetchRecomendedUsersAsync, fetchUserSearch } from '../../lib/search';
import { NAddrExtension } from '../../markdownPlugins/nAddrMention';
import { NEventExtension } from '../../markdownPlugins/nEventMention';
import { NProfileExtension } from '../../markdownPlugins/nProfileMention';
import { subsTo } from '../../sockets';
import { referencesToTags } from '../../stores/note';
import { userName, nip05Verification } from '../../stores/profile';
import Avatar from '../Avatar/Avatar';
import SearchOption from '../Search/SearchOption';
import { useToastContext } from '../Toaster/Toaster';
import { TextField } from '@kobalte/core/text-field';
import Uploader from '../Uploader/Uploader';


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
import CodeBlock from '@tiptap/extension-code-block';

import { createTiptapEditor } from 'solid-tiptap';
import { Markdown } from 'tiptap-markdown';

import tippy, { Instance } from 'tippy.js';

import {
  toast as tToast,
  upload as tUpload,
  search as tSearch,
} from '../../translations';
import ReadsEditorToolbar from './ReadsEditorToolbar';
import { ArticleEdit, emptyArticleEdit } from '../../pages/ReadsEditor';

export type FormatControls = {
  isBoldActive: boolean,
  isItalicActive: boolean,
  isStrikeActive: boolean,
  isUlineActive: boolean,
  isLinkActive: boolean,
  isCodeActive: boolean,
  enterLink: boolean,
  enterMention: boolean,
  enterImage: boolean,
  headingLevel: number,
};


const titleImageUploadId = 'title_image';
const contentImageUploadId = 'content_image';

const ReadsEditorEditor: Component<{
  id?: string,
  accordionSection: string[],
  markdownContent: string,
  setMarkdownContent: Setter<string>,
  article: ArticleEdit,
  setArticle: SetStoreFunction<ArticleEdit>,
}> = (props) => {
  const account = useAccountContext();
  const search = useSearchContext();
  const toast = useToastContext();
  const intl = useIntl();
  const navigate = useNavigate();
  const profile = useProfileContext();

  const [editorMarkdown, setEditorMarkdown] = createSignal(false);
  // const [markdownContent, setMarkdownContent] = createSignal<string>('')

  // const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit())

  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [fileUploadContext, setFileUploadContext] = createSignal<string | undefined>();

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  let titleImageUpload: HTMLInputElement | undefined;

  createEffect(() => {
    const editor = editorTipTap();
    if (!editor) return;

    setEditorContent(editor, props.article.content)
  });

  // TIPTAP----------------------------------

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLTextAreaElement | undefined;

  let users: PrimalUser[] = [];
  let userRelays: Record<string, string[]> = {};

  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');

  const accordionSection = () => props.accordionSection || [];

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
      CodeBlock,
      Markdown.configure({
        html: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
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
      // BubbleMenu.configure({
      //   pluginKey: 'bubbleMenuOne',
      //   element: document.getElementById('bubble_menu_one'),
      //   shouldShow: ({ editor, view, state, oldState, from, to }) => {
      //     return (to - from) > 0 && (
      //       editor.isActive('paragraph') ||
      //       editor.isActive('bold') ||
      //       editor.isActive('italic') ||
      //       editor.isActive('underline') ||
      //       editor.isActive('strike')
      //     );
      //   },
      // }),
      // Mention.configure({
      //   suggestion: {
      //     char: '@',
      //     command: ({ editor, range, props }) => {
      //       const user = selectedUser();

      //       if (!user) return;

      //       let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };
      //       const relays = userRelays[user.pubkey] || [];

      //       if (relays.length > 0) {
      //         pInfo.relays = [...relays];
      //       }

      //       const nprofile = nip19.nprofileEncode(pInfo);

      //       const delRange = {
      //         from: range.from,
      //         to: range.from + searchQuery().length,
      //       };

      //       setSearchQuery(() => '');

      //       editor
      //         .chain()
      //         .focus()
      //         .deleteRange({ ...delRange })
      //         .insertNProfileAt(range, { nprofile, user, relays})
      //         .insertContent({ type: 'text', text: ' ' })
      //         .run()
      //     },
      //     items: async ({ editor, query}) => {
      //       users = query.length < 2 ?
      //         await fetchRecomendedUsersAsync() :
      //         await fetchUserSearch(undefined, `mention_users_${APP_ID}`, query);

      //       userRelays = await getUserRelays();
      //       setSuggestedUsers(() => [...users]);

      //       return users;
      //     },
      //     render: () => {
      //       let component: JSXElement | undefined;
      //       let popup: Instance[] = [];

      //       return {
      //         onStart: props => {

      //           component = <div>
      //             <For each={suggestedUsers}>
      //               {(user, index) => (
      //                 <SearchOption
      //                   id={`reads_suggested_user_${index()}`}
      //                   title={userName(user)}
      //                   description={nip05Verification(user)}
      //                   icon={<Avatar user={user} size="xs" />}
      //                   statNumber={profile?.profileHistory.stats[user.pubkey]?.followers_count || search?.scores[user.pubkey]}
      //                   statLabel={intl.formatMessage(tSearch.followers)}
      //                   // @ts-ignore
      //                   onClick={() => {
      //                     setSelectedUser(() => user);
      //                     props.command({ id: user.pubkey, label: user.name})
      //                   }}
      //                   highlighted={highlightedUser() === index()}
      //                   hasBackground={true}
      //                 />
      //               )}
      //             </For>
      //           </div>

      //           // @ts-ignore
      //           popup = tippy('#tiptapEditor', {
      //             getReferenceClientRect: props.clientRect,
      //             content: component,
      //             showOnCreate: true,
      //             interactive: true,
      //             trigger: 'manual',
      //             placement: 'bottom-start',
      //           })
      //         },
      //         onUpdate: (props) => {
      //           setSearchQuery(() => props.query || '');
      //         },

      //         onKeyDown(props) {
      //           if (props.event.key === 'Escape') {
      //             popup[0].hide();

      //             return true;
      //           }

      //           if (props.event.key === 'ArrowDown') {
      //             setHighlightedUser(i => {
      //               if (!search?.users || search.users.length === 0) {
      //                 return 0;
      //               }

      //               return i < search.users.length ? i + 1 : 0;
      //             });

      //             return true;
      //           }

      //           if (props.event.key === 'ArrowUp') {
      //             setHighlightedUser(i => {
      //               if (!search?.users || search.users.length === 0) {
      //                 return 0;
      //               }

      //               return i > 0 ? i - 1 : search.users.length;
      //             });
      //             return true;
      //           }


      //           if (['Enter', 'Space', 'Comma', 'Tab'].includes(props.event.code)) {
      //             const sel = document.getElementById(`reads_suggested_user_${highlightedUser()}`);

      //             sel && sel.click();

      //             return true;
      //           }

      //           // @ts-ignore
      //           return component?.ref?.onKeyDown(props)
      //         },
      //         onExit: () => {
      //           popup[0].destroy();
      //         }
      //       }
      //     },
      //   },
      // }),
    ],
    content: '',
    onCreate({ editor }) {
      setEditorContent(editor, props.markdownContent);
      // editor.chain().setContent('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').applyNostrPasteRules('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').focus().run();
    },
    onUpdate() {
    props.setMarkdownContent(() => editorTipTap()?.storage.markdown.getMarkdown());
    },
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

  const setEditorContent = (editor: Editor, content: string) => {
    editor.chain().
      setContent(content).
      applyNostrPasteRules(content).
      applyNProfilePasteRules(content).
      applyNAddrPasteRules(content).
      focus().run();
  }

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

  return (
    <div class={styles.readsEditor}>
      <Show when={accordionSection().includes('metadata')}>
        <div class={styles.metadataWrapper} id="editor_metadata">
          <div class={styles.metadata}>
            <TextField
              class={styles.titleInput}
              value={props.article.title}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.code === 'Enter') {
                  e.preventDefault();
                }
              }}
              onChange={(v) => {
                props.setArticle('title', () => v);
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
                hideLabel={true}
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
                    props.setArticle('image', () => url);
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
                when={props.article.image.length > 0}
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
                <div
                  class={styles.uploadButton}
                >
                  <div
                    class={styles.uploadOverlay}
                    onClick={() => {
                      document.getElementById('upload-title-image')?.click();
                    }}
                  >
                    Chage hero Image
                  </div>
                  <input
                    id="upload-title-image"
                    type="file"
                    onChange={() => onUploadTitleImage(titleImageUpload)}
                    ref={titleImageUpload}
                    hidden={true}
                    accept="image/*"
                  />
                  <img
                    class={styles.titleImage}
                    src={props.article.image}
                  />
                </div>
              </Show>
            </Show>


            <div class={styles.summary}>
              <div class={styles.border}></div>
              <TextField
                class={styles.summaryInput}
                value={props.article.summary}
                onChange={v => props.setArticle('summary', () => v)}
              >
                <TextField.TextArea
                  rows={1}
                  autoResize={true}
                  placeholder="Article Summary"
                />
              </TextField>
            </div>
          </div>

          <div class={styles.tags}>
            <div
              class={styles.tagList}
            >
              <For each={props.article.tags}>
                {tag => (
                  <div
                    class={styles.tag}
                    onClick={() => {
                      const filtered = props.article.tags.filter(t => t !== tag);
                      props.setArticle('tags', () => [...filtered]);
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
                    const filtered = props.article.tags.slice(0, -1);
                    props.setArticle('tags', () => [...filtered]);
                  }

                  if (['Tab'].includes(e.code)) {
                    console.log(('TAB Entered'))
                    if (value.length > 0) {
                      const tags = value.split(',').map((x: string) => x.trim());
                      props.setArticle('tags', (ts) => [...ts, ...tags]);

                      // @ts-ignore
                      e.target.value = ''
                    }
                    return;
                  }

                  if (!['Enter', 'Comma'].includes(e.code)) {
                    return;
                  }

                  e.preventDefault();

                  if (value.length < 1 || props.article.tags.includes(value)) return;

                  const tags = value.split(',').map((x: string) => x.trim());
                  props.setArticle('tags', (ts) => [...ts, ...tags]);
                  // @ts-ignore
                  e.target.value = '';
                }}
              >
                <TextField.Input
                  placeholder="Enter tags (separated by commas)"
                />
              </TextField>
            </div>
          </div>
        </div>
      </Show>

      <div class={styles.contentEditor}>
        <ReadsEditorToolbar
          editor={editorTipTap()}
          textArea={editorPlainText}
          onFileUpload={onUploadContent}
          wysiwygMode={!editorMarkdown()}
          toggleEditorMode={() => {
            setEditorMarkdown(v => !v);
            const editor = editorTipTap();
            if (!editor) return;

            if (editorMarkdown()) {
              props.setMarkdownContent(() => editorTipTap()?.storage.markdown.getMarkdown())
            }
            else {
              editor.commands.setContent('');
              const content = editorPlainText?.value || '';
              setEditorContent(editor, content);
            }
          }}
        />

        <div
          id="tiptapEditor"
          class={`${styles.editor} editorTipTap ${editorMarkdown() ? styles.hiddenEditor : ''} ${accordionSection().includes('metadata') ? '' : styles.topMargin}`} ref={tiptapEditor}
          onClick={() => editorTipTap()?.chain().focus().run()}
        ></div>

        <div class={`${editorMarkdown() ? '' : styles.hiddenEditor}`}>
          <TextField
            value={props.markdownContent}
            onChange={value => {
              props.setMarkdownContent(() => value || '');
            }}
          >
            <TextField.TextArea
              class={`${styles.editorPlain}  ${accordionSection().includes('metadata') ? '' : styles.topMargin}`}
              ref={editorPlainText}
              autoResize={true}
            />
          </TextField>
        </div>
      </div>
    </div>
  );
}

export default ReadsEditorEditor;
