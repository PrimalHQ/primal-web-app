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
import { getEventQuotes, getEventQuoteStats, getEventReactions, getEventZaps, parseLinkPreviews, setLinkPreviews } from '../../lib/notes';
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
import { FeedPage, NostrMentionContent, NostrNoteActionsContent, NostrNoteContent, NostrStatsContent, NostrUserContent, NoteActions, PrimalNote, PrimalUser } from '../../types/primal';
import { debounce, parseBolt11 } from '../../utils';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Note from '../Note/Note';
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


const ReadsLinkDialog: Component<{
  id?: string,
  open: boolean,
  editor: Editor | undefined,
  setOpen?: (v: boolean) => void,
  onSubmit: (url: string, title: string) => void,
}> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();
  const search = useSearchContext();
  const profile = useProfileContext();

  const [state, setState] = createStore({
    url: '',
    title: '',
  })

  createEffect(() => {
    const e = props.editor;
    if (!e) return;

    if (props.open) {
      const sel = e.state.selection;
      const title = e.state.doc.textBetween(sel.from, sel.to);
      const url = e.getAttributes('link').href || '';

      setState(() => ({ title, url }))
    }
    else {
      setState(() => ({ url: '', title: '' }));
    }

  })

  return (
    <AdvancedSearchDialog
      triggerClass="hidden"
      open={props.open}
      setOpen={props.setOpen}
      title="Add link"
    >
      <div class={styles.addLinkDialog}>
        <input
          id="link_url"
          placeholder="link url"
          class={styles.textInput}
          value={state.url}
          onInput={(e) => setState(() => ({ url: e.target.value}))}
        />
        <input
          id="link_label"
          placeholder="link label"
          class={styles.textInput}
          value={state.title}
          onInput={(e) => setState(() => ({ title: e.target.value}))}
        />
        <ButtonPrimary
          onClick={() => props.onSubmit(state.url, state.title)}
        >
          Add Link
        </ButtonPrimary>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ReadsLinkDialog);
