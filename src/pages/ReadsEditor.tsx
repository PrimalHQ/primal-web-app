import { batch, Component, createEffect, createSignal, For, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js'

import styles from './ReadsEditor.module.scss'
import Wormhole from '../components/Wormhole/Wormhole';
import CheckBox2 from '../components/Checkbox/CheckBox2';
import ReadsEditorEditor from '../components/ReadsEditor/ReadsEditorEditor';

export type EditorPreviewMode = 'editor' | 'browser' | 'phone' | 'feed';

const ReadsEditor: Component = () => {

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content', 'hero_image']);
  const [editorPreviewMode, setEditorPreviewMode] = createSignal<EditorPreviewMode>('editor');

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
        </div>
      </Wormhole>

      <Switch>
        <Match when={editorPreviewMode() === 'editor'}>
          <ReadsEditorEditor
            accordionSection={accordionSection()}
          />
        </Match>

        <Match when={editorPreviewMode() === 'browser'}>
          <div>Browser preview</div>
        </Match>

        <Match when={editorPreviewMode() === 'phone'}>
          <div>Phone preview</div>
        </Match>

        <Match when={editorPreviewMode() === 'feed'}>
          <div>Feed preview</div>
        </Match>
      </Switch>
    </div>
  )
}

export default ReadsEditor;
