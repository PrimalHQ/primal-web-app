import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import { Component, For, Show, createSignal, onMount } from 'solid-js';
import CheckBox from '../../components/Checkbox/CheckBox';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import {
  NOTE_TRANSLATE_LANGUAGES,
  NoteTranslatePrefs,
  NoteTranslateProvider,
  onDeviceTranslatorAvailable,
  readNoteTranslatePrefs,
  writeNoteTranslatePrefs,
} from '../../lib/noteTranslateSettings';
import { settings as t } from '../../translations';
import styles from './Settings.module.scss';

const NoteTranslation: Component = () => {
  const intl = useIntl();
  const [prefs, setPrefs] = createSignal<NoteTranslatePrefs>(readNoteTranslatePrefs());
  const [deviceReady, setDeviceReady] = createSignal(false);

  const save = (patch: Partial<NoteTranslatePrefs>) => {
    setPrefs(writeNoteTranslatePrefs(patch));
  };

  onMount(() => {
    setPrefs(readNoteTranslatePrefs());
    setDeviceReady(onDeviceTranslatorAvailable());
  });

  const provider = () => prefs().provider;

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.noteTranslate.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href="/settings">{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.noteTranslate.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.noteTranslate.privacy)}
        </div>

        <div style="margin-top: 20px;">
          <CheckBox
            checked={prefs().enabled}
            onChange={(checked: boolean) => save({ enabled: checked })}
          >
            <div class={styles.appearanceCheckLabel}>
              {intl.formatMessage(t.noteTranslate.enable)}
            </div>
          </CheckBox>
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.noteTranslate.language)}
        </div>
        <div class={styles.relayInput}>
          <select
            class={styles.noteTranslateSelect}
            value={prefs().targetLanguage}
            onChange={(event) => save({ targetLanguage: event.currentTarget.value })}
          >
            <For each={NOTE_TRANSLATE_LANGUAGES}>
              {(lang) => <option value={lang.code}>{lang.label}</option>}
            </For>
          </select>
        </div>
        <div class={styles.settingsDescription}>
          {intl.formatMessage(t.noteTranslate.languageHelp)}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
          {intl.formatMessage(t.noteTranslate.provider)}
        </div>

        <div class={styles.noteTranslateProviders}>
          <For each={[
            { id: 'on_device' as NoteTranslateProvider, label: intl.formatMessage(t.noteTranslate.providerOnDevice) },
            { id: 'libretranslate' as NoteTranslateProvider, label: intl.formatMessage(t.noteTranslate.providerLibre) },
            { id: 'deepl' as NoteTranslateProvider, label: intl.formatMessage(t.noteTranslate.providerDeepL) },
            { id: 'google' as NoteTranslateProvider, label: intl.formatMessage(t.noteTranslate.providerGoogle) },
          ]}>
            {(option) => (
              <label class={styles.noteTranslateProvider}>
                <input
                  type="radio"
                  name="note-translate-provider"
                  checked={provider() === option.id}
                  onChange={() => save({ provider: option.id })}
                />
                <span>{option.label}</span>
              </label>
            )}
          </For>
        </div>

        <Show when={provider() === 'on_device'}>
          <div class={styles.settingsDescription}>
            {deviceReady()
              ? intl.formatMessage(t.noteTranslate.onDeviceReady)
              : intl.formatMessage(t.noteTranslate.onDeviceMissing)}
          </div>
        </Show>

        <Show when={provider() === 'libretranslate'}>
          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.noteTranslate.libreUrl)}
          </div>
          <div class={styles.relayInput}>
            <input
              class="noIcon"
              type="url"
              placeholder={intl.formatMessage(t.noteTranslate.libreUrlPlaceholder)}
              value={prefs().libreTranslateUrl}
              onInput={(event) => save({ libreTranslateUrl: event.currentTarget.value })}
            />
          </div>
          <div class={styles.settingsDescription}>
            {intl.formatMessage(t.noteTranslate.libreUrlHelp)}
          </div>
          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.noteTranslate.libreKey)}
          </div>
          <div class={styles.relayInput}>
            <input
              class="noIcon"
              type="password"
              autocomplete="off"
              placeholder={intl.formatMessage(t.noteTranslate.optionalKey)}
              value={prefs().libreTranslateKey}
              onInput={(event) => save({ libreTranslateKey: event.currentTarget.value })}
            />
          </div>
        </Show>

        <Show when={provider() === 'deepl'}>
          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.noteTranslate.deeplKey)}
          </div>
          <div class={styles.relayInput}>
            <input
              class="noIcon"
              type="password"
              autocomplete="off"
              placeholder={intl.formatMessage(t.noteTranslate.keyPlaceholder)}
              value={prefs().deeplKey}
              onInput={(event) => save({ deeplKey: event.currentTarget.value })}
            />
          </div>
          <div class={styles.settingsDescription}>
            {intl.formatMessage(t.noteTranslate.deeplHelp)}
          </div>
        </Show>

        <Show when={provider() === 'google'}>
          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.noteTranslate.googleKey)}
          </div>
          <div class={styles.relayInput}>
            <input
              class="noIcon"
              type="password"
              autocomplete="off"
              placeholder={intl.formatMessage(t.noteTranslate.keyPlaceholder)}
              value={prefs().googleKey}
              onInput={(event) => save({ googleKey: event.currentTarget.value })}
            />
          </div>
          <div class={styles.settingsDescription}>
            {intl.formatMessage(t.noteTranslate.googleHelp)}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default NoteTranslation;
