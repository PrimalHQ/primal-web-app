export const calculateStickyPosition = () => {
  const viewportHeight = document.documentElement.clientHeight;
  const documentHeight = document.documentElement.scrollHeight;

  const sidebar = document.getElementById('trending_section');
  const height = sidebar?.getBoundingClientRect().height;

  const wrapper = document.getElementById('trending_wrapper');

  if (wrapper && height && height > viewportHeight) {
    const topOffset = viewportHeight - height - 200;

    sidebar.style.top = `${topOffset}px`;
    wrapper.style.height = `${documentHeight}px`;
  }
};
