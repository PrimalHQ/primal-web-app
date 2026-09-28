import { Component, createSignal } from 'solid-js';
import styles from './Settings.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import { A } from '@solidjs/router';
import CheckBox from '../../components/Checkbox/CheckBox';
import {
  NoteTranslationPrefs,
  readNoteTranslationPrefs,
  writeNoteTranslationPrefs,
} from '../../lib/translation';

const Translation: Component = () => {
  const intl = useIntl();
  const [prefs, setPrefs] = createSignal<NoteTranslationPrefs>(readNoteTranslationPrefs());

  const update = (patch: Partial<NoteTranslationPrefs>) => {
    setPrefs(writeNoteTranslationPrefs(patch));
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`} />
      <PageCaption>
        <A href="/settings">{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>{intl.formatMessage(t.translation.caption)}</div>

        <CheckBox checked={prefs().enabled} onChange={() => update({ enabled: !prefs().enabled })}>
          <div>Enable note translation</div>
        </CheckBox>

        <div style={{ 'margin-top': '16px' }}>
          <label>
            Provider
            <select
              value={prefs().provider}
              onChange={(e) => update({ provider: e.currentTarget.value as any })}
              style={{ display: 'block', 'margin-top': '6px', width: '100%' }}
            >
              <option value="libretranslate">LibreTranslate (user endpoint)</option>
              <option value="google">Google Translate API</option>
              <option value="deepl">DeepL API</option>
            </select>
          </label>
        </div>

        <div style={{ 'margin-top': '16px' }}>
          <label>
            Target language (ISO code)
            <input
              value={prefs().targetLang}
              onInput={(e) => update({ targetLang: e.currentTarget.value })}
              style={{ display: 'block', 'margin-top': '6px', width: '100%' }}
              placeholder="en"
            />
          </label>
        </div>

        <div style={{ 'margin-top': '16px' }}>
          <label>
            LibreTranslate base URL
            <input
              value={prefs().libreBaseUrl}
              onInput={(e) => update({ libreBaseUrl: e.currentTarget.value })}
              style={{ display: 'block', 'margin-top': '6px', width: '100%' }}
              placeholder="https://libretranslate.com"
            />
          </label>
        </div>

        <div style={{ 'margin-top': '16px' }}>
          <label>
            API key (optional / required for Google &amp; DeepL)
            <input
              type="password"
              value={prefs().apiKey}
              onInput={(e) => update({ apiKey: e.currentTarget.value })}
              style={{ display: 'block', 'margin-top': '6px', width: '100%' }}
              autocomplete="off"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Translation;
