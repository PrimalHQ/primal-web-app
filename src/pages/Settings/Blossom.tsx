import { Component, For, Show, createEffect, createSignal, on } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import {
  settings as t,
  placeholders as tPlaceholders,
  errors as tErrors,
  actions as tActions,
} from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import { useAccountContext } from '../../contexts/AccountContext';
import { logError } from '../../lib/logger';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { primalBlossom } from '../../constants';
import { useSettingsContext } from '../../contexts/SettingsContext';
import CheckBox from '../../components/Checkbox/CheckBox';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { createStore } from 'solid-js/store';
import { checkBlossomServer } from '../../utils';

const Blossom: Component = () => {

  const account = useAccountContext();
  const settings = useSettingsContext();
  const intl = useIntl();

  let switchSeverInput: HTMLInputElement | undefined;
  let addMirrorInput: HTMLInputElement | undefined;

  const [invalidServerUrl, setInvalidServerUrl] = createSignal(false);
  const [hasMirrors, setHasMirrors] = createSignal(false);
  const [confirmNoMirrors, setConfirmNoMirrors] = createSignal(false);

  const [serverAvailability, setServerAvailability] = createStore<Record<string, boolean>>({});

  createEffect(on(() => account?.blossomServers, (bServers) => {
    if (!bServers || hasMirrors()) return;

    const list = bServers.slice(1) || [];
    setHasMirrors(() => list.length > 0);
  }))

  createEffect(on(() => account?.blossomServers, (bServers) => {
    // Check server availability
    if (!bServers) return;

    checkServers(bServers);
  }))

  const checkServers = (servers: string[]) => {
    for (let i = 0; i < servers.length;i++) {
      const url = servers[i];
      checkBlossomServer(url).then(available => setServerAvailability(() => ({ [url]: available })));
    }
  }

  const onSwitchServerInput = () => {
    if (!switchSeverInput || switchSeverInput.value === '') {
      return;
    }

    try {
      const url = new URL(switchSeverInput.value);
      if (!url.origin.startsWith('https://')) {
        throw(new Error('must be a https'))
      }

      switchSeverInput.value = '';
      account?.actions.addBlossomServers(url.href);
      setInvalidServerUrl(false);
    } catch (e) {
      logError('invalid caching service input', e);
      setInvalidServerUrl(true);
    }
  }

  const onAddMirrorInput = () => {
      if (!addMirrorInput || addMirrorInput.value === '') {
        return;
      }

      try {
        const url = new URL(addMirrorInput.value);
        if (!url.origin.startsWith('https://')) {
          throw(new Error('must be a https'))
        }

        addMirrorInput.value = '';
        account?.actions.appendBlossomServers(url.href);
        setInvalidServerUrl(false);
      } catch (e) {
        logError('invalid caching service input', e);
        setInvalidServerUrl(true);
      }
    }

  const mirrorServers = () => {
    return account?.blossomServers.slice(1) || [];
  }

  const reommendedMirrors = () => {
    const activeMirrors = account?.blossomServers || [];

    const recomended =  (settings?.recomendedBlossomServers || []).filter(s => !activeMirrors.includes(s));

    checkServers(recomended);

    return recomended;
  };

  return (
    <>
      <PageTitle title={`${intl.formatMessage(t.blossom)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.blossom)}</div>
      </PageCaption>
      <div class={styles.settingsContent}>
        <div class={`${styles.bigCaption}`}>
          {intl.formatMessage(t.blossomPage.mediaServer)}
        </div>

        <div class={`${styles.label} ${styles.blossomMainServer}`}>
          <Show
            when={account?.blossomServers[0] || primalBlossom}
            fallback={<div class={styles.suspended}></div>}
          >
            <div class={styles.connected}></div>
          </Show>
          {account?.blossomServers[0] || primalBlossom}
        </div>

        <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
            {intl.formatMessage(t.blossomPage.switchServer)}
        </div>

        <div
          class={styles.relayInput}
        >
          <div class={styles.webIcon}></div>
          <input
            ref={switchSeverInput}
            type="text"
            placeholder={intl.formatMessage(tPlaceholders.blossomServerUrl)}
            onChange={() => onSwitchServerInput()}
          />
          <button onClick={() => onSwitchServerInput()}>
            <div class={styles.connectIcon}></div>
          </button>
        </div>

        <Show when={invalidServerUrl()}>
          <div class={styles.invalidInput}>
            {intl.formatMessage(tErrors.invalidRelayUrl)}
          </div>
        </Show>

        <div style="height: 20px"></div>

        <ButtonLink
          onClick={() => account?.actions.addBlossomServers(primalBlossom)}
        >
          {intl.formatMessage(tActions.restoreBlossomServer)}
        </ButtonLink>

      </div>

      <div class={styles.settingsContentBorderless}>
        <div class={`${styles.bigCaption}`}>
          {intl.formatMessage(t.blossomPage.mediaMirrors)}
        </div>

        <CheckBox
          id={'toggleMirror'}
          onChange={() => {
            if (mirrorServers().length > 0) {
              setConfirmNoMirrors(true);
              return;
            }

            setHasMirrors(v => !v);
          }}
          checked={hasMirrors()}
          label="Enable media mirrors"
        />

        <div class={styles.moderationDescription}>
          {intl.formatMessage(t.blossomPage.mediaMirrorsDescription)}
        </div>

        <Show when={hasMirrors()}>
          <For each={mirrorServers()}>
            {mirror => (
              <div class={styles.mirrorServer}>
                <div class={styles.label}>
                  <Show
                    when={serverAvailability[mirror]}
                    fallback={<div class={styles.suspended}></div>}
                  >
                    <div class={styles.connected}></div>
                  </Show>
                  {mirror}
                </div>
                <div class={styles.actions}>
                  <ButtonSecondary
                    onClick={() => account?.actions.addBlossomServers(mirror)}
                    shrink={true}
                  >
                    set as media server
                  </ButtonSecondary>
                  <ButtonSecondary
                    onClick={() => account?.actions.removeBlossomServers(mirror)}
                    shrink={true}
                  >
                    remove
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </For>

          <div class={`${styles.settingsCaption} ${styles.secondCaption}`}>
              {intl.formatMessage(t.blossomPage.addMirror)}
          </div>

          <div
            class={styles.relayInput}
          >
            <div class={styles.webIcon}></div>
            <input
              ref={addMirrorInput}
              type="text"
              placeholder={intl.formatMessage(tPlaceholders.blossomServerUrl)}
              onChange={() => onAddMirrorInput()}
            />
            <button onClick={() => onAddMirrorInput()}>
              <div class={styles.connectIcon}></div>
            </button>
          </div>

          <div class={`${styles.settingsCaptionDarker} ${styles.secondCaption}`}>
            {intl.formatMessage(t.blossomPage.suggestedMirrors)}
          </div>

          <For each={reommendedMirrors()}>
            {mirror => (
              <div class={styles.mirrorServer}>
                <div class={styles.label}>
                  <Show
                    when={serverAvailability[mirror]}
                    fallback={<div class={styles.suspended}></div>}
                  >
                    <div class={styles.connected}></div>
                  </Show>
                  {mirror}
                </div>
                <div class={styles.actions}>
                  <ButtonSecondary
                    onClick={() => account?.actions.appendBlossomServers(mirror)}
                    shrink={true}
                  >
                    add this media mirror server
                  </ButtonSecondary>
                </div>
              </div>
            )}
          </For>
        </Show>

        <ConfirmModal
          open={confirmNoMirrors()}
          title="Remove Media Mirrors?"
          description="Are you sure? This will remove your mirror media servers."
          confirmLabel="Yes"
          abortLabel="No"
          onConfirm={() => {
            account?.actions.removeBlossomMirrors(() => {
              setHasMirrors(false);
            });
            setConfirmNoMirrors(false);
          }}
          onAbort={() => setConfirmNoMirrors(false)}
        />
      </div>
    </>
  )
}

export default Blossom;
