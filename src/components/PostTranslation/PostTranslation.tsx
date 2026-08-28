import { Component, For, Show, createSignal, onCleanup } from 'solid-js';

import styles from './PostTranslation.module.scss';

type TranslationState = 'idle' | 'working' | 'translated' | 'external' | 'error';

type TranslationLanguage = {
  code: string;
  label: string;
};

type TranslationResult = {
  detectedLanguage: string;
  confidence: number;
};

type LanguageDetectorInstance = {
  detect: (text: string) => Promise<TranslationResult[]>;
  destroy?: () => void;
};

type LanguageDetectorFactory = {
  create: () => Promise<LanguageDetectorInstance>;
};

type TranslationMonitor = {
  addEventListener: (
    type: 'downloadprogress',
    listener: (event: { loaded: number }) => void,
  ) => void;
};

type TranslatorInstance = {
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
};

type TranslatorFactory = {
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: TranslationMonitor) => void;
  }) => Promise<TranslatorInstance>;
};

type TranslationGlobals = typeof globalThis & {
  LanguageDetector?: LanguageDetectorFactory;
  Translator?: TranslatorFactory;
};

const languages: TranslationLanguage[] = [
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'zh', label: 'Chinese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'vi', label: 'Vietnamese' },
];

const targetLanguageStorageKey = 'primal-post-translation-language';
const translationChunkLimit = 1_200;

const normalizeLanguage = (language: string | undefined): string => {
  const normalized = `${language || ''}`.trim().toLowerCase().split('-')[0];

  return languages.some(item => item.code === normalized) ? normalized : 'en';
};

const defaultTargetLanguage = (): string => {
  const saved = localStorage.getItem(targetLanguageStorageKey);

  return normalizeLanguage(saved || navigator.language);
};

const splitText = (text: string): string[] => {
  const normalized = text.trim();

  if (normalized.length <= translationChunkLimit) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > translationChunkLimit) {
    const candidate = remaining.slice(0, translationChunkLimit);
    const paragraphBoundary = candidate.lastIndexOf('\n');
    const sentenceBoundary = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('? '),
    );
    const whitespaceBoundary = candidate.lastIndexOf(' ');
    const boundary = paragraphBoundary > translationChunkLimit / 2
      ? paragraphBoundary + 1
      : sentenceBoundary > translationChunkLimit / 2
        ? sentenceBoundary + 1
        : whitespaceBoundary > translationChunkLimit / 2
          ? whitespaceBoundary + 1
          : translationChunkLimit;

    chunks.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
};

const detectSourceLanguage = async (
  text: string,
  globals: TranslationGlobals,
): Promise<string | undefined> => {
  if (!globals.LanguageDetector) {
    return undefined;
  }

  const detector = await globals.LanguageDetector.create();

  try {
    const results = await detector.detect(text.slice(0, 4_000));
    const bestResult = results
      .filter(result => result.confidence >= 0.2)
      .sort((a, b) => b.confidence - a.confidence)[0];

    return bestResult ? normalizeLanguage(bestResult.detectedLanguage) : undefined;
  } finally {
    detector.destroy?.();
  }
};

const translateInBrowser = async (
  text: string,
  targetLanguage: string,
  onProgress: (progress: number) => void,
): Promise<string | undefined> => {
  const globals = globalThis as TranslationGlobals;

  if (!globals.Translator) {
    return undefined;
  }

  const sourceLanguage = await detectSourceLanguage(text, globals);

  if (!sourceLanguage) {
    return undefined;
  }

  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const translator = await globals.Translator.create({
    sourceLanguage,
    targetLanguage,
    monitor: monitor => {
      monitor.addEventListener('downloadprogress', event => {
        onProgress(Math.max(0, Math.min(1, event.loaded)));
      });
    },
  });

  try {
    const translatedChunks: string[] = [];

    for (const chunk of splitText(text)) {
      translatedChunks.push(await translator.translate(chunk));
    }

    return translatedChunks.join('\n\n');
  } finally {
    translator.destroy?.();
  }
};

const externalTranslationUrl = (
  text: string,
  targetLanguage: string,
): string => {
  const url = new URL('https://translate.google.com/');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', targetLanguage);
  url.searchParams.set('text', text);
  url.searchParams.set('op', 'translate');

  return url.toString();
};

const PostTranslation: Component<{
  text: string;
}> = props => {
  const [state, setState] = createSignal<TranslationState>('idle');
  const [targetLanguage, setTargetLanguage] = createSignal(defaultTargetLanguage());
  const [translatedText, setTranslatedText] = createSignal('');
  const [progress, setProgress] = createSignal(0);
  const [errorMessage, setErrorMessage] = createSignal('');

  let requestId = 0;

  onCleanup(() => {
    requestId += 1;
  });

  const saveTargetLanguage = (language: string) => {
    const normalized = normalizeLanguage(language);

    setTargetLanguage(normalized);
    localStorage.setItem(targetLanguageStorageKey, normalized);
    setTranslatedText('');
    setState('idle');
    setErrorMessage('');
    setProgress(0);
  };

  const translate = async () => {
    const text = props.text.trim();

    if (text.length === 0 || state() === 'working') {
      return;
    }

    const currentRequest = ++requestId;

    setState('working');
    setTranslatedText('');
    setErrorMessage('');
    setProgress(0);

    try {
      const result = await translateInBrowser(
        text,
        targetLanguage(),
        value => currentRequest === requestId && setProgress(value),
      );

      if (currentRequest !== requestId) {
        return;
      }

      if (result !== undefined) {
        setTranslatedText(result);
        setProgress(1);
        setState('translated');
        return;
      }

      const externalWindow = window.open(
        externalTranslationUrl(text, targetLanguage()),
        '_blank',
        'noopener,noreferrer',
      );

      if (!externalWindow) {
        throw new Error('Allow pop-ups to open the translation.');
      }

      setState('external');
    } catch (error) {
      if (currentRequest !== requestId) {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'Translation failed.',
      );
      setState('error');
    }
  };

  const showOriginal = () => {
    requestId += 1;
    setTranslatedText('');
    setProgress(0);
    setErrorMessage('');
    setState('idle');
  };

  return (
    <section
      class={styles.translation}
      aria-label="Post translation"
      onClick={event => event.stopPropagation()}
    >
      <div class={styles.controls}>
        <button
          type="button"
          class={styles.translateButton}
          disabled={state() === 'working'}
          aria-busy={state() === 'working'}
          onClick={translate}
        >
          <Show when={state() !== 'working'} fallback="Translating…">
            Translate
          </Show>
        </button>

        <label class={styles.languageSelector}>
          <span class={styles.visuallyHidden}>Translation language</span>
          <select
            value={targetLanguage()}
            disabled={state() === 'working'}
            onChange={event => saveTargetLanguage(event.currentTarget.value)}
          >
            <For each={languages}>
              {language => (
                <option value={language.code}>{language.label}</option>
              )}
            </For>
          </select>
        </label>

        <Show when={state() === 'translated'}>
          <button
            type="button"
            class={styles.originalButton}
            onClick={showOriginal}
          >
            Show original
          </button>
        </Show>
      </div>

      <Show when={state() === 'working'}>
        <div class={styles.status} role="status">
          <span>Preparing private on-device translation</span>
          <Show when={progress() > 0}>
            <progress value={progress()} max="1" />
          </Show>
        </div>
      </Show>

      <Show when={state() === 'external'}>
        <div class={styles.status} role="status">
          Translation opened in a new tab because this browser does not support
          private on-device translation.
        </div>
      </Show>

      <Show when={state() === 'error'}>
        <div class={styles.error} role="alert">{errorMessage()}</div>
      </Show>

      <Show when={translatedText().length > 0}>
        <div class={styles.translatedText} lang={targetLanguage()}>
          {translatedText()}
        </div>
      </Show>
    </section>
  );
};

export default PostTranslation;