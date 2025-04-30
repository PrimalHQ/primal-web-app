import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { Kind, urlRegexG } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { ReactionStats, useAppContext } from '../../contexts/AppContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { getEventQuotes, getEventQuoteStats, getEventReactions, getEventZaps, parseLinkPreviews, sendArticle, setLinkPreviews } from '../../lib/notes';
import { truncateNumber2 } from '../../lib/notifications';
import { subsTo } from '../../sockets';
import { convertToNotes } from '../../stores/note';
import { nip05Verification, userName } from '../../stores/profile';
import {
  actions as tActions,
  placeholders as tPlaceholders,
  reactionsModal,
  search as tSearch,
} from '../../translations';
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalArticle, PrimalNote, PrimalUser } from '../../types/primal';
import { debounce, parseBolt11 } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Paginator from '../Paginator/Paginator';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ReadsMentionDialog.module.scss';
import DOMPurify from 'dompurify';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { useSearchContext } from '../../contexts/SearchContext';
import SearchOption from '../Search/SearchOption';
import { useProfileContext } from '../../contexts/ProfileContext';
import { getUsersRelayInfo } from '../../lib/profile';
import { Editor } from '@tiptap/core';
import { TextField } from '@kobalte/core/text-field';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import { ArticleEdit } from '../../pages/ReadsEditor';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import CheckBox2 from '../Checkbox/CheckBox2';


const ReadsPublishDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
  article: PrimalArticle,
  articleData: ArticleEdit,
  onPublish: (promote: boolean) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();

  const [promotion, setPromotion] = createSignal('');
  const [showPromotion, setShowPromotion] = createSignal(false);

  const publishArticle = async () => {
    if (!account) return;
    const tags: string[][] = [];
    await sendArticle(props.articleData, account.proxyThroughPrimal, account.activeRelays, tags, account.relaySettings)
  }

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
