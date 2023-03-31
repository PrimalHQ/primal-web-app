

const rtf = new Intl.RelativeTimeFormat('en', { style: 'short' });

export const shortDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium'});

  return dtf.format(date);
};

export const date = (postTimestamp: number) => {
  const date = new Date(postTimestamp * 1000);
  const currentTimestamp = Math.floor((new Date()).getTime() / 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = week * 4;
  const year = month * 12;

  const diff = currentTimestamp - postTimestamp;

  if ( diff > year) {
    const years = Math.floor(diff / (12 * 4 * 7 * 24 * 60 * 60));
    return { date, label: `${years}y` };
  }

  if (diff > month) {
    const months = Math.floor(diff / (4 * 7 * 24 * 60 * 60));
    return { date, label: `${months}m` };
  }

  if (diff > week) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60));
    return { date, label: `${weeks}w` };
  }

  if (diff > day) {
    const days = Math.floor(diff / (24 * 60 * 60));
    return { date, label: `${days}d` };
  }

  if (diff > hour) {
    const hours = Math.floor(diff / (60 * 60));
    return { date, label: `${hours}h` };
  }

  if (diff > minute) {
    const minutes = Math.floor(diff / (60));
    return { date, label: `${minutes}min` };
  }

  return { date, label: `${diff}s` };
};
