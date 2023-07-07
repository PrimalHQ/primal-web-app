export const scrollWindowTo = (top: number = 0, smooth = false) => {
  const behavior = smooth ? 'smooth' : 'instant';
  setTimeout(() => {
    window.scrollTo({
      top,
      left: 0,
      // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
      behavior,
    });
  }, 0);
};
