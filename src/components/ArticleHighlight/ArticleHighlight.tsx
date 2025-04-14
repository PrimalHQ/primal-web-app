import { A } from '@solidjs/router';
import { batch, Component, createEffect, For, JSXElement, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { useAccountContext } from '../../contexts/AccountContext';
import { CustomZapInfo, useAppContext } from '../../contexts/AppContext';
import { useThreadContext } from '../../contexts/ThreadContext';
import { shortDate } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { PrimalArticle, ZapOption } from '../../types/primal';
import { uuidv4 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import { NoteReactionsState } from '../Note/Note';
import NoteContextTrigger from '../Note/NoteContextTrigger';
import ArticleFooter from '../Note/NoteFooter/ArticleFooter';
import NoteFooter from '../Note/NoteFooter/NoteFooter';
import NoteTopZaps from '../Note/NoteTopZaps';
import NoteTopZapsCompact from '../Note/NoteTopZapsCompact';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticleHighlight.module.scss';

const ArticleHighlight: Component<{
  id?: string,
  highlight: any,
  onShowMenu: (id: string) => void,
  onHideMenu: (id: string) => void,
}> = (props) => {

  const app = useAppContext();
  const account = useAccountContext();
  const thread = useThreadContext();

  const onOver = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // @ts-ignore
    e.target.setAttribute('data-highlight-selected', '')
    props.onShowMenu(props.highlight.id);
  }

  const onOut = () => {
    props.onHideMenu(props.highlight.id);
  }

  return (
    <em
      data-highlight={props.highlight?.id}
      class="article_highlight"
      onClick={onOver}
    >
      {props.highlight?.content || 'N/A'}
    </em>
  );
}

export default hookForDev(ArticleHighlight);
