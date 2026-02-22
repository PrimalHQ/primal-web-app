import { Component, Show, createMemo, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { useCachedWoT, useExtension, getMyPubkey } from "../../contexts/WotContext";
import styles from "./WotBadge.module.scss";

// Color stops for the gradient (score -> color)
// 0: gray, 50: orange, 65: yellow, 70: green, 100: light blue
const colorStops = [
  { score: 0, color: { r: 107, g: 114, b: 128 } },   // Gray #6b7280
  { score: 50, color: { r: 245, g: 158, b: 11 } },   // Orange #f59e0b
  { score: 65, color: { r: 234, g: 179, b: 8 } },    // Yellow #eab308
  { score: 70, color: { r: 34, g: 197, b: 94 } },    // Green #22c55e
  { score: 100, color: { r: 56, g: 189, b: 248 } },  // Light blue #38bdf8
];

function interpolateColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));

  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (s >= colorStops[i].score && s <= colorStops[i + 1].score) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  const range = upperStop.score - lowerStop.score;
  const factor = range === 0 ? 0 : (s - lowerStop.score) / range;

  const r = Math.round(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * factor);
  const g = Math.round(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * factor);
  const b = Math.round(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

function getDarkerColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));

  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (s >= colorStops[i].score && s <= colorStops[i + 1].score) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  const range = upperStop.score - lowerStop.score;
  const factor = range === 0 ? 0 : (s - lowerStop.score) / range;

  const darken = 0.85;
  const r = Math.round((lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * factor) * darken);
  const g = Math.round((lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * factor) * darken);
  const b = Math.round((lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * factor) * darken);

  return `rgb(${r}, ${g}, ${b})`;
}

const WotBadge: Component<{
  pubkey: string;
}> = (props) => {
  const extension = useExtension();
  const { data, loading } = useCachedWoT(() => props.pubkey);

  let badgeRef: HTMLSpanElement | undefined;
  const [showTooltip, setShowTooltip] = createSignal(false);
  const [tooltipPos, setTooltipPos] = createSignal({ top: 0, left: 0 });

  const isCurrentUser = createMemo(() => {
    const myPubkey = getMyPubkey();
    return myPubkey && props.pubkey === myPubkey;
  });

  const score = () => {
    const d = data();
    if (!d || d.score <= 0) return 0;
    return Math.round(d.score * 100);
  };

  const badgeStyle = () => {
    const s = score();
    if (s <= 0) return {};

    const mainColor = interpolateColor(s);
    const darkColor = getDarkerColor(s);

    return {
      background: `linear-gradient(135deg, ${mainColor} 0%, ${darkColor} 100%)`,
      'box-shadow': `0 1px 2px ${mainColor}4D`,
    };
  };

  const getDisplayText = () => {
    const s = score();
    if (s <= 0) return '?';
    return s.toString();
  };

  const tooltipData = () => {
    const d = data();
    if (!d) return null;

    return {
      score: d.score > 0 ? Math.round(d.score * 100) : null,
      distance: d.distance,
      paths: d.paths,
      commonFollows: d.commonFollows.length,
    };
  };

  const shouldShow = () => {
    if (isCurrentUser()) return false;
    if (!extension.isConnected()) return false;
    if (loading()) return false;
    const d = data();
    return d !== null && d.score > 0;
  };

  const updateTooltipPosition = () => {
    if (!badgeRef) return;
    const rect = badgeRef.getBoundingClientRect();
    setTooltipPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  };

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <Show when={shouldShow()}>
      <span
        ref={badgeRef}
        class={`${styles.wotBadge} ${score() <= 0 ? styles.badgeUnknown : ''}`}
        style={badgeStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {getDisplayText()}
      </span>

      <Show when={showTooltip()}>
        <Portal>
          <div
            class={styles.tooltip}
            style={{
              top: `${tooltipPos().top}px`,
              left: `${tooltipPos().left}px`,
            }}
          >
            <div class={styles.tooltipContent}>
              <Show when={tooltipData()}>
                <div class={styles.tooltipTitle}>Web of Trust</div>
                <div class={styles.tooltipStats}>
                  <Show when={tooltipData()?.score}>
                    <div class={styles.tooltipRow}>
                      <span class={styles.tooltipLabel}>Trust</span>
                      <span class={styles.tooltipValue}>{tooltipData()?.score}%</span>
                    </div>
                  </Show>
                  <Show when={tooltipData()?.distance !== null}>
                    <div class={styles.tooltipRow}>
                      <span class={styles.tooltipLabel}>Distance</span>
                      <span class={styles.tooltipValue}>
                        {tooltipData()?.distance} hop{tooltipData()?.distance !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Show>
                  <Show when={tooltipData()?.paths && tooltipData()!.paths > 0}>
                    <div class={styles.tooltipRow}>
                      <span class={styles.tooltipLabel}>Paths</span>
                      <span class={styles.tooltipValue}>{tooltipData()?.paths}</span>
                    </div>
                  </Show>
                  <Show when={tooltipData()?.commonFollows && tooltipData()!.commonFollows > 0}>
                    <div class={styles.tooltipRow}>
                      <span class={styles.tooltipLabel}>Common follows</span>
                      <span class={styles.tooltipValue}>{tooltipData()?.commonFollows}</span>
                    </div>
                  </Show>
                </div>
              </Show>
              <Show when={!tooltipData()}>
                <div class={styles.tooltipEmpty}>Not in your network</div>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </Show>
  );
};

export default WotBadge;
