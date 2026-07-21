import { Component, Match, Show, Switch } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { PrimalNote } from '../../types/primal';
import {
  noteTranslations,
  toggleShowOriginal,
  translateNoteContent,
  translationProviderLabel,
  translationSettings,
} from '../../lib/translation';
import { shouldOfferTranslation } from '../../lib/translationSanitizer';
import { actions as tActions } from '../../translations';
import styles from './NoteTranslate.module.scss';

const errorMessage = (
  intl: ReturnType<typeof useIntl>,
  code?: string,
): string => {
  switch (code) {
    case 'missing_key':
      return intl.formatMessage(tActions.noteTranslate.errorMissingKey);
    case 'missing_url':
      return intl.formatMessage(tActions.noteTranslate.errorMissingUrl);
    case 'disabled':
      return intl.formatMessage(tActions.noteTranslate.errorDisabled);
    case 'empty_prose':
      return intl.formatMessage(tActions.noteTranslate.errorEmptyProse);
    default:
      return intl.formatMessage(tActions.noteTranslate.error);
  }
};

const NoteTranslate: Component<{ note: PrimalNote }> = (props) => {
  const intl = useIntl();
  const state = () => noteTranslations[props.note.id];
  const content = () => props.note.content || '';
  const offer = () => shouldOfferTranslation(content());

  const onTranslate = () => {
    void translateNoteContent(props.note.id, content());
  };

  return (
    <Show
      when={
        translationSettings.enabled &&
        (offer() ||
          (state()?.status &&
            state()?.status !== 'idle'))
      }
    >
      <div class={styles.noteTranslate}>
        <Switch>
          <Match when={state()?.status === 'loading'}>
            <div class={styles.meta}>
              {intl.formatMessage(tActions.noteTranslate.loading)}
            </div>
          </Match>

          <Match when={state()?.status === 'error'}>
            <div class={styles.row}>
              <button type="button" class={styles.linkBtn} onClick={onTranslate}>
                {intl.formatMessage(tActions.noteTranslate.retry)}
              </button>
              <span class={styles.error}>
                {errorMessage(intl, state()?.error)}
              </span>
            </div>
          </Match>

          <Match when={state()?.status === 'translated' && state()?.text}>
            <Show when={!state()?.showOriginal}>
              <div class={styles.translatedText}>{state()?.text}</div>
              <Show when={state()?.detectedLanguage}>
                <div class={styles.meta}>
                  {intl.formatMessage(tActions.noteTranslate.fromLanguage, {
                    language: (state()?.detectedLanguage || '').toUpperCase(),
                  })}
                </div>
              </Show>
            </Show>
            <div class={styles.row}>
              <button
                type="button"
                class={styles.linkBtn}
                onClick={() => toggleShowOriginal(props.note.id)}
              >
                {state()?.showOriginal
                  ? intl.formatMessage(tActions.noteTranslate.showTranslation)
                  : intl.formatMessage(tActions.noteTranslate.showOriginal)}
              </button>
              <Show when={state()?.provider}>
                <span class={styles.meta}>
                  {intl.formatMessage(tActions.noteTranslate.via, {
                    provider: translationProviderLabel(state()!.provider!),
                  })}
                </span>
              </Show>
            </div>
          </Match>

          <Match when={offer()}>
            <button type="button" class={styles.linkBtn} onClick={onTranslate}>
              {intl.formatMessage(tActions.noteTranslate.translate)}
            </button>
          </Match>
        </Switch>
      </div>
    </Show>
  );
};

export default NoteTranslate;
