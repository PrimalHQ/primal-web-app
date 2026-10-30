import { Component, createSignal, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useIntl } from '@cookbook/solid-intl';
import styles from './Settings.module.scss';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import { hasOnDevice, loadRemote, normalizeUrl, saveRemote } from '../../lib/noteTranslation';

/**
 * Note translation settings. On-device translation (Chrome/Edge) needs no
 * setup; the optional service below is used by other browsers such as Safari
 * and as a fallback for language pairs the device cannot handle.
 */
const Translation: Component = () => {
  const intl = useIntl();
  const initial = loadRemote();
  const [url, setUrl] = createSignal(initial.url);
  const [apiKey, setApiKey] = createSignal(initial.apiKey);
  const [saved, setSaved] = createSignal(false);

  const valid = () => url().trim() === '' || /^https:\/\/[^\s]+$/i.test(normalizeUrl(url()));

  const save = (e: Event) => {
    e.preventDefault();
    if (!valid()) return;
    saveRemote({ url: url(), apiKey: apiKey().trim() });
    setUrl(loadRemote().url);
    setSaved(true);
  };

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.translation.title)} ${intl.formatMessage(t.title)}`} />
      <PageCaption>
        <A href='/settings'>{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.translation.title)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>
        <div class={styles.moderationDescription}>
          {intl.formatMessage(hasOnDevice() ? t.translation.onDevice : t.translation.noOnDevice)}
        </div>
        <form onSubmit={save} style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          <label>
            <div>{intl.formatMessage(t.translation.url)}</div>
            <input type="url" value={url()} placeholder="https://translate.example.com"
              onInput={(e) => { setUrl(e.currentTarget.value); setSaved(false); }} style="width: 100%;" />
          </label>
          <label>
            <div>{intl.formatMessage(t.translation.apiKey)}</div>
            <input type="password" autocomplete="off" value={apiKey()}
              onInput={(e) => { setApiKey(e.currentTarget.value); setSaved(false); }} style="width: 100%;" />
          </label>
          <div class={styles.moderationDescription}>{intl.formatMessage(t.translation.privacy)}</div>
          <Show when={!valid()}>
            <div>{intl.formatMessage(t.translation.invalidUrl)}</div>
          </Show>
          <div>
            <button type="submit" disabled={!valid()}>{intl.formatMessage(t.translation.save)}</button>
            <Show when={saved()}>&nbsp;{intl.formatMessage(t.translation.saved)}</Show>
          </div>
        </form>
      </div>
    </>
  );
};

export default Translation;
