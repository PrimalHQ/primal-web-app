

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
  const month = day * 30;
  const year = month * 12;



  const diff = currentTimestamp - postTimestamp;

  if ( diff > year) {
    const years = Math.floor(diff / year);
    return { date, label: rtf.format(years, 'years') };
  }

  if (diff > month) {
    const months = Math.floor(diff / month);
    return { date, label: rtf.format(months, 'months') };
  }

  if (diff > week) {
    const weeks = Math.floor(diff / week);
    return { date, label: rtf.format(weeks, 'weeks') };
  }

  if (diff > day) {
    const days = Math.floor(diff / day);
    return { date, label: rtf.format(days, 'days') };
  }

  if (diff > hour) {
    const hours = Math.floor(diff / hour);
    return { date, label: rtf.format(hours, 'hours') };
  }

  if (diff > minute) {
    const minutes = Math.floor(diff / minute);
    return { date, label: rtf.format(minutes, 'minutes') };
  }

  return { date, label: `${diff}s` };
};
