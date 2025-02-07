export const shortDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium'});

  return dtf.format(date);
};

export const longDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short'});

  return dtf.format(date);
};

export const veryLongDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'full', timeStyle: 'short'});

  return dtf.format(date);
};

export const date = (postTimestamp: number, style: Intl.RelativeTimeFormatStyle = 'short', since?: number) => {
  const today = since ?? Math.floor((new Date()).getTime() / 1000);
  const date = new Date(postTimestamp * 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = month * 12;

  const rtf = new Intl.RelativeTimeFormat('hu', { style });

  const diff = today - postTimestamp;

  if ( diff > year) {
    const years = Math.floor(diff / year);
    return { date, label: rtf.format(-years, 'years').replace('évvel ezelőtt', 'éve') };
  }

  if (diff > month) {
    const months = Math.floor(diff / month);
    return { date, label: rtf.format(-months, 'months').replace('hónappal ezelőtt', 'hónapja') };
  }

  if (diff > week) {
    const weeks = Math.floor(diff / week);
    return { date, label: rtf.format(-weeks, 'weeks').replace('héttel ezelőtt', 'hete') };
  }

  if (diff > day) {
    const days = Math.floor(diff / day);
    return { date, label: rtf.format(-days, 'days').replace('nappal ezelőtt', 'napja') };
  }

  if (diff > hour) {
    const hours = Math.floor(diff / hour);
    return { date, label: rtf.format(-hours, 'hours').replace('órával ezelőtt', 'órája') };
  }

  if (diff > minute) {
    const minutes = Math.floor(diff / minute);
    return { date, label: rtf.format(-minutes, 'minutes').replace('perccel ezelőtt', 'perce') };
  }

  return { date, label: `${diff} mp` };
};

export const dateFuture = (postTimestamp: number, style: Intl.RelativeTimeFormatStyle = 'short', since?: number) => {
  const today = since ?? Math.floor((new Date()).getTime() / 1000);
  const date = new Date(postTimestamp * 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = month * 12;

  const rtf = new Intl.RelativeTimeFormat('hu', { style });

  const diff = postTimestamp - today;

  if ( diff > year) {
    const years = Math.floor(diff / year);
    return { date, label: rtf.format(-years, 'years').replace(' ago', '') };
  }

  if (diff > month) {
    const months = Math.floor(diff / month);
    return { date, label: rtf.format(-months, 'months').replace(' ago', '') };
  }

  if (diff > week) {
    const weeks = Math.floor(diff / week);
    return { date, label: rtf.format(-weeks, 'weeks').replace(' ago', '') };
  }

  if (diff > day) {
    const days = Math.floor(diff / day);
    return { date, label: rtf.format(-days, 'days').replace(' ago', '') };
  }

  if (diff > hour) {
    const hours = Math.floor(diff / hour);
    return { date, label: rtf.format(-hours, 'hours').replace(' ago', '') };
  }

  if (diff > minute) {
    const minutes = Math.floor(diff / minute);
    return { date, label: rtf.format(-minutes, 'minutes').replace(' ago', '') };
  }

  return { date, label: `${diff} mp` };
};
