

const rtf = new Intl.RelativeTimeFormat('en', { style: 'long' });

export const date = (postTimestamp: number) => {
  const date = new Date(postTimestamp * 1000);
  const currentTimestamp = Math.floor((new Date()).getTime() / 1000);

  const seconds = 1000;
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = week * 4;
  const year = month * 12;

  const diff = currentTimestamp - postTimestamp;

  if ( diff > year) {
    const years = Math.floor(diff / (12 * 4 * 7 * 24 * 60 * 60));
    return { date, label: rtf.format(-years, 'year')};
  }

  if (diff > month) {
    const months = Math.floor(diff / (4 * 7 * 24 * 60 * 60));
    return { date, label: rtf.format(-months, 'month')};
  }

  if (diff > week) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60));
    return { date, label: rtf.format(-weeks, 'week')};
  }

  if (diff > day) {
    const days = Math.floor(diff / (24 * 60 * 60));
    return { date, label: rtf.format(-days, 'hour')};
  }

  if (diff > hour) {
    const hours = Math.floor(diff / (60 * 60));
    return { date, label: rtf.format(-hours, 'hour')};
  }

  if (diff > minute) {
    const minutes = Math.floor(diff / (60));
    return { date, label: rtf.format(-minutes, 'minute') };
  }

  return { date, label: rtf.format(-diff, 'second')};
};
