let debounceTimer: number = 0;

export const debounce = (callback: TimerHandler, time: number) => {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(callback, time);
}

export const isVisibleInContainer = (element: Element, container: Element) => {
  const { bottom, height, top } = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return top <= containerRect.top ? containerRect.top - top <= height : bottom - containerRect.bottom <= height;
};
