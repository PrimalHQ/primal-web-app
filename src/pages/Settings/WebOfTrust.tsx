import { Component, For, Show, Switch, Match } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import PageTitle from '../../components/PageTitle/PageTitle';
import { useExtension } from '../../contexts/WotContext';

// Same color stops as WotBadge
const colorStops = [
  { score: 0, label: '0', color: '#6b7280' },    // Gray
  { score: 50, label: '50', color: '#f59e0b' },  // Orange
  { score: 65, label: '65', color: '#eab308' },  // Yellow
  { score: 70, label: '70', color: '#22c55e' },  // Green
  { score: 100, label: '100', color: '#38bdf8' }, // Light blue
];

const WebOfTrust: Component = () => {
  const intl = useIntl();
  const extension = useExtension();

  const extensionUrl = 'https://chromewebstore.google.com/detail/nostr-wot/placeholder';

  // Generate CSS gradient from color stops
  const gradientStyle = () => {
    const stops = colorStops.map(stop => `${stop.color} ${stop.score}%`).join(', ');
    return `linear-gradient(to right, ${stops})`;
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.webOfTrust.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.webOfTrust.title)}</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.settingsCaption}>
          {intl.formatMessage(t.webOfTrust.description)}
        </div>

        <div class={styles.settingsContentSection}>
          <div class={styles.settingsContentSectionTitle}>
            {intl.formatMessage(t.webOfTrust.extensionStatus)}
          </div>

          <div class={styles.wotStatus}>
            <Switch>
              <Match when={extension.isChecking()}>
                <span class={styles.wotStatusChecking}>
                  {intl.formatMessage(t.webOfTrust.checking)}
                </span>
              </Match>
              <Match when={extension.isConnected()}>
                <span class={styles.wotStatusConnected}>
                  {intl.formatMessage(t.webOfTrust.connected)}
                </span>
              </Match>
              <Match when={!extension.isConnected()}>
                <span class={styles.wotStatusNotAvailable}>
                  {intl.formatMessage(t.webOfTrust.notAvailable)}
                </span>
              </Match>
            </Switch>
          </div>

          <Show when={!extension.isConnected() && !extension.isChecking()}>
            <div class={styles.wotInstallPrompt}>
              <p>
                To use Web of Trust features, install the nostr-wot browser extension.
                The extension builds a local copy of your follow graph for fast, private trust calculations.
              </p>
              <a
                href={extensionUrl}
                target="_blank"
                rel="noopener noreferrer"
                class={styles.wotInstallButton}
              >
                {intl.formatMessage(t.webOfTrust.installExtension)}
              </a>
            </div>
          </Show>

          <Show when={extension.isConnected()}>
            <div class={styles.wotInfo}>
              <p>
                Web of Trust badges are visible next to user names throughout the app.
                The badge color changes smoothly based on trust score.
              </p>

              <div class={styles.wotGradientSection}>
                <div class={styles.wotGradientLabel}>Trust Score Scale</div>
                <div class={styles.wotGradientBar} style={{ background: gradientStyle() }}></div>
                <div class={styles.wotGradientMarkers}>
                  <For each={colorStops}>
                    {(stop) => (
                      <div class={styles.wotGradientMarker} style={{ left: `${stop.score}%` }}>
                        <div class={styles.wotMarkerTick}></div>
                        <div class={styles.wotMarkerLabel}>{stop.label}</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class={styles.wotLegend}>
                <div class={styles.wotLegendItem}>
                  <span class={styles.wotBadgeSample} style={{ background: '#6b7280' }}>15</span>
                  <span>Low trust - Distant connections</span>
                </div>
                <div class={styles.wotLegendItem}>
                  <span class={styles.wotBadgeSample} style={{ background: '#f59e0b' }}>50</span>
                  <span>Moderate trust - Extended network</span>
                </div>
                <div class={styles.wotLegendItem}>
                  <span class={styles.wotBadgeSample} style={{ background: '#eab308' }}>65</span>
                  <span>Good trust - Friends of friends</span>
                </div>
                <div class={styles.wotLegendItem}>
                  <span class={styles.wotBadgeSample} style={{ background: '#22c55e' }}>75</span>
                  <span>High trust - Closer connections</span>
                </div>
                <div class={styles.wotLegendItem}>
                  <span class={styles.wotBadgeSample} style={{ background: '#38bdf8' }}>100</span>
                  <span>Maximum trust - Direct follows, or followed by a lot of direct follows</span>
                </div>
              </div>

              <p class={styles.wotHint}>
                Hover over any badge to see detailed info: trust %, hops, paths, and common follows.
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default WebOfTrust;
