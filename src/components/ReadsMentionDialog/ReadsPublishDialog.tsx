import { Component, createSignal, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { PrimalArticle } from '../../types/primal';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';

import styles from './ReadsMentionDialog.module.scss';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { TextField } from '@kobalte/core/text-field';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { ArticleEdit } from '../../pages/ReadsEditor';
import ArticlePreview from '../ArticlePreview/ArticlePreview';


const ReadsPublishDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  article: PrimalArticle,
  articleData: ArticleEdit,
  onPublish: (promote: boolean) => void,
}> = (props) => {
  const [promotion, setPromotion] = createSignal('');
  const [showPromotion, setShowPromotion] = createSignal(false);

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Publish Article"
    >
      <div class={styles.readsPublishDialog}>
        <Show when={false}>
          <TextField
            id="link_label"
            class={styles.textInput}
            value={promotion()}
            onChange={setPromotion}
          >
           	<TextField.TextArea autoResize rows={1} />
          </TextField>
        </Show>

        <div class={styles.previewHolder}>
          <ArticlePreview
            article={props.article}
            hideContext={true}
            hideFooter={true}
          />
        </div>

        {/* <CheckBox2
          onChange={setShowPromotion}
          checked={showPromotion()}
        >
          Add a short note to promote your article in the main feed
        </CheckBox2> */}

        <div class={styles.actions}>
          <ButtonSecondary
            onClick={() => props.setOpen && props.setOpen(false)}
            light={true}
            shrink={true}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={() => props.onPublish(showPromotion())}
          >
            Publish
          </ButtonPrimary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsPublishDialog);
