export const logInfo = (...rest: any[]) => {
  const isDev = localStorage.getItem('devMode') === 'true';

  if (!isDev) return;

  console.log(...rest);
};

export const logWarning = (...rest: any[]) => {
  const isDev = localStorage.getItem('devMode') === 'true';

  if (!isDev) return;

  console.warn(...rest);
};

export const logError = (...rest: any[]) => {
  const isDev = localStorage.getItem('devMode') === 'true';

  if (!isDev) return;

  console.error(...rest);
};
