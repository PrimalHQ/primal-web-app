import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { Component, JSX, Show, createEffect, createSignal, on, onCleanup, onMount } from 'solid-js';
import { noteTranslate as t } from '../../translations';
import { askNoteTranslate, watchNoteTranslateAsk } from '../../lib/noteTranslateBus';
import {
  NoteTranslateError,
  TranslateFailure,
  canOfferNoteTranslate,
  detectNoteLanguage,
  peekNoteTranslation,
  translateNoteText,
} from '../../lib/noteTranslate';
import { languageBase } from '../../lib/noteTranslateProtect';
import {
  NoteTranslatePrefs,
  onDeviceTranslatorAvailable,
  providerReadiness,
  readNoteTranslatePrefs,
  resolveTargetLanguage,
} from '../../lib/noteTranslateSettings';
import { PrimalNote } from '../../types/primal';
import styles from './NoteTranslate.module.scss';

const languageLabel = (code: string | undefined, fallback: string): string => {
  if (!code) return fallback;
  try {
    const names = new Intl.DisplayNames([code, 'en'], { type: 'language' });
    return names.of(code) || fallback;
  } catch {
    return fallback;
  }
};

const withTranslatedContent = (note: PrimalNote, text: string): PrimalNote => ({
  ...note,
  content: text,
  post: { ...note.post, content: text },
  msg: { ...note.msg, content: text },
});

const NoteTranslate: Component<{
  note: PrimalNote,
  render: (note: PrimalNote) => JSX.Element,
}> = (props) => {
  const intl = useIntl();
  const [prefs, setPrefs] = createSignal<NoteTranslatePrefs>(readNoteTranslatePrefs());
  const [busy, setBusy] = createSignal(false);
  const [progress, setProgress] = createSignal('');
  const [error, setError] = createSignal<TranslateFailure | undefined>();
  const [translated, setTranslated] = createSignal<string | undefined>();
  const [sourceLanguage, setSourceLanguage] = createSignal<string | undefined>();
  const [showingTranslation, setShowingTranslation] = createSignal(false);
  const [sameLanguage, setSameLanguage] = createSignal(false);

  let abort: AbortController | undefined;

  const noteId = () => props.note.id || props.note.post.id;
  const sourceText = () => props.note.content || props.note.post.content || '';
  const targetLanguage = () => resolveTargetLanguage(prefs());
  const offer = () => canOfferNoteTranslate(sourceText(), prefs()) && !sameLanguage();

  const activeNote = () => {
    const text = translated();
    if (text && showingTranslation()) return withTranslatedContent(props.note, text);
    return props.note;
  };

  const refreshPrefs = () => setPrefs(readNoteTranslatePrefs());

  const errorCopy = (failure?: TranslateFailure) => {
    if (!failure) return '';
    switch (failure.reason) {
      case 'disabled':
        return intl.formatMessage(t.errorDisabled);
      case 'missing_url':
        return intl.formatMessage(t.errorMissingUrl);
      case 'invalid_url':
        return intl.formatMessage(t.errorInvalidUrl);
      case 'missing_key':
        return intl.formatMessage(t.errorMissingKey);
      case 'on_device_unavailable':
        return intl.formatMessage(t.errorOnDevice);
      case 'empty':
        return intl.formatMessage(t.errorEmpty);
      case 'same_language':
        return intl.formatMessage(t.errorSameLanguage);
      case 'aborted':
        return '';
      default:
        return intl.formatMessage(t.errorProvider);
    }
  };

  const runTranslate = async () => {
    refreshPrefs();
    const cached = peekNoteTranslation(sourceText(), prefs());
    if (cached) {
      setTranslated(cached.text);
      setSourceLanguage(cached.sourceLanguage);
      setShowingTranslation(true);
      setError(undefined);
      return;
    }

    const ready = providerReadiness(prefs());
    if (!ready.ok) {
      setError({ reason: ready.reason });
      return;
    }

    abort?.abort();
    abort = new AbortController();
    setBusy(true);
    setError(undefined);
    setProgress('');

    try {
      const result = await translateNoteText(sourceText(), {
        prefs: prefs(),
        signal: abort.signal,
        onProgress: (info) => {
          if (info.phase === 'download' && typeof info.loaded === 'number') {
            setProgress(intl.formatMessage(t.downloading, {
              percent: Math.round(info.loaded * 100),
            }));
          } else if (info.phase === 'detect') {
            setProgress(intl.formatMessage(t.detecting));
          } else {
            setProgress(intl.formatMessage(t.working));
          }
        },
      });
      setTranslated(result.text);
      setSourceLanguage(result.sourceLanguage);
      setShowingTranslation(true);
    } catch (err) {
      if (err instanceof NoteTranslateError) {
        if (err.failure.reason !== 'aborted') setError(err.failure);
      } else {
        setError({ reason: 'provider' });
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const onChromeClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const refreshSameLanguage = () => {
    const text = sourceText();
    const target = targetLanguage();
    void detectNoteLanguage(text).then((detected) => {
      if (!detected) return;
      setSourceLanguage(detected);
      setSameLanguage(detected === languageBase(target));
    });
  };

  onMount(() => {
    refreshPrefs();
    refreshSameLanguage();
    const cached = peekNoteTranslation(sourceText(), prefs());
    if (cached) {
      setTranslated(cached.text);
      setSourceLanguage(cached.sourceLanguage);
    }

    const unwatch = watchNoteTranslateAsk(noteId(), () => {
      if (translated() && showingTranslation()) {
        setShowingTranslation(false);
        return;
      }
      if (translated()) {
        setShowingTranslation(true);
        return;
      }
      void runTranslate();
    });

    window.addEventListener('storage', refreshPrefs);
    onCleanup(() => {
      unwatch();
      window.removeEventListener('storage', refreshPrefs);
      abort?.abort();
    });
  });

  createEffect(on(() => noteId(), () => {
    abort?.abort();
    const cached = peekNoteTranslation(sourceText(), prefs());
    setTranslated(cached?.text);
    setSourceLanguage(cached?.sourceLanguage);
    setShowingTranslation(false);
    setError(undefined);
    setBusy(false);
    setSameLanguage(false);
    refreshSameLanguage();
  }));

  return (
    <>
      {props.render(activeNote())}
      <Show when={offer()}>
        <div class={styles.chrome} onClick={onChromeClick}>
          <Show
            when={translated() && showingTranslation()}
            fallback={
              <Show
                when={!busy()}
                fallback={<span class={styles.meta}>{progress() || intl.formatMessage(t.working)}</span>}
              >
                <button
                  type="button"
                  class={styles.action}
                  onClick={() => {
                    if (translated()) {
                      setShowingTranslation(true);
                      setError(undefined);
                      return;
                    }
                    void runTranslate();
                  }}
                >
                  {intl.formatMessage(t.translateTo, {
                    language: languageLabel(targetLanguage(), targetLanguage()),
                  })}
                </button>
              </Show>
            }
          >
            <span class={styles.meta}>
              {intl.formatMessage(t.translatedFrom, {
                language: languageLabel(sourceLanguage(), intl.formatMessage(t.unknownLanguage)),
              })}
            </span>
            <button
              type="button"
              class={styles.action}
              onClick={() => setShowingTranslation(false)}
            >
              {intl.formatMessage(t.showOriginal)}
            </button>
          </Show>

          <Show when={error()}>
            <span class={styles.error}>{errorCopy(error())}</span>
            <Show when={error()?.reason !== 'same_language' && error()?.reason !== 'empty'}>
              <A
                href="/settings/translation"
                class={styles.setupLink}
                onClick={(event) => event.stopPropagation()}
              >
                {intl.formatMessage(t.openSettings)}
              </A>
            </Show>
          </Show>

          <Show when={
            !translated() &&
            !busy() &&
            !error() &&
            prefs().provider === 'on_device' &&
            !onDeviceTranslatorAvailable()
          }>
            <span class={styles.setup}>
              {intl.formatMessage(t.needsProvider)}
              {' '}
              <A
                href="/settings/translation"
                class={styles.setupLink}
                onClick={(event) => event.stopPropagation()}
              >
                {intl.formatMessage(t.openSettings)}
              </A>
            </span>
          </Show>
        </div>
      </Show>
    </>
  );
};

export const triggerNoteTranslate = (noteId: string) => askNoteTranslate(noteId);

export default NoteTranslate;
