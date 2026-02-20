import { Component } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

const ArticleHighlight: Component<{
  id?: string,
  highlight: any,
  onShowMenu: (id: string) => void,
  onHideMenu: (id: string) => void,
}> = (props) => {

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
