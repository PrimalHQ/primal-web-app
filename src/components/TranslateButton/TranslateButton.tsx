import { Component, createSignal, Show } from 'solid-js';
import { translateText } from '../../lib/translate';
import { getLang } from '../../utils';

const TranslateButton: Component<{ text: string }> = (props) => {
  const [translated, setTranslated] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const onClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (translated()) {
      setTranslated('');
      return;
    }
    setLoading(true);
    try {
      setTranslated(await translateText(props.text, getLang()));
    } catch (err) {
      console.error('Translation failed', err);
    }
    setLoading(false);
  };

  return (
    <div style="margin-top: 8px;">
      <Show when={translated()}>
        <div style="white-space: pre-wrap; margin-bottom: 6px;">{translated()}</div>
      </Show>
      <a href="#" style="font-size: 14px;" onClick={onClick}>
        {loading() ? 'Translating...' : translated() ? 'Hide translation' : 'Translate post'}
      </a>
    </div>
  );
};

export default TranslateButton;
