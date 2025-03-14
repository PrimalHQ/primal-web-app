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


import {
  actions as tActions,
  settings as tSettings,
  toast as tToast,
  upload as tUpload,
  upload,
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
  const toast = useToastContext();
  const intl = useIntl();
  const navigate = useNavigate();

  let mdEditor: HTMLDivElement | undefined;

  const [editor, setEditor] = createSignal<Editor>();
  const [html, setHtml] = createSignal('');

  const [isBoldActive, setIsBoldActive] = createSignal(false);
  const [isBoldSelected, setIsBoldSelected] = createSignal(false);
  const [isItalicActive, setIsItalicActive] = createSignal(false);
  const [isItalicSelected, setIsItalicSelected] = createSignal(false);
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

  let contentFileUpload: HTMLInputElement | undefined;
  let titleImageUpload: HTMLInputElement | undefined;

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

  const initEditor = async () => {
    if (editor()) return;

    try {
      const e = await Editor.make()
      .config((ctx) => {
        const listener = ctx.get(listenerCtx);

        const slistener = ctx.get(selectionCtx);

        slistener.selection((_, selection, doc) => {
          const schema = ctx.get(schemaCtx);
          const range = selection.to - selection.from;
          doc.nodesBetween(selection.from, selection.to, (node, pos, parent, index) => {
            if (node.type.name === 'heading') {
              setHeadingLevel(node.attrs['level']);
              return false;
            }

            if (node.type.name === 'paragraph') {
              setHeadingLevel(0);
              return false;
            }

            console.log('NODE: ', node)
            console.log('POS: ', pos)
            console.log('PARENT: ', parent)
            console.log('INDEX: ', index)

            return false;
          })

          setIsBoldSelected(false);
          setIsItalicSelected(false);
          setIsLinkSelected(false);
          setIsCodeSelected(false);

          if (range <= 0) {
            setSelection('');
            return;
          }

          setSelection(() => doc.textBetween(selection.from, selection.to));

          if (doc.rangeHasMark(selection.from, selection.to, schema.marks['strong'])) {
            setIsBoldSelected(true)
            return;
          }

          if (doc.rangeHasMark(selection.from, selection.to, schema.marks['emphasis'])) {
            setIsItalicSelected(true)
            return;
          }

          if (doc.rangeHasMark(selection.from, selection.to, schema.marks['link'])) {
            setIsLinkSelected(true)
            return;
          }

          if (doc.rangeHasMark(selection.from, selection.to, schema.marks['inlineCode'])) {
            setIsCodeSelected(true)
            return;
          }

          // temp2.rangeHasMark(temp1.from, temp1.to, temp3.marks['strong'])
        });

        listener.updated((ctx, current, prev) => {
        });

        listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            setArticle('content', () => markdown)
            setMarkdownContent(() => markdown);
          }
        });
      })
      .config((ctx) => {
        ctx.set(rootCtx, mdEditor);

        // ctx.update(editorViewOptionsCtx, prev => ({
        //   ...prev,
        //   editable: () => true,
        // }))
      })
      .use(selectionListener)
      .use(listener)
      .use(commonmark)
      .use(gfm)
      // .use(userMention)
      .use(history)
      .create();

      const milk = document.querySelector(".ProseMirror, .editor") as HTMLTextAreaElement | null;

      if (milk) {
        milk.style.minHeight = "50dvh";
      }

      // const regex = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;

      // const cont = props.content.replace(regex, (e) => {
      //   const arr = e.split('@');

      //   return `${arr[0]}&#8203;@${arr[1]}`;
      // });

      // insert(cont)(e.ctx);
      // setHtml(() => getHTML()(e.ctx));

      // e.action(replaceAll(article.content))

      setEditor(() => e);

    } catch (err) {
      logError('Failed init milkdown editor: ', err);
    }
  }

  onMount(() => {
    initEditor();
  });

  onCleanup(() => editor()?.destroy());

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
    editor()?.action(callCommand(undoCommand.key));
    focusEditor();
  }

  const redo = () => {
    editor()?.action(callCommand(redoCommand.key));
    focusEditor();
  }

  const bold = () => {
    toggleToolbar('bold');

    editor()?.action(callCommand(toggleStrongCommand.key));
    focusEditor();
  }

  const italic = (e: MouseEvent) => {
    toggleToolbar('italic');

    editor()?.action(callCommand(toggleEmphasisCommand.key));
    focusEditor();
  }

  const code = (e: MouseEvent) => {
    toggleToolbar('code');

    editor()?.action(callCommand(toggleInlineCodeCommand.key));
    focusEditor();
  }

  const quote = (e: MouseEvent) => {
    toggleToolbar('quote');

    editor()?.action(callCommand(wrapInBlockquoteCommand.key));
    focusEditor();
  }

  const bulletList = (e: MouseEvent) => {
    toggleToolbar('bulletList');

    editor()?.action(callCommand(wrapInBulletListCommand.key));
    focusEditor();
  }

  const orderedList = (e: MouseEvent) => {
    toggleToolbar('orderedList');

    editor()?.action(callCommand(wrapInOrderedListCommand.key));
    focusEditor();
  }

  const link = (href: string, title: string) => {
    // toggleToolbar('link');

    const ed = editor();

    if (!ed) return;

    if (!editorMarkdown()) {

    }

    insert(`[${title}](${href})`)(ed.ctx);

    editor()?.action(callCommand(toggleLinkCommand.key));

    setTimeout(() => {
      focusEditor();
    }, 100)
  }

  const heading = (hLevel: string) => {
    const level = headingLevels.indexOf(hLevel) || 0;

    editor()?.action(
      callCommand(
        wrapInHeadingCommand.key, level,
      )
    );

    setHeadingLevel(level);
    focusEditor();
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
    if (!account || !account.hasPublicKey() || fileToUpload()) {
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

    let tags: string[][] = [];

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

    const { success, reasons, note } = await sendArticle(article, account.proxyThroughPrimal || false, account.activeRelays, tags, account.relaySettings);

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
              const ed = editor();
              if (!ed) return;
              ed.action(callCommand(insertImageCommand.key, { src: url }));
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
            >
              <div class={styles.undoIcon}></div>
            </button>

            <button
              id="redoBtn"
              class={styles.mdToolButton}
              onClick={redo}
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
            >
              <div class={styles.boldIcon}></div>
            </button>

            <button
              id="italicBtn"
              class={`${styles.mdToolButton} ${isItalicActive() || isItalicSelected() ? styles.selected : ''}`}
              onClick={italic}
            >
              <div class={styles.italicIcon}></div>
            </button>

            <button
              id="codeBtn"
              class={`${styles.mdToolButton} ${isCodeActive() || isCodeSelected() ? styles.selected : ''}`}
              onClick={code}
            >
              <div class={styles.codeIcon}></div>
            </button>

            <button
              id="quoteBtn"
              class={`${styles.mdToolButton}`}
              onClick={quote}
            >
              <div class={styles.quoteIcon}></div>
            </button>

            <button
              id="bulletListBtn"
              class={`${styles.mdToolButton}`}
              onClick={bulletList}
            >
              <div class={styles.bulletListIcon}></div>
            </button>

            <button
              id="orderedListBtn"
              class={`${styles.mdToolButton}`}
              onClick={orderedList}
            >
              <div class={styles.orderedListIcon}></div>
            </button>

            <button
              id="linkBtn"
              class={`${styles.mdToolButton} ${isLinkActive() || isLinkSelected() ? styles.selected : ''}`}
              onClick={() => {
                // link('url', 'title', 'label')
                if (isLinkSelected()) {
                  editor()?.action(callCommand(toggleLinkCommand.key));
                  return;
                }

                setEnterLink(true);
              }}
            >
              <div class={styles.linkIcon}></div>
            </button>

            <div
              id="attachBtn"
              class={styles.mdToolButton}
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
            class={`${styles.mdToolButton}`}
            onClick={() => setEditorMarkdown(v => !v)}
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
          class={`${styles.editor} ${editorMarkdown() ? styles.hiddenEditor : ''}`}
          ref={mdEditor}
          onClick={() => {
            // focusEditor();
          }}
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

      <AdvancedSearchDialog
        triggerClass="hidden"
        open={enterLink()}
        setOpen={setEnterLink}
        title="Add link"
      >
        <div class={styles.addLinkDialog}>
          <input id="link_url" placeholder="link url" class={styles.textInput} />
          <input id="link_label" placeholder="link label" class={styles.textInput} />
          <ButtonPrimary
            onClick={() => {
              const url = (document.getElementById('link_url') as HTMLInputElement | null)?.value || '';
              const label = (document.getElementById('link_label') as HTMLInputElement | null)?.value || '';

              link(url, label);
              setEnterLink(false);
            }}
          >
            Add Link
          </ButtonPrimary>
        </div>
      </AdvancedSearchDialog>
    </div>
  )
}

export default ReadsEditor;
