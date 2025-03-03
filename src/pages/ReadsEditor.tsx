import { Component, createEffect, createResource, createSignal, For, onCleanup, onMount, Show, Suspense } from 'solid-js'
import { editorViewOptionsCtx, Editor, rootCtx, schemaCtx } from '@milkdown/core';
import createFuzzySearch from '@nozbe/microfuzz';

import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
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
import { selectionCtx, selectionListener } from '../lib/markdown';
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
  const [selection, setSelection] = createSignal('');

  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit())

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content']);
  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();

  let titleImageUpload: HTMLInputElement | undefined;

  const resetUploadTitleImage = () => {
    if (titleImageUpload) {
      titleImageUpload.value = '';
    }

    setFileToUpload(undefined);
  };

  const onUploadTitleImage = (fileUpload: HTMLInputElement | undefined) => {

    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    if (file) {
      setFileToUpload(file);
    }
  }

  onMount(() => {
    setOpenUploadSockets(true);
  });

  onCleanup(() => {
    setOpenUploadSockets(false);
  })

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

          setIsBoldSelected(false);
          if (range <= 0) {
            setSelection('');
            return;
          }

          setSelection(() => doc.textBetween(selection.from, selection.to));

          if (doc.rangeHasMark(selection.from, selection.to, schema.marks['strong'])) {
            setIsBoldSelected(true)
            return;
          }

          // temp2.rangeHasMark(temp1.from, temp1.to, temp3.marks['strong'])
        });
        listener.updated((ctx, current, prev) => {
          // console.log("UPDATE: ", ctx)
        });

        listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            setArticle('content', () => markdown)
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
          <Uploader
            hideLabel={false}
            publicKey={account?.publicKey}
            nip05={account?.activeUser?.nip05}
            openSockets={openUploadSockets()}
            file={fileToUpload()}
            onFail={() => {
              toast?.sendWarning(intl.formatMessage(tUpload.fail, {
                file: fileToUpload()?.name,
              }));
              resetUploadTitleImage();
            }}
            onRefuse={(reason: string) => {
              if (reason === 'file_too_big_100') {
                toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigRegular));
              }
              if (reason === 'file_too_big_1024') {
                toast?.sendWarning(intl.formatMessage(tUpload.fileTooBigPremium));
              }
              resetUploadTitleImage();
            }}
            onCancel={() => {
              resetUploadTitleImage();
            }}
            onSuccsess={(url:string) => {
              setArticle('image', () => url);
              resetUploadTitleImage();
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
          </div>
        </div>
        <div
          class={styles.editor}
          ref={mdEditor}
          onClick={() => {
            // focusEditor();
          }}
        ></div>
      </div>


      <div class={styles.postingControls}>
        <ButtonPrimary
          onClick={postArticle}
        >
          Publish Article
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default ReadsEditor;
